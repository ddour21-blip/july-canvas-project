# July Canvas — 입력 소스 확장 + 공유 URL 구조 설계 (M3/M4)

작성: M2(프로젝트 모드 선택, `d029f64`) 이후. **설계/제안 문서이며 코드 변경 없음.**
선행 문서: [`PROJECT_MODE_STRATEGY.md`](PROJECT_MODE_STRATEGY.md) · [`FLOW_REVIEW_AND_EXPANSION_PLAN.md`](FLOW_REVIEW_AND_EXPANSION_PLAN.md)

본 문서는 두 가지 확장을 설계한다.
1. **입력 소스 확장(M3)** — 요구사항/RFP 모드에서 텍스트 외에 파일 업로드·URL 등록을 받는다.
2. **공유 URL 구조(M4)** — 접속 코드 외에 프로젝트/문서/프로토타입별 공유 URL로 바로 진입한다.

> 이번 단계는 **문서만 작성**한다. 컬렉션 생성·Storage·파싱·크롤링·route·Rules·UI 구현은 모두 후속 단계(S2~S8).

---

## 0. 현재 구조 (코드 기준 사실)

설계가 현실과 어긋나지 않도록, 먼저 현재 동작을 코드에서 확인한 결과를 정리한다.

### 0.1 라우팅 — 해시 + 언더스코어 구분자
- `components/CanvasApp.tsx`는 `window.location.hash`를 **`_`(언더스코어)로 split**해서 라우트를 파싱한다.
  - `{viewType}_{viewId}` — 예: `#project_{projectId}`, `#screen_{screenId}`
  - `{viewType}_{viewId}_ann_{annotationId}` — 화면 + 특정 주석
  - `ws_{workspaceId}_{viewType}_{viewId}[_ann_{annId}]` — 워크스페이스 프리픽스 포함
- 파서는 추가 키워드로 **`ann`만 인식**한다. 그 외 위치의 토큰은 무시된다.
- 뷰 매핑: `dashboard` → Dashboard, `project` → ProjectDetail, `screen` → ScreenEditor.
- ⚠️ **결정적 제약**: ID에 `_`가 들어가면 라우팅이 깨진다(기존 "테스트 ID 언더스코어 금지" 정책의 근거). 따라서 `#project_{pid}_document_{did}` 같은 **중첩 딥링크는 현재 파서로 불가**(`document_{did}`가 무시됨).

### 0.2 "접속 코드" = 해시 라우트 문자열 (별도 코드/컬렉션 없음)
- `ShareModal`은 공유 URL `…#ws_{workspaceId}_{type}_{id}` 와 접속 코드 `{type}_{id}`(= `displayHash`)를 만든다.
- Dashboard `handleJoinByCode`는 입력한 코드를 그대로 `navigate('#' + code)` 한다.
- 즉 **접속 코드는 곧 해시 라우트 문자열**이다. `accessCode` 필드도, `shares` 컬렉션도, shareId도 **존재하지 않는다**.
- 접근 제어는 **게시된 단계 A Rules(read = 로그인 사용자)** 뿐이다. "읽기 전용 공유 / 외부 리뷰어 / 만료"는 **현재 강제 수단이 없다**(링크를 아는 로그인 사용자는 모두 read 가능, 통째 구독 모델).

### 0.3 딥링크 현황
| 대상 | 현재 딥링크 | 비고 |
|---|---|---|
| 프로젝트 | `#project_{projectId}` ✅ | accessCode = `project_{id}` |
| 화면(프로토타입) | `#screen_{screenId}` ✅ (`_ann_{annId}` 옵션) | ScreenEditor |
| 문서 | ❌ 없음 | ProjectDocuments의 `selectedType` 로컬 state. URL에 없음 |

### 0.4 파일 첨부 선례
- `screen_images` 컬렉션이 프로토타입 캡처를 **base64로 Firestore 문서에 저장**하는 선례가 있다(별도 Storage 미사용). 파일 업로드 설계 시 이 선례와 Firebase Storage를 비교한다(§5).

