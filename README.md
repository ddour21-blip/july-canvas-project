# July 캔버스 — 기획 자동화 툴

아이디어를 시장조사·제품화전략·IA·기능정의서·클릭 가능한 프로토타입·최종 PRD.md까지 연결하는 기획 OS입니다. (Next.js 16 + Firebase)

## 시작하기

1. Firebase 환경변수 설정

```bash
cp .env.local.example .env.local
# .env.local 에 NEXT_PUBLIC_FIREBASE_* 값을 채웁니다.
```

> 환경변수가 없으면 앱은 "Firebase 설정이 필요합니다" 안내 화면을 표시합니다.

2. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

## 핵심 흐름

1. 프로젝트 생성 → 2. **활성화 위저드**(기획 의도·문제·고객·가치·차별점·수익구조·시장·MVP 범위·레퍼런스 입력)
→ 3. 활성화 시 `PROJECT_BRIEF / MARKET_RESEARCH / PRODUCT_STRATEGY` 문서 자동 생성
→ 4. 문서 탭에서 IA / 기능정의서 / **PRD** 작성·생성 → 5. 프로토타입 화면 등록·기획 주석·댓글/멘션
→ 6. PRD 승인 시 잠금 + 프로토타입 URL 공유

## 구조

```
app/                  Next.js 진입점 (page.tsx → ClientApp → CanvasApp)
components/
  CanvasApp.tsx       앱 셸: 인증, 실시간 구독, 라우팅, 헤더
  ClientApp.tsx       브라우저 전용 동적 로드 래퍼 (ssr: false)
  common/             Button, ConfirmModal, CommentInputBox
  modals/             공유/내보내기/알림/프로필 모달
  views/              Dashboard, ProjectDetail, ProjectDocuments,
                      ProjectActivationWizard, ScreenEditor
lib/
  firebase.ts         환경변수 기반 Firebase 초기화
  firestore.ts        Firestore 경로 헬퍼 (col / docRef)
  utils.ts            공용 유틸 (id/시간/해시/selector/clipboard)
  markdown.ts         경량 마크다운 렌더러
  htmlRenderer.ts     iframe srcDoc 생성 (React/HTML 런타임 렌더)
  documents.ts        문서 템플릿 + PRD 조립 로직
  export/             MD / PDF / PPTX 내보내기
types/index.ts        데이터 모델 타입
```

## 데이터 모델 (Firestore: `artifacts/{appId}/public/data/*`)

`projects` · `screens` · `documents` · `members` · `mockEmails` · `screen_images`

## 배포 (Vercel)

GitHub 푸시 후 Vercel에서 레포 연결, 동일한 `NEXT_PUBLIC_FIREBASE_*` 환경변수를 등록하면 배포됩니다.
