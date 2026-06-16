# July Canvas — 핵심 UX / 기능 흐름 재검토 + 확장 계획 (2차-FLOW)

작성: 디자인 라운드(UI-0~UI-7+FINAL) 종료 직후. **분석/제안 문서이며 코드 변경 없음.**
대상 커밋 기준: `0c4339e`.

---

## 1. 현재 기능 흐름 요약 (코드 기준)

```
[Dashboard] 새 프로젝트 생성 (status: draft, ownerId/roleByUid/memberUids/projectMembers 세팅)
   ↓ 입장
[ProjectDetail] '활성화 시작하기'
   ↓
[ProjectActivationWizard] 3스텝 · 10필드 입력 (필수 6 / 선택 4)
   ↓ '활성화 완료'
   ├─ projects.update(status: 'active', activation: {...10필드})
   └─ documents 3종 자동 생성: brief / market_research / product_strategy
        → 실제로는 입력 필드를 **마크다운 템플릿에 문자열 보간**한 결과 (lib/documents.ts)
   ↓
[ProjectDocuments] 마스터-디테일
   ├─ brief/market/strategy: 생성됨(template), 사용자가 편집
   ├─ IA / feature_spec: '생성' 클릭 시 빈 템플릿(`# 제목\n_(내용을 입력하세요)_`)으로 생성 → 수동 작성
   └─ PRD: generatePRD()로 activation + IA + feature_spec 본문을 조립 → owner 승인 시 lock + 프로토타입 URL 주입 + project.status='approved'
   ↓
[ScreenEditor] 프로토타입 = 사용자가 붙여넣은 HTML 코드를 iframe 렌더
   ├─ 주석(정책) 캔버스 마킹 + 버전 히스토리
   └─ comments 컬렉션(멘션 → mockEmails 앱내 시뮬레이션)
   ↓
[Export] MD / PDF / PPTX 다운로드, 공유 링크/접속 코드
```

**핵심 사실**: 현재 파이프라인에 **AI가 전혀 없다**. "자동 생성"은 `lib/documents.ts`의 `generateBrief/MarketResearch/ProductStrategy`가 사용자가 직접 친 필드를 템플릿에 끼워 넣는 것이고, IA/기능정의서는 빈 문서, PRD는 그 결과물들의 단순 조립이다. 즉 현재 July Canvas는 **구조화된 폼 → 템플릿 문서 생성기**다.

데이터 측면:
- 문서는 `documents` 컬렉션에 **자유 마크다운 `content` 문자열**로 저장 → AI 생성 결과를 넣어도 **스키마 변경 불필요**.
- 레퍼런스는 `activation.references` **단일 자유 텍스트** 하나뿐. 파일/URL/이미지 업로드 개념 없음(단, `screen_images`는 프로토타입 캡처를 base64로 Firestore에 저장하는 선례 존재).
- `types/index.ts`에 **이미 예약된 확장 모델**: `OutputType`(`prd_md|pptx|ia_md|feature_spec_md|prototype_url`), `ProjectOutput`/`outputs` 컬렉션, `Organization`/`organizations`. → 산출물/QA 리포트 확장의 발판이 이미 있음.

---

## 2. 문제점

1. **폼 작성 도구처럼 느껴짐** — 활성화 전에 10개 필드(필수 6)를 사람이 다 채워야 함. 아이디어 단계 사용자에게 진입 장벽이 큼.
2. **AI가 해줘야 할 일을 사람이 함** — 브리프/시장조사/제품전략은 본래 "초안을 AI가 만들고 사람이 검수"할 영역인데, 지금은 사람이 입력한 걸 템플릿에 끼우기만 함. 시장조사는 외부 지식이 필요한데 입력 필드 재배열에 불과.
3. **IA/기능정의서는 사실상 빈 문서** — 자동화 가치가 0. 사용자가 백지에서 작성.
4. **활성화(draft→active) 전환이 무겁다** — 6개 필수 입력을 통과해야 active. "일단 시작" 경험이 없음.
5. **레퍼런스 수집이 빈약** — URL/파일/기존 문서/이미지를 못 넣음. AI 초안의 품질을 좌우할 입력이 텍스트 한 칸.
6. **프로토타입이 수동 HTML 붙여넣기** — 별도 도구에서 만든 HTML을 가져와야 함(이번 재검토 범위 밖이지만 흐름상 단절 지점).
7. **검증(QA) 단계 부재** — PRD/기능정의서가 "그래서 구현물이 스펙대로인가?"를 확인하는 루프로 이어지지 않음. 사용자가 원하는 QA Automation 연결의 빈자리.

---

## 3. ProjectActivationWizard 개선 방향

**원칙: "입력 폼"에서 "아이디어 → AI 초안 → 검수"로 무게중심 이동.**

- **필수 입력 대폭 축소**: 활성화의 단일 필수는 **자유 서술형 아이디어 1칸**(서비스/문제/원하는 것)으로. 나머지 9필드는 "선택/보강용"으로 강등하거나 AI가 초안에서 채우고 사용자가 검수.
- **레퍼런스 입력 강화**: URL 여러 개 + 파일/이미지 + 기존 문서 붙여넣기. (1단계는 텍스트+URL만으로도 충분, 파일 업로드는 후속.)
- **AI 초안 우선**: 입력 즉시 AI가 brief/market/strategy(+가능하면 IA/feature_spec) **초안 생성** → 사용자는 빈칸을 채우는 게 아니라 **초안을 고친다**.
- **부족 정보만 역질문**: AI가 초안 생성 후 "수익 모델이 불명확합니다. 한 줄로 알려주세요" 같은 **클arifying questions만** 노출(현재의 전 필드 강제 입력 대체).
- **활성화 경량화**: 아이디어 한 줄 + (선택)레퍼런스만으로 active 전환 가능. 문서는 "초안 생성됨(draft 상태)" → 검수/승인 단계로 분리.
- **기존 10필드는 폐기하지 않고 "구조화된 보강 입력"으로 유지**(AI 프롬프트 컨텍스트 + 수동 보정용). 즉 `ProjectActivation` 타입은 그대로 두되 **필수성만 완화**.

---

## 4. AI 초안 생성형 플로우 제안

```
1) [아이디어 입력] 사용자가 만들고 싶은 서비스/아이디어를 자유롭게 서술 (필수 1칸)
2) [레퍼런스 추가] 참고 URL / 파일 / 이미지 / 기존 문서 텍스트 (선택, 다중)
3) [AI 초안 생성] 서버 Route Handler(app/api/generate)가 최신 Claude 모델 호출
      → brief / market_research / product_strategy (+ 가능 시 IA / feature_spec) 초안 markdown 생성
      → documents 컬렉션에 status:'draft', source 표시하여 저장 (스키마 변경 없음, content만 AI가 채움)