---

## 1. 요구사항/RFP 모드에서 파일 업로드가 필요한 이유

요구사항/RFP 모드는 현재 **텍스트 1칸** 중심이다(`activation.intent`). 그러나 실제 기획 업무에서 요구사항은 다음 형태로 전달된다.

- RFP 문서 / 요구사항 PDF / 기획서(DOCX) / 정책표(XLSX·CSV) / 화면 캡처(PNG·JPG)

텍스트만으로는:
- 발주처 RFP의 **원문 정책·제약**을 옮겨 적는 수작업이 크고 누락이 생긴다.
- 정책표·화면 캡처처럼 **구조화/시각 정보**는 텍스트로 옮기면 손실된다.
- AI 초안/역작성의 입력 품질이 낮아진다.

→ 파일을 **원본 그대로 등록**하고, 이후(S5) 텍스트 추출·분석해 보강 필드/문서 초안에 반영한다.

## 2. URL 등록이 필요한 이유

요구사항과 함께 다음 링크가 전달/참조된다.
- 기존 서비스 / 경쟁 서비스 / 랜딩 / 관리자 페이지 URL
- 프로토타입 URL(Gemini Canvas / Claude Artifact / Figma)
- 참고 문서·기사·블로그 URL

URL 등록 목적: 페이지 구조·포지셔닝·CTA·요금제·랜딩 구성·기능/화면 레퍼런스·프로토타입 참고를 **분석 입력**으로 확보. 텍스트로 받아쓰기보다 **출처 링크를 보존**하는 편이 정확하고 재검증 가능하다.

> ⚠️ URL fetch/crawl은 서버 환경·보안(SSRF·로그인 벽·봇 차단·CORS) 이슈가 있어 **바로 구현하지 않는다**. 먼저 등록/메타 저장 구조만 정의하고(§3), 실제 분석은 후속 API route/worker(S5)에서 한다.

---

## 3. 입력 소스 유형 정의

| 유형(`type`) | 의미 | 1차 저장 | 분석(후속) |
|---|---|---|---|
| `text` | 직접 입력한 요구사항/메모 | `content` | 요구사항 추출 |
| `file` | RFP/문서/정책표 (PDF·DOCX·XLSX·CSV·TXT·MD) | 파일 메타 + 저장경로 | 텍스트 추출 → 분석 |
| `screenshot` | 화면 캡처·디자인 이미지 (PNG·JPG·WebP) | 파일 메타 + 저장경로 | OCR/비전 (먼 후속) |
| `url` | 일반 참고/문서 URL | `url` + `urlType` | fetch/요약 |
| `reference_url` | 경쟁/레퍼런스 서비스 URL | `url` | 포지셔닝·구성 분석 |
| `prototype_url` | Gemini Canvas/Artifact/Figma 등 프로토타입 URL | `url` | 화면/플로우 참고 |

`urlType` 보조 분류: `service | reference | prototype | document | other`.

---

## 4. 입력 소스 데이터 모델 제안 (`projectSources`)

`activation`(원천 텍스트 필드)은 그대로 두고, **첨부/링크는 별도 컬렉션 `projectSources`로 분리**한다. (1:N, 프로젝트당 다수 소스. `activation` 안에 배열로 넣으면 문서가 비대해지고 부분 업데이트/권한이 어려움.)

> 컬렉션명은 **`projectSources` 권장**(`screens`/`documents`/`projectMembers`와 동일한 camelCase·복수형, 프로젝트 종속성이 이름에 드러남). `inputSources`는 프로젝트 스코프가 불명확해 비권장.

