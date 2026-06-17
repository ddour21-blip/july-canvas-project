# 체크포인트 — S7-2 공유 시리즈(2A~2D) + 로컬 QA 안정화

> 최종 갱신: 2026-06-17. S7-2 공유 기능 전체와 QA 안정화 결과를 한 곳에 고정한다.
> 다음 큰 기능 착수 전 기준점.

## 1. S7-2A — internal share (로그인 멤버 공유 링크) ✅

- `shares` 컬렉션 + 추측 불가 `shareId`('sh' + 22 base62, `_` 없음).
- ShareModal에서 링크 생성/비활성·재활성/만료(없음·7일·30일)/복사.
- `#share_{shareId}` → 활성/만료 확인 후 **내부 딥링크로 resolve**(로그인 멤버).
- `lib/shares.ts`, `lib/shareLinks.ts`. owner/editor만 생성·관리, viewer는 미노출.
- 커밋: `c7953a2`.

## 2. S7-2B — public_readonly (비로그인 읽기 전용 공유) ✅

| 단계 | 내용 | 커밋 |
|------|------|------|
| **B-1 인프라** | `firebase-admin` + `lib/firebaseAdmin.ts`(서버 lazy init, 서비스 계정 env 3종, `\n` 복원, `adminCol()`). Rules 무변경. | `7c2ad32` |
| **B-2 API + sanitizer** | `GET /api/share/[shareId]`: shareId 형식 → `isEnabled` → `expiresAt` → `public_readonly` 검증 → targetType별 sanitize. `lib/publicShareSanitizer.ts`. | `2d686d3` |
| **B-3 public viewer** | `app/share/[shareId]/page.tsx`(noindex) + `components/share/ShareViewer.tsx` — `/api/share`만 호출, project/document/screen/handoff 4종 read-only 렌더 + 상태별 안내. | `07a0f89` |
| **B-4 생성 UI** | ShareModal 내부/외부 토글 + 안내. public=`/share/{shareId}`, internal=`#share_`(배지 구분). owner/editor만. | `54c855f` |

- 라이브 검증: 4종 viewer 정상, internal/disabled/expired/404/400 차단, 민감 필드 누출 0, screen.code 미실행.

## 3. S7-2C — 비로그인 댓글 (public_review) ✅

- `publicReviews` 컬렉션(**서버 전용, Rules 미등록 = 클라 기본 거부 + admin만**). 필드: shareId/projectId/targetType/targetId?/authorName/content/status/createdAt/updatedAt. **uid·IP 미저장**.
- ⚠️ **상태 정책 변경(S7-2E)**: S7-2C는 초기 `status:'visible'` 즉시 공개였으나, **S7-2E에서 신규 댓글 기본값을 `pending`(검토 대기)으로 변경**. public viewer에는 `visible`만 노출되며, owner/editor 승인 후 공개된다. viewer 등록 성공 안내도 "댓글이 제출되었습니다. 검토 후 공개될 수 있습니다."로 변경됨.
- `GET/POST /api/share/[shareId]/reviews`(firebase-admin): `resolveActivePublicShare`로 share 활성·public_readonly 검증. content 1~1000자, authorName ≤40자(기본 '익명'), 빈/초과 차단.
- ShareViewer에 댓글 영역(이름 선택/내용/등록/목록). **React 텍스트 렌더만**(dangerouslySetInnerHTML 금지).
- `lib/shareServer.ts`(공유 검증 헬퍼, B-2 라우트는 회귀 방지 위해 미변경).
- 라이브 검증: 4종 타깃 등록, internal/disabled/expired 차단, 빈/긴/잘못된 shareId 차단, XSS 미실행, 민감 필드 누출 0.
- 커밋: `fe3fd0b`.

## 4. S7-2D — 내부 리뷰 관리 (owner/editor) ✅

