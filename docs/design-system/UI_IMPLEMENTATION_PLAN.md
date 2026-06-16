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
- [x] UI-3 공통 컴포넌트(green-first, 정식 primary 버튼) — `0ab171d`
- [x] UI-4 Dashboard + 좌측 워크스페이스 내비(sidebar.svg) — `c29f765`/`648248a`/`ed0d9d3`
- [x] UI-5 ProjectDetail / ProjectDocuments / Wizard — `4788604`/`b7b0540`/`4cf032e`
- [x] UI-6 ScreenEditor / 캔버스 — `367e58d`/`f2fda73`/`e78db39`/`fa5d696`
- [x] UI-7 모달/보조 화면 — `5eb9b7a`/`deb6e8e`/`4db5f4d`/`f001d96`
- [x] UI-FINAL 전체 회귀 QA + 문서화 + Dashboard blue-* 토큰 치환
- [ ] 2차-6 알림 + 이메일(notifications + /api/notify + Resend) ← **다음 기능 단계**
- [ ] (선택) 단계 B Rules용 앱 쿼리 리팩터(memberUids array-contains 등) 후 멤버십 read 강제 게시
- [ ] (선택) Pretendard 웹폰트 로딩, Dashboard myProjects 필터를 roleByUid 기반으로 확장
- [ ] (확인 필요) Google OAuth 인터랙티브 로그인/로그아웃 — 헤드리스 QA 불가, 실제 브라우저에서 사용자 확인 권장

## 12. UI 적용 완료 현황 (UI-FINAL, 디자인 라운드 종료)

### 12.1 UI-0 ~ UI-7 완료 상태 + 커밋 해시
| 단계 | 내용 | 커밋 |
|---|---|---|
| UI-0 | 디자인 원본 정리(design-system-source, lint/tsc 제외) | `ade757b` |
| UI-1 | 브랜드 에셋(로고/파비콘/OG/manifest/metadata) | `056089a` |
| UI-2 | green-first 토큰(globals.css :root + @theme 리매핑) | `a201d87` |
| UI-3 | 공통 컴포넌트(Button #50FA6E primary, ConfirmModal, CommentInputBox) | `0ab171d` |
| UI-4-1 | 드라이브형 좌측 WorkspaceSidebar(sidebar.svg, 대시보드 뷰 한정) | `c29f765` |
| UI-4-2 | Dashboard 헤더 + 프로젝트 카드 그리드(상태 배지/카운트/아바타/시간) | `648248a` |
| UI-4-3 | Dashboard 최근 활동 패널(파생) + empty state CTA | `ed0d9d3` |
| UI-5-1 | ProjectDetail(헤더/정보카드/화면목록/empty) | `4788604` |
| UI-5-2 | ProjectDocuments(마스터-디테일 목록+에디터, PRD 승인가드 유지) | `b7b0540` |
| UI-5-3 | ProjectActivationWizard(stepper green, 입력 10항목) | `4cf032e` |
| UI-6-1 | ScreenEditor 헤더/툴바(권한 배지/모드 토글) | `367e58d` |
| UI-6-2 | 프리뷰 캔버스 프레임(white frame+radius, iframe minWidth 1280 유지) | `f2fda73` |
| UI-6-3 | 정책 패널/드래프트 폼/버전 히스토리/전체 히스토리 대시보드 | `e78db39` |
| UI-6-4 | 댓글/멘션 스레드 + 주석 카드 + 캔버스 마커 | `fa5d696` |
| UI-7-1 | 공통 모달 오버레이 토큰 통일(`rgba(20,26,34,0.55)`) | `5eb9b7a` |
| UI-7-2 | ShareModal / ProfileModal | `deb6e8e` |
| UI-7-3 | ExportDocModal(카드형 옵션) / ExportZipModal | `4db5f4d` |
| UI-7-4 | InboxModals(VirtualInbox/EmailSimulation) | `f001d96` |
| UI-FINAL | 전체 회귀 QA + 문서화 + Dashboard blue-* 토큰 치환 | (본 커밋) |

### 12.2 최종 디자인 적용 범위
- 전 화면 green-first(primary `#50FA6E`) + cool-neutral surface 토큰 적용: Dashboard, WorkspaceSidebar, ProjectDetail, ProjectDocuments, ProjectActivationWizard, ScreenEditor(헤더/캔버스/정책패널/히스토리/댓글), 모달 6종(Confirm/Share/Profile/ExportDoc/ExportZip/Inbox), 공통 Button/CommentInputBox.
- 상태 배지는 `--status-*` semantic 토큰, 모달 오버레이는 `rgba(20,26,34,0.55)` 통일.

### 12.3 Dashboard blue-* 잔여 처리 결과 (UI-FINAL)
- UI-7-4에서 보류했던 Dashboard 새프로젝트/팀원관리 모달의 `blue-*` 5건을 **안전한 색상 토큰으로 치환**(focus ring→`--color-focus-ring`, 아이콘/아바타→`--color-primary-*`, 오버레이→cool-neutral). 레이아웃/로직 무변경.
- 결과: `components/{modals,common,views}`에 `blue-/purple-/indigo-/violet-` **0건**.

### 12.4 보류 항목 (의도적 유지)
- `components/CanvasApp.tsx`·`components/ClientApp.tsx`의 `blue-*` 유틸(헤더 알림/Google 로그인/아바타, 로딩 스피너, FirebaseNotice, BackupModal): **@theme 리매핑으로 green 렌더 중**(UI-2 전략). 앱 셸이라 이번 디자인 라운드 범위 밖 → 유지. 시각상 그린(스크린샷 확인됨).
- 단계 B Firestore Rules(멤버십 read), Pretendard 웹폰트, roleByUid 기반 myProjects 필터 확장: 선택 과제로 보류.

### 12.5 다음 기능 단계: 2차-6 알림/이메일
- `notifications` 컬렉션 + `app/api/notify` Route Handler + Resend(`RESEND_API_KEY` 서버 전용, 미설정 시 graceful skip). 현재 멘션은 `mockEmails` 앱 내부 시뮬레이션. **mockEmails는 deleteProjectCascade 미포함** → 알림 검증 시 orphan 생성 주의.

### 12.6 전체 회귀 QA 결과 (UI-FINAL)
- 반응형 1440/1280/1024/800 전부 정상, 800px는 `min-w-[1024px]` 유지 + 페이지 가로 스크롤, **한국어 텍스트 세로 분리 없음**.
- 임시 프로젝트 풀 라이프사이클(생성→활성화 위저드→문서 6종→화면 추가→ScreenEditor→주석→ProfileModal→댓글→ExportDoc) 정상, 캐스케이드 삭제 후 KAKE만 잔존.
- Dashboard 모달(팀원관리/새프로젝트/배포안내/Inbox/Confirm) green-first 정상. **콘솔 에러 0 · permission-denied 0**.
- 검증 명령: `npx tsc --noEmit`(OK) / `npx eslint .`(0 problems) / `npm run build`(성공).