```ts
// 제안 — 이번 단계에서 types/index.ts에 추가하지 않음
export type ProjectSourceType =
  | 'text' | 'file' | 'screenshot'
  | 'url' | 'reference_url' | 'prototype_url';

export type ProjectSourceStatus =
  | 'pending'    // 등록만 됨, 분석 전
  | 'uploaded'   // 파일 업로드 완료
  | 'analyzing'  // 분석 중
  | 'analyzed'   // 분석 완료
  | 'failed'     // 분석 실패
  | 'skipped';   // 분석 생략

export interface ProjectSource {
  id: string;
  projectId: string;            // 기존 컬렉션과 동일하게 projectId 필드 보유(Rules/쿼리 판정용)
  type: ProjectSourceType;
  title?: string;
  description?: string;

  // text
  content?: string;

  // file / screenshot
  fileName?: string;
  fileType?: string;            // MIME
  fileSize?: number;            // bytes
  storagePath?: string;         // Storage 경로 (또는 inline 저장 시 미사용)
  downloadUrl?: string;

  // url
  url?: string;
  urlType?: 'service' | 'reference' | 'prototype' | 'document' | 'other';

  // 분석 결과 (S5에서 채움, content와 동일하게 자유 텍스트/JSON)
  status: ProjectSourceStatus;
  extractedText?: string;
  analysisSummary?: string;
  analysisResult?: {
    requirements?: string[];
    features?: string[];
    screens?: string[];
    policies?: string[];
    references?: string[];
    risks?: string[];
  };

  createdBy: string;            // uid
  createdAt?: FirestoreTime;    // ⚠️ 프로젝트 컨벤션: number가 아닌 FirestoreTime
  updatedAt?: FirestoreTime;
}
```

**기존 컨벤션과의 정합**:
- `projectId` 필드 보유 → 단계 B Rules의 `where('projectId','==',pid)` / `isMember(resource.data.projectId)` 패턴 재사용.
- 타임스탬프는 `serverTimestamp()` + `FirestoreTime`(프로젝트 전역 타입). 제안 원안의 `number`는 `FirestoreTime`으로 조정.
- 삭제 캐스케이드(`lib/projects.ts deleteProjectCascade`)에 `projectSources` 추가 필요(orphan 방지) — S2/S3에서.
- `activation.references`(자유 텍스트)는 유지하되, 구조화 등록은 `projectSources`로 점진 이전.

---

## 5. 파일 분석 흐름

```
[등록] 사용자가 파일 선택
  → (S3) Storage 업로드 + projectSources 문서 생성(status: 'uploaded')
[분석 트리거] (S5) /api/sources/analyze 또는 worker
  → status: 'analyzing'
  → 파일 타입별 텍스트 추출:
      PDF → 텍스트 레이어 추출(스캔본은 OCR, 먼 후속)
      DOCX → 문단 추출 / XLSX·CSV → 표 → 행/열 정규화 / TXT·MD → 그대로
      이미지 → (먼 후속) 비전/OCR
  → extractedText 저장
  → (선택) AI로 analysisResult(requirements/features/screens/policies/...) 구조화
  → status: 'analyzed' | 'failed'
[활용] §7 보강 필드 자동 분해 + 문서 초안 입력
```

**저장소 선택 (S3 확정 — Firebase Storage 채택)**:
- **Firebase Storage** — 문서/PDF/엑셀은 수 MB가 흔해 Firestore 1MB 문서 한도를 초과. 메타데이터(`projectSources`)는 Firestore, 바이너리는 Storage(`storagePath`).
- 선례인 `screen_images`의 base64-in-Firestore 방식은 **작은 이미지에만** 적합(문서 첨부엔 부적합). 파일은 Storage로 통일.
- 경로: `artifacts/{appId}/projectSources/{projectId}/{sourceId}/{safeFileName}` (Firestore 네임스페이스와 동일, sourceId로 충돌 방지, 파일명 sanitize).
- `downloadUrl`은 토큰 URL(규칙 우회 공개 접근 가능)이라 **Firestore에 저장하지 않음** — `storagePath`만 저장, 표시/다운로드는 후속 단계에서 인증 컨텍스트로 `getDownloadURL` 처리.