- `GET /api/projects/[projectId]/reviews`(firebase-admin): **Firebase ID token 검증 + owner/editor 권한 확인**(`lib/authServer.ts` `requireProjectEditor`, Rules `roleFor`와 동일 우선순위). 비로그인/무효 → 401, viewer/비멤버 → 403.
- ProjectDetail 개요 탭 "외부 피드백" 섹션(`components/views/ProjectReviews.tsx`, `canEdit`만): targetType 필터(전체/project/document/screen/handoff_package) + 작성자/내용/일시/대상/shareId. **React 텍스트 렌더만**. "v1 즉시 공개, 승인/숨김/삭제 후속" 안내.
- 라이브 검증: owner 200 / 비멤버 403 / 토큰 없음·오류 401, targetType 4종 구분, XSS 미실행, 민감 필드 누출 0, 공개 댓글과 동일 컬렉션 연동.
- 커밋: `d95e581`.

## 4-1. S7-2E — 댓글 모더레이션 (owner/editor) ✅

- **상태 정책**: 신규 댓글 기본 `pending`. public viewer는 `visible`만 노출. 관리 UI는 pending/visible/hidden 확인(소프트 삭제 `deleted`는 모든 목록 제외).
- **모더레이션 API**: `PATCH /api/projects/[projectId]/reviews/[reviewId]` body `{action}` — approve→`visible` / hide→`hidden` / delete→`deleted`(소프트 삭제). `requireProjectEditor` 재사용(owner/editor만), 대상 리뷰가 해당 projectId 소속인지 확인(교차 조작 방지). 비로그인 401 / viewer·비멤버 403.
- **관리 UI 확장**(`ProjectReviews.tsx`): 상태 필터(전체/대기/공개/숨김) + 대상 필터, 카드별 승인/숨김/삭제 액션 버튼 + 처리중 표시 + 액션 후 목록 갱신. content는 계속 React 텍스트 렌더만.
- 라이브 검증: POST→pending(공개 미노출)·승인→공개 노출·숨김→공개 사라짐·삭제→관리/공개 모두 제외·타 프로젝트 PATCH 403·토큰 없음 401·XSS 미실행·민감 필드 누출 0. UI 승인 클릭 → 배지 공개 전환 + viewer 노출.
- 커밋: `8d3d0a7`.

## 4-2. S7-2F — 스팸 방지 / 레이트리밋 ✅

- **서버 레이트리밋**(`lib/rateLimit.ts`): public review POST 대상. 클라이언트 식별은 **IP+UA의 HMAC-SHA256 해시(clientHash)** 만 저장(raw IP/UA 미저장). 해시 secret = `PUBLIC_REVIEW_HASH_SECRET`(미설정 시 개발용 폴백, **운영 필수**). `rateLimits` 컬렉션(서버 전용, Rules 미등록=기본 거부), 필드 = `key/count/windowStart/expiresAt/createdAt/updatedAt`. 고정 윈도우 트랜잭션.
  - 정책(코드 상수 `RATE_LIMITS`): per-share **60초 3회**, global(클라이언트 전체) **600초 10회**. 초과 시 `429 RATE_LIMITED`.
- **CAPTCHA(env-gated)**(`lib/captcha.ts`): provider = `turnstile`(Cloudflare). 비활성(기본)이면 통과 → 로컬 테스트 그대로. 활성 시 토큰 없으면 `403 CAPTCHA_REQUIRED`, 검증 실패/secret 미설정이면 `403 CAPTCHA_FAILED`(fail-closed). env: `PUBLIC_REVIEW_CAPTCHA_ENABLED` / `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY` / `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY`(위젯 site key, 설정 시 viewer에 보안 확인 영역 노출). **실제 위젯 프론트 연동은 후속(provider 연결 필요)** — 현재 서버 siteverify + 토큰 입력 구조까지.
- POST 검사 순서: share 활성/public_readonly → CAPTCHA → content/name 검증 → 레이트리밋 → 생성(pending).
- ShareViewer: 실패 케이스 안내(RATE_LIMITED/CAPTCHA_REQUIRED/CAPTCHA_FAILED/EMPTY_CONTENT/CONTENT_TOO_LONG/SHARE_DISABLED/SHARE_EXPIRED), pending 안내 유지, content React 텍스트 렌더만.
- 라이브 검증: 같은 클라이언트 4회째 POST `429`, rateLimits 필드에 raw IP/uid 없음, CAPTCHA 활성 시 토큰 없음→CAPTCHA_REQUIRED·잘못된 토큰→CAPTCHA_FAILED, 비활성 시 정상 201 pending.
- 커밋: `feat: add public review spam protection` (본 갱신 커밋).