4) [클arifying] AI가 부족하다고 판단한 항목만 질문 → 사용자가 답 → 해당 문서 부분 보강
5) [검토/수정] 기존 ProjectDocuments 에디터에서 그대로 검수/편집 (이미 구현됨)
6) [승인 → active] (경량) 아이디어 입력 시점에 active 가능 / PRD 승인은 기존 owner-only 잠금 유지
7) [문서 6종] AI 초안 + 수동 보강으로 완성, PRD 자동 조립(기존 generatePRD 유지·확장)
8) [프로토타입/QA로 연결] PRD/기능정의서 → ScreenEditor 프로토타입 + QA Automation 리포트
```

**기술 형태 (Resend graceful-skip 패턴과 동일 철학)**:
- `app/api/generate` Route Handler + Anthropic SDK(`@anthropic-ai/sdk`), **서버 전용 `ANTHROPIC_API_KEY`**(커밋/노출 금지).
- **키 없으면 graceful skip → 현재 템플릿 생성(`buildActivationDocuments`)으로 폴백**. 즉 AI는 "있으면 더 좋은" 레이어로 얹고, 기존 동작은 항상 유지.
- 생성 함수를 **추상화**: `generateDocuments(input): {type, content}[]` 인터페이스 뒤에 `ai` 구현과 `template` 구현. ProjectDocuments/Wizard는 인터페이스만 소비.
- 클라이언트가 `/api/generate` 호출 → 응답(markdown)을 **클라이언트가 기존 규칙대로 `documents`에 write** → Firestore Rules 우회 없음(서버 admin write 지양). 권한/Rules 영향 최소.
- 모델: 최신 Claude(예: Sonnet/Opus 계열) — 실제 ID·파라미터는 구현 시 `claude-api` 스킬/공식 문서로 확정.

---

## 5. 유지해야 할 기존 구조 (변경 금지/최소)

- `documents` 6종 구조 + `DOCUMENT_META`/`DOCUMENT_ORDER` (AI는 content만 채움)
- `draft → active → approved` 상태 머신 (전환 **조건만** 경량화, 상태값 유지)
- `generatePRD` PRD 자동 조립 + `injectPrototypeUrl` + owner 승인 잠금 정책
- ProjectDocuments 마스터-디테일 에디터, ScreenEditor 프로토타입/주석/버전
- `comments` 컬렉션 분리(viewer 작성 가능) + 레거시 마이그레이션
- owner/editor/viewer 권한 + 게시된 단계 A Firestore Rules
- export(MD/PDF/PPTX), 공유 링크/접속 코드
- 예약된 `outputs`/`organizations` 모델 (QA 확장의 토대로 활용)

## 6. 변경이 필요한 구조

| 항목 | 현재 | 변경 방향 | 데이터 영향 |
|---|---|---|---|
| 활성화 입력 | 10필드 강제(필수 6) | 자유 아이디어 1칸 필수 + 나머지 보강 | `ProjectActivation` 유지, **필수성만 완화**(코드 레벨) |
| 문서 초안 | 템플릿 보간 | AI 생성(폴백=템플릿) | `documents.content`만 채움, **스키마 무변경**. (선택) `source: 'ai'\|'template'\|'manual'` 메타 추가 |
| IA/기능정의서 | 빈 문서 | AI 초안 포함 | 무변경 |
| 레퍼런스 | 텍스트 1칸 | URL 다중 + 파일/이미지 | (후속) `references` 구조 확장 or 신규 `projectReferences` |
| 활성화 타이밍 | 폼 완료 후 | 아이디어 입력 직후 active 가능 | 상태 전환 조건만 |
| 검증(QA) | 없음 | QA 리포트 문서/산출물 | (신규) `QA_REPORT` 타입 또는 `outputs` |

---

## 7. QA Automation Dashboard 연결 전략

> QA Automation Dashboard는 이전에 별도로 작업한 프로젝트(본 레포 외부). 아래는 **연결 전략 제안**이며 이번 단계에서 코드 통합하지 않음.

**연결 컨셉**: July Canvas의 PRD/기능정의서 = "기대 스펙" → QA Automation = "실제 구현물 검증" → 결과를 July Canvas 프로젝트에 리포트로 귀속.

1. **스펙 → QA 시나리오 변환**: `feature_spec`/PRD의 기능/정책(그리고 ScreenEditor의 annotation 정책)을 입력으로 받아 QA 시나리오(케이스 목록)를 생성. AI 생성 레이어(§4)를 재사용 가능.
2. **실행 대상**: 프로토타입 URL(공유 링크) 또는 외부 배포 URL. 로그인/회원가입 있는 서비스는 시크릿(테스트 계정)을 QA 측 환경에 보관(July Canvas에 저장 금지).
3. **검증 항목**: 버튼/모달/권한/반응형(이미 우리 UI QA에서 쓰던 축) + 시나리오별 통과/실패.
4. **결과 귀속**: QA 결과를 July Canvas에 **리포트로 저장**.
   - 옵션 A: `DocumentType`에 `qa_report` 추가 → ProjectDocuments에 탭/문서로 표시(에디터·버전·다운로드 재사용). **권장(최소 변경, 기존 UI 재사용)**.
   - 옵션 B: 예약된 `outputs` 컬렉션에 `OutputType: 'qa_report'` 추가 → 산출물 패널.
   - ScreenEditor 화면별 QA는 화면-리포트 링크(스크린별 annotation처럼) 고려.
5. **통합 경계 (별도 앱 vs 내부 모듈)**:
   - **실행 엔진(브라우저 자동화, Playwright 등)은 별도 서비스/워커로 유지** — Next 서버리스에서 헤드리스 브라우저 구동은 부적합.
   - **리포트 뷰/연결은 July Canvas 내부 모듈로 통합** — 인증/프로젝트 컨텍스트/문서 UI를 공유.
   - 연동 방식: July Canvas가 `app/api/qa/run`으로 QA 서비스에 잡 요청 → QA 서비스가 실행 후 콜백/폴링으로 리포트 반환 → July Canvas가 `documents`(qa_report)에 저장. Resend/AI와 동일하게 **키 없으면 비활성(graceful)**.
6. **향후 `QA_REPORT` 문서 타입**: 옵션 A 채택 시 `DocumentType` 확장 + `DOCUMENT_META`에 메타 추가(파이프라인 7번째 단계로). 권한은 기존 게이팅 재사용.

---

## 8. 단계별 구현 로드맵

> 위험도/의존성 순. 각 단계는 독립 커밋 + 검증(tsc/eslint/build + 라이브) + KAKE 무손상 원칙 유지.

**A. 빠른 UX 개선 (데이터 모델 변경 없음, 가장 먼저)**
- A1. Wizard 재구성: **1스텝 "아이디어 자유 입력"(필수)** 전면화, 기존 10필드는 "상세 보강(선택, 접기)"으로 강등. 필수성만 완화(`required` 플래그 조정), 타입·저장 구조 불변.
- A2. 활성화 경량화: 아이디어 한 줄만으로 active + 템플릿 초안 생성(현행 유지). 빈 필드는 "_(미입력)_"로 이미 처리됨.
- A3. 레퍼런스 입력을 멀티라인 + URL 여러 줄 허용(텍스트 레벨, 스키마 무변경).

**B. AI 초안 생성 준비 (서버/추상화 — 데이터 스키마 거의 무변경)**
- B1. 생성 추상화 인터페이스 도입(`generateDocuments`) + 기존 템플릿을 그 구현으로 이동.
- B2. `app/api/generate` Route Handler + Anthropic SDK + `ANTHROPIC_API_KEY`(서버전용·graceful skip→템플릿 폴백).
- B3. Wizard/Documents가 AI 초안 호출 → 응답을 **클라이언트가 기존 규칙대로** `documents`에 write. (선택) `source` 메타 추가.
- B4. 클arifying questions UI(부족 항목만).

**C. QA Automation 연결 준비**
- C1. `DocumentType`에 `qa_report` 추가(옵션 A) + 메타/탭. (먼저 "수동 업로드 리포트"부터, 실행 엔진 없이도 보관 가능.)
- C2. 스펙→시나리오 변환(AI 레이어 재사용) 초안.
- C3. `app/api/qa/run` 잡 인터페이스(외부 QA 서비스 콜) — 키/엔드포인트 없으면 비활성.
- C4. QA 서비스(별도 레포/서비스)와 콜백 계약 확정.

**D. 알림/이메일 (기존 2차-6, 가장 마지막)**
- `notifications` 컬렉션 + `app/api/notify` + Resend. AI/QA 결과·멘션·승인 이벤트가 쌓인 뒤 알림 가치가 커지므로 **A~C 이후**가 합리적.

---

## 9. 알림/이메일 작업을 언제 진행할지

**보류 → 로드맵 D(맨 마지막)로 재배치.** 근거:
- 현재 멘션 알림은 `mockEmails` 앱내 시뮬레이션으로 이미 동작(기능 공백 아님).
- 알림의 진짜 가치는 "AI 초안 생성 완료/검수 요청/QA 실패" 같은 **이벤트가 생긴 뒤**에 발생. 그 이벤트들을 먼저 만드는 A~C가 선행되어야 함.
- Resend 키/도메인 인증은 외부 선행조건이라 사용자 준비 타이밍과도 분리 가능.

## 10. 리스크와 주의사항

- **키 관리**: `ANTHROPIC_API_KEY`/`RESEND_API_KEY`/QA 서비스 키는 **서버 전용·커밋 금지·미설정 시 graceful skip**. 클라이언트 노출 절대 금지.
- **Firestore Rules 우회 금지**: AI/QA 결과 저장은 가능하면 **클라이언트가 기존 역할 규칙대로 write**. 서버 admin write를 쓰면 단계 A 규칙을 우회하므로 지양(불가피하면 별도 검증).
- **기존 동작 보존**: AI/QA는 항상 **추가 레이어**. 키 없거나 실패 시 현재 템플릿/수동 흐름이 그대로 동작해야 함(회귀 0).
- **데이터 스키마 안정성**: `documents.content`(markdown)에 AI 결과를 담아 **스키마 변경 최소화**. 신규 필드는 optional로만.
- **AI 비용/지연/환각**: 초안은 "draft"로 명시하고 사용자 검수 전제. 시장조사 등 사실 주장은 출처/추정 표기.
- **QA 실행 환경**: 헤드리스 브라우저는 Next 서버리스 부적합 → 별도 서비스. URL 접근성/인증/CORS/봇차단 고려.
- **KAKE/데이터 위생**: 검증은 임시 프로젝트 생성→확인→캐스케이드 삭제 패턴 유지. `mockEmails`/`outputs`/QA 리포트는 cascade 포함 여부 확인 후 orphan 방지.
- **권한 정책 불변**: owner/editor/viewer 정책·게시된 Rules는 유지. 새 문서타입(qa_report)도 기존 게이팅 재사용.
- **단계성**: 한 번에 하나씩(A→B→C→D), 각 단계 독립 검증·커밋.