**Storage 보안 규칙 (Firestore Rules와 별개 파일·별개 게시)**:
- 레포에 [`storage.rules`](../../storage.rules) 추가. 단계 A 수준: read=로그인, write=로그인+10MB 미만+허용 contentType, delete=로그인.
- **⚠️ 콘솔에서 (1) Firebase Storage 활성화(기본 버킷 생성) + (2) `storage.rules` 게시(Storage > Rules)가 필요**하다. 미활성 시 업로드 요청이 버킷 없음으로 `net::ERR_FAILED`(OPTIONS 404)되어 실패한다. Storage 미연결/실패 시 UI는 `maxUploadRetryTime`(20s) 후 graceful 실패(status `failed`)로 표시.
- Storage Rules는 Firestore를 참조할 수 없어 멤버십 검증은 경로/auth 기반만. 멤버십 강화는 후속(서버 매개 발급 등).

**보안**: 파일 크기/확장자/MIME 화이트리스트, 바이러스 스캔(선택), 분석은 서버에서만. 키/시크릿은 서버 전용.

## 6. URL 분석 흐름

```
[등록] URL + urlType 입력 → projectSources(type: 'url'|'reference_url'|'prototype_url', status:'pending')
[분석 트리거] (S5) /api/sources/analyze (server, nodejs runtime)
  → status:'analyzing'
  → 서버에서 fetch (allow-list/SSRF 차단/타임아웃/리다이렉트 제한)
  → HTML → 본문/메타(title/description/og)/주요 CTA/가격 섹션 추출
  → (선택) AI 요약 → analysisSummary / analysisResult.references·features
  → status:'analyzed' | 'failed' (로그인 벽·봇 차단·비공개는 'skipped'+사유)
```

**보안 (필수)**: 서버 사이드 fetch만 허용, 사설 IP/localhost/메타데이터 엔드포인트 차단(SSRF), 응답 크기·시간 제한, 사용자 제공 URL을 그대로 신뢰하지 않음. 프로토타입 URL(Gemini/Artifact)은 로그인/세션이 필요할 수 있어 **분석 불가 시 graceful skip**.

## 7. 보강 정보 자동 분해 흐름

분석 결과(파일 `extractedText` + URL `analysisSummary` + 직접 입력 텍스트)를 **요구사항 모드 보강 필드에 자동 분해**한다. (M2의 AI 초안 분해와 동일 메커니즘 재사용, 요구사항 프레이밍.)

| activation 필드 | 요구사항/RFP 모드 매핑 |
|---|---|
| `problem` | 요구사항의 핵심 문제/과제 |
| `customer` | 대상 사용자/이용자(이해관계자) |
| `value` | 요구사항의 목적과 기대 효과 |
| `differentiator` | 기존/경쟁 서비스 대비 차별점 |
| `revenue` | 수익 또는 운영 구조 |
| `market` | 대상 시장/업무 도메인 |
| `mvpScope` | 1차 구현 범위 |
| `laterScope` | 후속 확장 기능 |
| `references` | 등록된 URL/파일 기반 레퍼런스 |

- 사용자는 자동 입력값을 **반드시 수정 가능**(M2 위저드 흐름 유지).
- AI 키 없거나 분석 실패 시 자동 분해는 **graceful skip**, 사용자가 직접 입력(현행 폴백 유지).

### 요구사항/RFP 모드 입력 UX (S2, ProjectActivationWizard 후속)
- **Step 1 요구사항 입력**: 텍스트 + 파일 업로드 영역 + URL 등록 영역. 문구 예: "전달받은 요구사항, RFP, 참고 자료를 등록해주세요. 텍스트만 입력해도 시작할 수 있고, 파일이나 URL을 추가하면 분석 품질이 좋아집니다."
- **Step 2 자료 상태**: 등록된 파일/URL의 상태 배지(등록됨/분석 대기/분석 중/분석 완료/분석 실패/분석 건너뜀) = `ProjectSourceStatus`.
- **Step 3 분석 기반 보강 자동 입력**: 위 매핑으로 보강 필드 채움(수정 가능).
- 아이디어 제품화 모드는 현행 유지(파일/URL 영역은 요구사항 모드 우선).

