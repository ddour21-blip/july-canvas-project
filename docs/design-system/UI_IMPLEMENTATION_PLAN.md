# July Canvas — 인수인계 (다음 채팅 이어가기용)

작성 시점: UI-2(디자인 토큰) 완료 직후. 프로젝트 경로: `/Users/olim_july/Documents/july-canvas`.

---

## 1. 현재까지 완료된 단계
**1차(앱 고도화)** — 완료
- axure 단일 파일 → Next.js 16 구조 분리(app/components/lib/types), 타입 추가, 버그 3종 수정(sortedVersions/groupedHistory/activeWorkspaceId), 프로젝트 활성화 위저드 + 문서 모델(6종), 라이브 QA 통과.

**2차(권한/협업)** — 1~5단계 완료
- 1) Google 로그인 인증(익명 폴백 유지) + owner 권한 구조
- 2) 프로젝트 구조 정리(조직 확장 대비) + 삭제 캐스케이드(projectMembers 포함)
- 3) owner/editor/viewer **UI 게이팅**(`useRole`)
- 4) **Firestore Rules 재설계** → 단계 A **콘솔 게시 완료 & 라이브 검증 통과**
- 5) **comments 컬렉션 분리** + 레거시 자동 마이그레이션
- (6단계 알림/이메일 = **미착수**)

**디자인 적용** — UI-0~UI-2 완료
- UI-0 디자인 원본 정리 + lint/build 제외
- UI-1 브랜드 에셋(로고/파비콘/OG/manifest/metadata/헤더 로고)
- UI-2 green-first 디자인 토큰 반영(globals.css)

## 2. 최신 커밋 해시 (최신 → 과거)
```
a201d87 style: add green workspace design tokens          ← UI-2 (HEAD)
056089a style: add july canvas brand assets               ← UI-1
ade757b chore: organize design system source assets        ← UI-0
09009ef feat: migrate annotation comments to comments collection  ← 2차-5
a93aff7 docs: add firestore rules for project roles         ← 2차-4
ce3f60c feat: add role based ui gating                      ← 2차-3
cbcb039 refactor: prepare project structure for organization workspace ← 2차-2
58b6b9c feat: add google auth and owner role foundation     ← 2차-1
9761531 fix: stabilize responsive layout text wrapping      ← UI 0단계(레이아웃 버그)
2339284 fix: PRD 승인 시 프로토타입 URL 자동 주입 + 없으면 차단
bf5412a fix: 주석 댓글 즉시 렌더
ca374c7 chore: initialize july canvas planning automation prototype ← 1차 백업
54136c3 Initial commit
```
브랜치: `main` (원격 없음, GitHub 미연결). 워킹트리: `design-system-source/`만 트래킹됨, `.env.local` 미트래킹.

## 3. Firebase / Auth / Firestore Rules 상태
- Firebase projectId: **`my-prototype-app-67dc5`** (`.env.local`의 `NEXT_PUBLIC_FIREBASE_*`, **커밋 금지**).
- 데이터 경로: **`artifacts/july-canvas-app/public/data/{collection}/{doc}`** (`lib/firestore.ts` BASE). 콘솔에서 `artifacts/july-canvas-app`·`public` 문서는 회색(조상 문서)로 보이니 클릭해 내려가야 함.
- Auth: Google 로그인 + **익명 폴백**(QA용). 콘솔에서 Google·익명 sign-in 모두 활성.
- **Rules: 단계 A 게시됨** — read=로그인 사용자, write=역할 기반(owner/editor/viewer), 판정 우선순위 projectMembers(`{pid}_{uid}`)→roleByUid→ownerId. 규칙 원본 `firestore.rules`, 절차 `docs/FIRESTORE_RULES.md`.
- **단계 B(멤버십 read 차단)는 미게시** — 앱이 컬렉션 통째 구독이라, 게시 전 `where(memberUids array-contains)`/`where(projectId)` 쿼리 리팩터 필요. 게시 금지.

## 4. comments 컬렉션 분리 상태
- 신규 댓글/답글 = `comments` 컬렉션 저장(`lib/comments.ts`, `createComment`), **screens 문서 update 없음 → viewer 작성 가능**.
- 레거시 `annotation.comments`는 **삭제 안 함**(fallback). 화면 로드 시 결정적 ID(`legacy_{screenId}_{annId}_{cid}`)로 자동 마이그레이션(idempotent), 표시 시 중복 제거 병합.
- `CommentDoc` 타입(`types/index.ts`): projectId/screenId/annotationId/parentCommentId/body/authorUid/mentions/status/source/migratedFrom.
- 삭제 캐스케이드(`lib/projects.ts deleteProjectCascade`)에 comments 포함.

## 5. 디자인 시스템 원본 위치
- `design-system-source/july-canvas-design-system/` (커밋됨, 참고용, **앱에서 직접 import 금지**).
- 주요: `tokens/*.css`, `components.css`, `ui_kits/`, `components/`, `public/brand/`, `_ds_bundle.js`/`_ds_manifest.json`/`_adherence.oxlintrc.json`(분석용), `readme.md`(브랜드 가이드).
- eslint/tsconfig에서 제외(`design-system-source/**`).

