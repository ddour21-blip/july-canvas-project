# S7-2B — public_readonly 공유 전략

> 비로그인 사용자가 `public_readonly` share 링크로 프로젝트/문서/프로토타입/개발 전달 패키지를
> **읽기 전용**으로 볼 수 있게 한다. 단, **Firestore의 public read를 직접 열지 않고**
> 서버가 Admin 권한으로 매개 읽기(server-mediated read)하는 구조로 구현한다.
>
> `public_review`/comment(비로그인 코멘트)는 본 단계 범위가 아니며 **S7-2C로 분리**한다.

## 1. 배경 / 현재 구조 (조사 결과)

- 라우팅: App Router (next 16.2.6). 서버 라우트 동작 확인됨 (`app/api/generate/activation-draft/route.ts`, `runtime='nodejs'`).
- Firebase: 지금까지 **클라이언트 SDK(`firebase`)만** 사용. 모든 read 규칙이 `signedIn()`을 요구.
- `shares` 컬렉션(S7-2A): `shareId`(추측 불가 토큰), `accessType`(`internal`/`public_readonly`/`public_review`),
  `isEnabled`, `expiresAt`, `targetType`(`project`/`document`/`screen`/`handoff_package`), `targetId`, `projectId`, `createdBy`.
- `handoff_package`는 **Firestore에 저장되지 않는다.** `lib/handoffPackage.ts`의 `buildHandoffPackage(project, documents, opts)`가
  project + documents를 즉석 조립하는 순수 함수 → 서버에서 그대로 재사용 가능.
- 데이터 경로: `artifacts/{appId}/public/data/{collection}/{docId}`.

## 2. 핵심 설계 결정

**서버 매개 읽기 = `firebase-admin`(서비스 계정) Admin 권한 읽기.**

- Admin SDK는 Rules를 우회 → `firestore.rules`는 `signedIn()` 그대로 유지(**public read 미개방**).
- 클라이언트 SDK를 서버에서 인증 없이 쓰면 Rules가 거부 → 불가. 따라서 Admin SDK가 유일하게 깨끗한 경로.
- 자격증명: 서버 전용 env **개별 3종**(`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`).
  `FIREBASE_PRIVATE_KEY`는 `\n` escape를 코드에서 실제 줄바꿈으로 복원. `.env.local`만 사용(커밋 금지).

## 3. 단계 분할

| 단계 | 범위 | 상태 |
|------|------|------|
| **S7-2B-1 인프라** | `firebase-admin` 의존성, `lib/firebaseAdmin.ts`(서버 전용 lazy init, env 누락 시 명확한 에러), `.env.local.example` 변수명, 본 문서 | ✅ 완료 |
| **S7-2B-2 API** | `app/api/share/[shareId]/route.ts` (GET): shareId 검증 → `isEnabled`/`expiresAt`/`accessType==='public_readonly'` 확인 → targetType별 sanitize 후 최소 데이터 반환. `lib/publicShareSanitizer.ts`(화이트리스트 sanitizer). **public viewer UI / ShareModal public_readonly 생성은 미포함.** | ✅ 완료 |
| **S7-2B-3 공개 뷰** | `app/share/[shareId]/page.tsx`(서버 컴포넌트, noindex) + `components/share/ShareViewer.tsx`(`'use client'`) — `/api/share/[shareId]`만 호출(Firebase client 미접근), targetType별 read-only 렌더(project/document/screen/handoff 4탭) + 상태별 안내(loading/400/403×3/404/500). **screen.code는 `<pre>` 텍스트로만 표시(dangerouslySetInnerHTML/iframe 미사용 → 스크립트 실행 불가).** | ✅ 완료 |
| S7-2B-4 생성 UI | `ShareModal`에 `public_readonly` 옵션 + 공개 URL(`/share/{shareId}`) 표시 | 예정 |
| **S7-2C** | `public_review` + 비로그인 코멘트 | 별도 |

## 4. 반환 데이터 화이트리스트 (S7-2B-2에서 적용 예정)

서버는 아래 필드만 sanitize 후 반환. **비노출 필드**: `ownerId`, `roleByUid`, `memberUids`,
`createdBy`, share 내부 메타, document/screen 내 uid 계열.

- `project`: `name`, `description`, `status`, `activation` 안전 필드(intent/problem/customer/value/mvpScope/laterScope/differentiator)
- `document`: `title`, `type`, `content`, `version`, `status`, `updatedAt`
- `screen`: `name`, `code` (annotations 제외 — 내부 코멘트 포함)
- `handoff_package`: 서버에서 project+documents 로드 → `buildHandoffPackage` 호출 결과 `files[]` + `readiness`

## 5. 가드레일 (절대 금지)

- Firestore의 public read를 직접 열지 않는다(Rules 변경은 별도 보고 후).
- `shares` 컬렉션 구조 변경 금지.
- 기존 B 라인 흐름 / PRD 조립 로직 / CanvasApp / ShareModal 회귀 금지.
- 서비스 계정 키 값·`.env.local` 커밋 금지. 자격증명 env에 `NEXT_PUBLIC_` 접두사 금지.
- 비로그인 직접 Firestore 접근 금지(반드시 서버 매개).

## 5-1. S7-2B-2 구현 메모 (완료)

- 신규 `app/api/share/[shareId]/route.ts` (GET, `runtime='nodejs'`, `dynamic='force-dynamic'`).
- shareId 검증: `^sh[A-Za-z0-9]{22}$` (S7-2A 생성 규칙과 일치).
- 처리 순서: env 설정 확인 → shareId 형식 → shares 조회 → 존재 → `isEnabled` → `expiresAt`(null=무기한) → `accessType==='public_readonly'` → targetType별 조회/sanitize.
- 실패 status: 400(형식) / 404(없음·타깃없음) / 403(비활성·만료·public_readonly 아님) / 500(env 미설정·내부오류).
  - 에러 본문은 코드만(`{ok:false,error:"..."}`). private key/env 이름 상세·스택은 노출하지 않음.
- `handoff_package`: Firestore 미저장 → 서버에서 project+documents+prototypeLock 로드 후 `buildHandoffPackage`(순수 함수) 재조립. 브라우저 전용 API 없음 → 별도 server helper 분리 불필요.
- sanitizer(`lib/publicShareSanitizer.ts`): 출력은 화이트리스트로 새 객체 생성. 제거 필드 = `ownerId`/`memberUids`/`roleByUid`/`organizationId`/`createdBy`/`lockedBy`/내부 식별·권한 정보.

> ⚠️ **screen.code 스크립트 실행 위험**: API는 `screen.code`(임의 마크업/스크립트 포함 가능)를 반환할 수 있다.
> 후속 public viewer(S7-2B-3)에서 반드시 `iframe sandbox` 등 스크립트 실행 격리 정책을 별도 검토·적용해야 한다.
> 비로그인 사용자에게 신뢰되지 않은 코드를 같은 오리진에서 실행시키면 안 된다.

## 6. S7-2B-1 완료 기준

- `lib/firebaseAdmin.ts` lazy init + env 누락 시 명확한 에러.
- `.env.local.example`에 변수명만 추가(값 없음).
- Rules 변경 없음 / public share API 미구현.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` 통과(키 없이도).
- 라이브 검증은 `.env.local`에 서비스 계정 키 설정 후 진행(후속 단계).