### 운영 전 설정 필요 (S7-2F)
- `PUBLIC_REVIEW_HASH_SECRET` 설정(레이트리밋 해시 secret).
- CAPTCHA 활성화: `PUBLIC_REVIEW_CAPTCHA_ENABLED=1` + `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY` + `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY` + **프론트 위젯(Turnstile) 연동**.
- **TTL/정리 TODO**: `rateLimits` 문서는 `expiresAt`(ms) 보유 → Firestore TTL 정책(필드 `expiresAt`)으로 자동 삭제 설정 권장(콘솔/배포 설정, 코드 아님).

## 4-3. S7-2G — 운영 전 마감 ✅

### CAPTCHA 프론트 위젯 연결
- `components/share/ShareViewer.tsx`에 **Cloudflare Turnstile** 위젯 연결(explicit render). `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY`가 있을 때만 스크립트 로드 + 위젯 노출. 성공 콜백 → token 캡처, 만료/에러 콜백 → token 초기화 + 안내, 제출 성공 후 위젯 reset(토큰 1회용).
- 제출 시 token을 `POST /api/share/[shareId]/reviews`의 `captchaToken`으로 전달. 서버는 활성 시 siteverify로 검증(없음→`CAPTCHA_REQUIRED`, 실패→`CAPTCHA_FAILED`).
- 로컬/기본(site key 미설정)은 위젯 미노출 + 서버 비활성 → 기존 테스트 그대로.
- 라이브 검증(Turnstile 테스트 키, always-pass): 비활성=위젯 없음+제출 정상 / 활성=위젯 렌더+더미 토큰 캡처+서버 siteverify 성공→201 pending. 토큰없음/실패 차단은 S7-2F에서 확인.

### 운영 필수 env (서버 전용 vs public 구분)
| env | 구분 | 용도 |
|-----|------|------|
| `FIREBASE_PROJECT_ID` | 서버 | Admin 서비스 계정 |
| `FIREBASE_CLIENT_EMAIL` | 서버 | Admin 서비스 계정 |
| `FIREBASE_PRIVATE_KEY` | 서버 | Admin 서비스 계정(개행 `\n` escape) |
| `PUBLIC_REVIEW_HASH_SECRET` | 서버 | 레이트리밋 clientHash HMAC secret |
| `PUBLIC_REVIEW_CAPTCHA_ENABLED` | 서버 | CAPTCHA 활성 스위치('1'/'true') |
| `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY` | 서버 | Turnstile siteverify 비밀키 |
| `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY` | **public(클라 노출)** | Turnstile 위젯 site key |

> ⚠️ 서버 전용 값에는 `NEXT_PUBLIC_` 접두사 금지. private key/service account/secret 실제 값은 문서·저장소에 절대 넣지 않는다(`.env.local`만, 커밋 금지).

### Firestore TTL / 운영 설정
- **`rateLimits` 컬렉션은 TTL 설정 필요** — Firebase Console > Firestore > TTL 정책에서 **`expiresAt`(타임스탬프 필드 아님, ms number이므로 주의)** 기준 자동 삭제 권장. 미설정 시 rateLimits 문서가 계속 누적된다.
  - ⚠️ 현재 `expiresAt`은 **ms number**로 저장됨. Firestore 네이티브 TTL은 Timestamp 필드를 요구하므로, TTL 적용 시 (a) `expiresAt`를 Timestamp로 저장하도록 보강하거나 (b) 스케줄드 정리(Cloud Functions/cron)로 대체해야 함 → 운영 결정 필요(후속).
- **`publicReviews`는 TTL 삭제 대상 아님**(피드백 보존). 모더레이션 `deleted`는 소프트 삭제로 보존.

### 배포 전 남은 수동 확인 항목
1. 운영 env 전체 설정(위 표) + `PUBLIC_REVIEW_HASH_SECRET`/CAPTCHA secret 실제 값.
2. Cloudflare Turnstile 실제 site/secret 키 발급 + 도메인 등록.
3. `rateLimits` TTL/정리 정책 결정·설정(expiresAt Timestamp 보강 또는 스케줄 정리).
4. `firestore.rules` 콘솔 게시 상태 재확인(S7-2 동안 미변경이나 최신 게시본 확인).
5. (선택) 신규 pending 댓글 모더레이션 알림 — 후속.