---

## 8~10. 공유 URL 필요성 (프로젝트 / 문서 / 프로토타입)

현재는 Gemini Canvas 제약 때문에 **접속 코드(= 해시 문자열) 입력 방식**을 쓴다(§0.2). July Canvas 자체 서비스에서는 다음이 필요하다.

- **8. 프로젝트 공유 URL** — 대시보드/ProjectDetail로 바로 진입. 멤버면 편집, 외부는 읽기 전용.
- **9. 문서 공유 URL** — 특정 PRD/기능정의서/UI SPEC으로 바로 진입. 개발자/의사결정권자에게 **문서 단위 전달·리뷰 요청**. (현재 문서 딥링크가 **아예 없음** → 신규 가치 큼.)
- **10. 프로토타입 공유 URL** — 동작 프로토타입(화면)을 바로 열람, 피드백·플로우 확인, 문서와 함께 전달.

링크 형태(택1, §13에서 도입 방식 제안):
- 내부 딥링크: `/projects/{projectId}` · `/projects/{projectId}/documents/{documentId}` · `/projects/{projectId}/screens/{screenId}`
- 퍼블릭 공유: `/share/project/{shareId}` · `/share/document/{shareId}` · `/share/prototype/{shareId}` (또는 `/share/{shareId}` 단일)

---

## 11. 공유 데이터 모델 제안 (`shares`)

```ts
// 제안 — 이번 단계에서 추가하지 않음
export type ShareTargetType = 'project' | 'document' | 'prototype';

export type ShareAccessType =
  | 'private'             // 프로젝트 멤버만 (링크 비활성과 동일 의미)
  | 'project_member'      // owner/editor/viewer 권한 기반
  | 'public_readonly'     // 링크 보유 시 읽기
  | 'public_review'       // 링크 보유 시 댓글/피드백
  | 'password_protected'; // 비밀번호/코드 필요 (먼 후속)

export interface ShareDoc {
  id: string;
  shareId: string;            // 추측 불가 토큰(예: crypto.randomUUID base62, 22+자). 라우팅/노출용
  projectId: string;
  targetType: ShareTargetType;
  targetId?: string;          // document/screen id (project는 생략)

  accessType: ShareAccessType;
  isEnabled: boolean;         // 토글로 즉시 비활성(취소)
  expiresAt?: FirestoreTime;  // 만료(선택)

  allowComments?: boolean;    // public_review 보조
  allowDownload?: boolean;    // 읽기전용에서 export 허용 여부

  createdBy: string;          // uid
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}
```

설계 포인트:
- **`shareId`는 추측 불가 랜덤 토큰**(문서 id를 그대로 URL에 노출하지 않음). 이는 "링크를 아는 사람" 모델의 기본.
- `isEnabled`/`expiresAt`로 **취소·만료** 가능 → 현재 접속 코드 방식엔 없는 핵심 보안 기능.
- 삭제 캐스케이드에 `shares` 포함(프로젝트 삭제 시 공유도 무효화).

---

## 12. 기존 accessCode 방식과의 관계

- **제거하지 않는다.** 현재 접속 코드(= `{type}_{id}` 해시)는 **legacy/fallback**으로 유지(기존 공유 링크가 죽지 않도록).
- 공유 URL(`shares`/`shareId`)은 **새 레이어로 추가**한다. 둘 다 당분간 공존.
- 차이:
  | | 기존 접속 코드 | 신규 공유 URL |
  |---|---|---|
  | 식별자 | `{type}_{id}`(=실제 id 노출) | 불투명 `shareId` |
  | 접근 제어 | 단계 A(로그인이면 read) | accessType별(읽기전용/리뷰/멤버) |
  | 취소/만료 | 불가 | `isEnabled`/`expiresAt` |
  | 대상 | 프로젝트/화면 | 프로젝트/문서/화면 |
- 마이그레이션: 신규 공유는 `shares` 우선, 기존 코드 입장은 그대로 동작.