## 6. public/brand 반영 상태 (UI-1)
- `public/brand/logo/`(symbol/logo-light·dark/header·header-dark/sidebar + symbol PNG 세트), `favicon/`(ico/svg/16/32/apple/app-icon/maskable/site.webmanifest), `og/`.
- `app/layout.tsx` metadata(title "July Canvas", description, icons, manifest, openGraph, twitter). `app/favicon.ico`(Next 기본) 제거.
- 헤더 로고: `CanvasApp` 상단 `/brand/logo/header.svg` 락업.
- **sidebar.svg/symbol.svg는 에셋만 준비** → 좌측 내비(드라이브형)는 **UI-4**에서 배치.
- 매핑: `docs/design-system/DESIGN_ASSET_MAPPING.md`.

## 7. UI-2에서 반영한 토큰 내용
- `app/globals.css`에 디자인 토큰 인라인(`:root`): primary `#50FA6E`, cool-neutral grays(#f6f8fa…#141a22), status(green/amber/red/slate), surface/border/text, shadow(xs~2xl + brand), radius, spacing(4px), motion, z, typography.
- `@theme` Tailwind 팔레트 리매핑: **blue→그린 / purple→slate / gray·green·amber·red→디자인 ramp** (컴포넌트 미수정으로 green-first 전환). `blue-600/700`은 흰 텍스트 가독 위해 진한 그린.
- body: `word-break:keep-all` 유지, 다크 강제 플립 제거, 폰트 스택(Pretendard 미로딩→시스템 폴백).
- 상세: `docs/design-system/DESIGN_TOKEN_MAPPING.md`.

## 8. 다음 채팅에서 이어갈 작업 순서
1. **UI-3 공통 컴포넌트** — `components/common/{Button,ConfirmModal,CommentInputBox}` + badge/card/input/textarea/modal/avatar/toast/tabs. 정식 primary 버튼(밝은 `#50FA6E` 필 + `--color-on-primary` 다크 텍스트) 적용.
2. UI-4 Dashboard(+CanvasApp 상단/사이드바: 드라이브형 좌측 내비, sidebar.svg 배치)
3. UI-5 ProjectDetail / ProjectDocuments / ProjectActivationWizard
4. UI-6 ScreenEditor / 프로토타입 캔버스
5. UI-7 모달/보조 화면
6. (디자인 완료 후) 2차-6 알림/이메일: `notifications` 컬렉션 + `app/api/notify` Route Handler + Resend(서버 전용 `RESEND_API_KEY`, 키 없으면 graceful skip)

## 9. 절대 변경하면 안 되는 정책
- Auth/Firestore/Rules 로직 변경 금지(게시된 단계 A 규칙과 어긋나게 하지 말 것). **단계 B 규칙 게시 금지**(쿼리 리팩터 전).
- owner/editor/viewer 권한 정책·게이팅 변경 금지.
- comments 컬렉션 구조 변경 금지. 신규 댓글이 **screens update를 유발하면 안 됨**(viewer 작성 깨짐).
- 레거시 `annotation.comments` 삭제 금지, 프로젝트 데이터 마이그레이션 금지.
- **KAKE 프로젝트(`projects/8DH3maHooF9WkhnZO81c`) 삭제/변경 금지**(유일한 정상 데이터).
- `.env.local`·Firebase 키·Resend 키 커밋/노출 금지.
- 디자인 시스템 원본을 앱에서 직접 import 금지.
- 한 번에 전체 UI 수정 금지(단계별).
- 하드코딩 테스트 문서 ID에 **언더스코어 금지**(해시 라우팅 `_` 분리 → 라우팅/정리 불가 orphan 발생). 테스트 데이터는 검증 후 삭제.

## 10. 검증 명령어
```bash
npx tsc --noEmit
npx eslint .        # design-system-source는 제외됨, 0 problems 기대
npm run build
```
라이브(미리보기): 대시보드 로딩 / 프로젝트 생성·입장 / 화면 추가 / 문서 생성·편집 / PRD 생성·승인 / 댓글·멘션 / 다운로드 / 권한별 버튼 노출 / viewer read-only / **console permission-denied 없음**.
- 미리보기 팁: dev 기동 후 서버 ready(HTTP 200) 확인하고 navigate(레이스 방지). 익명 uid는 미리보기 브라우저에서 `m5FZDWIjFMgTKk1zqMlIQQxU8NB3`로 안정적이었음.

## 11. 남은 작업 목록
- [ ] UI-3 공통 컴포넌트(green-first, 정식 primary 버튼)
- [ ] UI-4 Dashboard + 좌측 워크스페이스 내비(sidebar.svg)
- [ ] UI-5 ProjectDetail / ProjectDocuments / Wizard
- [ ] UI-6 ScreenEditor / 캔버스
- [ ] UI-7 모달/보조 화면
- [ ] 2차-6 알림 + 이메일(notifications + /api/notify + Resend)
- [ ] (선택) 단계 B Rules용 앱 쿼리 리팩터(memberUids array-contains 등) 후 멤버십 read 강제 게시
- [ ] (선택) Pretendard 웹폰트 로딩, Dashboard myProjects 필터를 roleByUid 기반으로 확장
- [ ] (확인 필요) Google OAuth 인터랙티브 로그인/로그아웃 — 헤드리스 QA 불가, 실제 브라우저에서 사용자 확인 권장