## 5. QA 안정화 완료 항목 ✅

| 항목 | 상태 | 비고/커밋 |
|------|------|-----------|
| 보강정보 파일 업로드/URL 등록 **상단 이동**(요구사항 모드 detail) | ✅ | `5b66f39` |
| 프로토타입 코드 입력 → 화면 노출(iframe 렌더·새로고침 유지·목록 반영) | ✅ 정상(재현됨) | 코드 버그 아님 |
| 고유 접속 링크 복사 → 새 탭 접속(`#ws_main_project_{id}` resolve) | ✅ 정상(재현됨) | 비멤버는 Viewer |
| 코드 복사 → 입장(`project_{id}` → handleJoinByCode → resolve) | ✅ 정상(재현됨) | — |
| 팀원 직접 입장 가이드(링크/코드 안내 ↔ 실제 동작 일치) | ✅ 정상(재현됨) | — |
| internal share 회귀 | ✅ 없음 | — |
| public_readonly share 회귀 | ✅ 없음 | — |
| B라인 핵심 플로우 회귀(활성화→문서→프로토타입→IA/FS→전달패키지) | ✅ 없음 | — |
| 로그아웃 시 permission-denied 해결(protected subscription cleanup) | ✅ | `3a8ebfb` |
| **Google 로그인 사용자만 프로젝트 생성 가능** | ✅ | `5b66f39` |
| **익명 사용자는 프로젝트 생성 불가**(UI + 함수 + 모달 게이트) | ✅ | `5b66f39` |
| 새 프로젝트 버튼 회귀(비-소유자 숨김) 수정 | ✅ | `d31c2a4` |

> 참고: 위 "정상(재현됨)" 항목들은 신선한 세션의 실제 브라우저 클릭으로 동작 확인됨. 로컬에서 실패 시 **stale dev 빌드/캐시**가 가장 유력 — hard reload / dev 서버 재시작 권장. Google OAuth 인터랙티브 경로(로그인 생성·로그아웃 클릭)는 사용자 로컬 세션에서 최종 확인 완료.

## 6. 확정 정책 (변경 시 별도 합의)

- **Firestore Rules 변경 없음** — S7-2 전 단계에서 Rules 미변경.
- **public read/write 직접 오픈 금지** — 모든 비로그인 접근/쓰기는 서버 매개.
- **Firebase Admin API 경유 유지** — `shares`/`publicReviews` 등은 firebase-admin(Rules 우회)으로만 읽고 쓴다. 클라이언트 직접 접근 없음.
- **screen.code 실행 미리보기 보류** — public viewer/관리 UI 모두 텍스트로만 표시(`dangerouslySetInnerHTML`/실행 iframe 금지). 필요 시 `sandbox=""` srcdoc 별도 검토.
- **익명 폴백 유지** — KAKE/기존 익명 데이터 호환. 단, 익명의 프로젝트 생성은 차단.
- **완전 로그아웃 정책 변경 보류** — 로그아웃 시 익명 폴백 복귀(별도 로그인 전용 화면 없음). 전이 구간 protected read는 cleanup으로 차단됨.
- 팀/멤버십 기반 타인 프로젝트 열람 확장 보류(현재 단계 A: `read: if signedIn()`).
- **댓글 모더레이션(S7-2E)**: 신규 댓글 `pending` → owner/editor 승인 시 공개. 삭제는 소프트 삭제(`deleted`). 모든 모더레이션은 서버 API + firebase-admin + ID token(owner/editor)만.
- **스팸 방지(S7-2F)**: 레이트리밋/CAPTCHA는 서버 API + firebase-admin만. **raw IP/UA/uid 저장 금지** — IP+UA는 HMAC 해시(clientHash)로만. `rateLimits` 컬렉션도 클라이언트 직접 접근 불가(Rules 미등록).
- `.env.local`/서비스 계정 키 커밋 금지.

## 7. 최신 커밋 목록 (S7-2 시리즈 + QA, 최신순)