---

## 13. 라우팅 구조 제안

⚠️ **현행 해시 파서의 `_` 구분자 + `ann`만 인식** 제약(§0.1) 때문에, 중첩 딥링크(`project_{pid}_document_{did}`)는 **현재 파서로 불가**하다. 두 가지 도입 경로:

### 13-A. 단기(현행 해시 유지, 최소 변경) — **권장 1단계**
파서를 깨지 않도록 **평면 토큰**을 추가한다(중첩 대신 전용 view type).
```
#project_{projectId}                      (기존)
#screen_{screenId}[_ann_{annId}]          (기존)
#document_{documentId}                     (신규: 문서 단독 뷰 — projectId는 문서 doc에서 역참조)
#share_{shareId}                           (신규: 공유 진입 — shareId로 share doc 조회 후 대상 라우팅)
```
- `document_{documentId}`: ProjectDocuments를 문서 단독으로 열도록 CanvasApp 뷰 매핑 추가(문서의 `projectId`로 프로젝트 컨텍스트 로드).
- `share_{shareId}`: shareId로 `shares` 조회 → targetType/targetId에 따라 내부 라우트로 위임 + accessType 적용.
- **shareId/documentId에 `_` 금지**(base62 등). 기존 ID 정책과 동일.

### 13-B. 장기(Next App Router 딥링크) — 후속 선택
```
/projects/[projectId]
/projects/[projectId]/documents/[documentId]
/projects/[projectId]/screens/[screenId]
/share/[shareId]
```
- 현재 앱은 `ClientApp`을 `ssr:false` 동적 로드하는 **해시 SPA**(프리렌더 회피). App Router 경로 도입은 **큰 구조 변경**이라 본 확장 범위 밖. 공유 URL은 13-A로 먼저 제공하고, 장기적으로 13-B(서버 라우트 + 공유 메타 SSR/OG)로 이전 검토.
- **권장**: M4는 **13-A로 구현**, 13-B는 별도 마이그레이션 과제로 분리.

---

## 14. 권한 / 보안 주의사항

- **단계 A Rules와 충돌**: 현재 read는 "로그인 사용자"다. `public_readonly`(비로그인/외부 링크 read)는 현 Rules로 강제 불가하고, 통째 구독 모델(§0.2)과도 맞지 않는다. 해결책:
  - **권장: 서버 매개 읽기** — `/api/share/{shareId}` Route Handler가 share 유효성(`isEnabled`/`expiresAt`/`accessType`)을 검증한 뒤 **필요한 문서만** 반환(클라이언트 직접 Firestore 구독 금지). 공개 읽기를 Rules로 여는 것보다 노출 범위가 좁고 안전.
  - 대안(비권장): 공유 대상만 `where(shareEnabled==true)` 같은 좁은 쿼리 + 별도 Rules. 통째 구독 리팩터(단계 B)와 함께여야 함.
- **단계 B Rules와의 정합**: 멤버십 read 강제(단계 B)는 비멤버 read를 막는데, 공유 URL은 "비멤버도 링크로 read"를 허용해야 하므로 **공유 경로는 멤버십 Rules를 우회하는 별도 검증 경로**(서버 매개)로 두는 것이 안전. 단계 B 게시 전 충돌 검토 필수.
- **shareId는 추측 불가 토큰**, URL에 실제 doc id를 노출하지 않음. `isEnabled`/`expiresAt`로 취소·만료.
- **public_review 댓글**: 비로그인 작성자 신원/스팸 처리 정책 필요(서버 매개 + 레이트리밋). viewer 댓글은 기존 `comments` 정책 재사용.
- **파일/URL 보안**: §5(Storage 규칙·크기/MIME 화이트리스트)·§6(SSRF 차단·서버 fetch only). 분석 키는 서버 전용.
- **Firestore Rules는 바로 게시하지 않는다.** 컬렉션(`projectSources`/`shares`) 추가와 함께 별도 단계에서 설계·시뮬레이션 후 게시. **단계 B는 공유 경로 검증 전 게시 금지.**
- 삭제 캐스케이드에 `projectSources`/`shares` 포함(+ Storage 파일 정리). KAKE·`.env.local` 불변.