```
<본 커밋> feat: connect captcha widget and finalize public share   # S7-2G (Turnstile 위젯 연결 + 운영 마감)
4362480 feat: add public review spam protection                # S7-2F (레이트리밋 + CAPTCHA env-gated)
8d3d0a7 feat: add public review moderation                       # S7-2E (모더레이션 + 정책 pending 전환)
fbe1fd9 docs: update checkpoint with full s7-2 share series and qa
d95e581 feat: add internal review management for owner editor   # S7-2D
fe3fd0b feat: add public review comments for readonly shares     # S7-2C
e4c8fd8 docs: add public share and qa stabilization checkpoint   # (본 문서 초판)
5b66f39 fix: restrict project creation to google users and surface source inputs  # QA: 생성권한+보강UI
3a8ebfb fix: tear down protected subscriptions on sign-out       # QA: 로그아웃
d31c2a4 fix: allow any signed-in user to create projects         # QA: 생성버튼 회귀(이후 5b66f39에서 Google 전용으로 강화)
54c855f feat: enable public readonly share creation              # S7-2B-4
07a0f89 feat: add public readonly share viewer                   # S7-2B-3
2d686d3 feat: add public readonly share api                      # S7-2B-2
7c2ad32 chore: add firebase admin infrastructure                 # S7-2B-1
c7953a2 feat: add share records for internal share links         # S7-2A
```

## 8. 워킹트리 상태

- 본 체크포인트 갱신 시점 기준 **clean**. 모든 변경은 위 커밋으로 반영됨.
- KAKE(`8DH3maHooF9WkhnZO81c`) 무손상, 테스트 데이터/임시 스크립트 정리 완료.

## 9. 다음 단계 후보

- `rateLimits` Firestore TTL/정리 정책 확정(`expiresAt` Timestamp 보강 또는 스케줄 정리) + 콘솔 설정.
- 모더레이션 알림(새 pending 댓글 → owner/editor 알림).
- (필요 시) 멤버십 기반 read(단계 B) / 완전 로그아웃 화면.

## 10. 최종 QA 체크리스트 (S7-2 전체)

| 영역 | 항목 | 상태 |
|------|------|------|
| S7-2A | internal share 생성/복사/비활성/만료 + `#share_` resolve | ✅ |
| S7-2B | public_readonly viewer(project/document/screen/handoff) + 차단(internal/disabled/expired/404/400) | ✅ |
| S7-2C | 비로그인 댓글 등록(POST) / 목록(GET, visible만) | ✅ |
| S7-2D | 내부 리뷰 관리(owner/editor, ID token, viewer/비로그인 차단) | ✅ |
| S7-2E | 모더레이션 pending/approve→visible/hide/delete(소프트) | ✅ |
| S7-2F | 레이트리밋(429, HMAC clientHash, raw IP 미저장) | ✅ |
| S7-2F/G | CAPTCHA env-gated + 위젯 연결(비활성=통과/활성=토큰 검증) | ✅ |
| QA | Google 로그인 사용자만 프로젝트 생성 | ✅ |
| QA | 익명 사용자 프로젝트 생성 차단(UI+함수+모달) | ✅ |
| QA | 로그아웃 permission-denied 없음(subscription cleanup) | ✅ |
| QA | 보강정보 파일/URL 등록 상단 노출(요구사항 모드) | ✅ |
| QA | 프로토타입 코드 등록 → 화면 노출(iframe·새로고침 유지) | ✅ |
| QA | 고유 접속 링크/코드 입장 resolve | ✅ |
| QA | 팀원 직접 입장 가이드 ↔ 실제 동작 일치 | ✅ |
| 회귀 | B라인 문서 생성/PRD 조립/buildHandoffPackage 무변경 | ✅ |
| 회귀 | KAKE 무손상 | ✅ |
| 보안 | Firestore Rules 무변경 / public read·write 미개방 / raw IP·uid 미저장 / XSS 텍스트 렌더 | ✅ |

> 자동/스크립트 검증은 신선한 세션 실제 클릭 + admin 테스트 데이터 기준. Google OAuth 인터랙티브 경로는 사용자 로컬 세션에서 최종 확인 완료. CAPTCHA 활성 경로는 Turnstile 테스트 키로 확인(운영은 실제 키 + 위젯 도메인 등록 필요).