---

## 15. 구현 로드맵 (S1~S8)

| 단계 | 내용 | 데이터/위험 |
|---|---|---|
| **S1** | **입력 소스/공유 구조 설계 문서 (본 문서)** | 없음 |
| **S2 ✅** | **요구사항/RFP 모드 UI에 파일/URL 등록 영역 추가(메타만 저장, 목록/삭제, 분석 X)** | `projectSources` 신설 + `ProjectSource` 타입 + `lib/projectSources.ts` + 캐스케이드 + 위저드 UI. **`firestore.rules`에 단계 A `projectSources` 규칙 추가(콘솔 게시 필요)** |
| **S3 ✅(코드)·⏸ 보류** | **파일 Firebase Storage 업로드(검증→업로드→`storagePath` 저장, 삭제/캐스케이드 Storage 연동, 10MB·MIME 제한)** | `lib/firebase.ts` storage 초기화 + 업로드/검증 헬퍼 + `storage.rules` 신규. **⏸ Firebase Storage가 Blaze 업그레이드 필요 → 라이브 보류**(코드/규칙 유지, 업그레이드 후 재개). 미활성 시 업로드 net::ERR_FAILED → 20s 후 graceful 실패 |
| **S4-Drive** | **Google Drive 보조 입력 소스 연결**(Storage 대체 아님, 외부 참조). 링크 등록(안 A, 스키마 무변경)→분석→Picker(`drive.file`)→Storage 재개. 설계: [`GOOGLE_DRIVE_SOURCE_INPUT_PLAN.md`](GOOGLE_DRIVE_SOURCE_INPUT_PLAN.md) | OAuth scope(Picker 시) |
| S4 | URL 등록·메타 저장(urlType 구분, status:'pending') | `projectSources` |
| S5 | 파일/URL 분석 API 설계·구현(텍스트 추출·서버 fetch·SSRF 차단·실패 처리·`analysisResult`) | API route/worker, 키 서버전용 |
| S6 | 요구사항 보강 필드 자동 분해(분석 → activation fields, 수정 가능) | M2 AI 분해 재사용 |
| **S7-1 ✅** | **내부 공유 딥링크**(로그인 멤버 전용): `#project_{id}` / `#project_{id}_documents` / `#project_{id}_document_{docId}` / `#screen_{id}`(기존 재사용). ShareModal에 바로가기 링크 옵션(프로젝트/문서/현재 문서/프로토타입) + 복사. `lib/shareLinks.ts` 신규. **accessCode/hash·Rules 무변경**(`feat: add internal share deep links`) | 라우팅 파서 확장(무위험) |
| S7-2 | public 공유(`shares`·`shareId` 랜덤 토큰·public_readonly/review·만료·비활성·서버 매개 `/api/share/{shareId}`·비로그인) | `shares` 신설, route, Rules |
| S8 | 권한/Rules 정리(public_readonly/project_member, 리뷰어 댓글, 단계 B 충돌 검토) | Rules 설계·게시(주의) |

각 단계는 **독립 커밋 + 검증(tsc/eslint/build + 라이브) + KAKE 무손상 + graceful skip**(키/Storage/분석 없어도 기존 흐름 유지) 원칙을 따른다.

---

## 부록. 변경 금지 / 주의 (본 단계)

- 코드 수정 금지 · 컬렉션 추가 금지 · Storage 구현 금지 · 파일 파싱 금지 · URL 크롤링 금지 · 공유 route 구현 금지 · Firestore Rules 변경 금지 · ProjectActivationWizard/ShareModal 수정 금지 · AI API/QA/알림·이메일 구현 금지.
- `activation` 구조 유지(소스는 `projectSources`로 분리). 기존 accessCode 방식 제거 금지(legacy 유지). KAKE·`.env.local` 불변.
