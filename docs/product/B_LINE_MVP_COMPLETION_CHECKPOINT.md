# July Canvas — B 라인 1차 MVP 핵심 파이프라인 완료 체크포인트

작성: B9(개발 전달 패키지 MD/ZIP 다운로드, `5a3ae1c`) 완료 직후. **체크포인트 문서이며 코드 변경 없음.**
선행 문서: [`PROJECT_MODE_STRATEGY.md`](PROJECT_MODE_STRATEGY.md) · [`SOURCE_INPUT_AND_SHARE_URL_PLAN.md`](SOURCE_INPUT_AND_SHARE_URL_PLAN.md) · [`GOOGLE_DRIVE_SOURCE_INPUT_PLAN.md`](GOOGLE_DRIVE_SOURCE_INPUT_PLAN.md)

B1~B9로 July Canvas의 **핵심 제품 흐름**(아이디어/요구사항 → 확정 프로토타입 → 역작성 문서 → 개발 전달 패키지)이 완성되었다. 본 문서는 그 완료 범위·정책·회귀 기준을 고정한다.

---

## 0. 핵심 파이프라인 (한눈에)

```
아이디어/요구사항 입력 → 모드 선택 → 초기 문서 3종 생성
→ 프로토타입 제작 패키지 생성(Gemini Canvas 프롬프트)
→ 프로토타입 URL/코드 등록 → 기준 프로토타입 확정(lock)
→ IA 역작성 → 기능정의서 역작성
→ 개발 전달 패키지 생성 → MD/ZIP 다운로드
```

---

## 1. 완료 범위 요약 (B1~B9)

| 단계 | 내용 | 커밋 | 핵심 산출/파일 |
|---|---|---|---|
| **M2** | 프로젝트 모드 선택(아이디어/요구사항) | `d029f64` | `activation.mode`, ProjectActivationWizard |
| **B1** | 모드별 초기 문서 템플릿 고도화 | `64d2c62` | `lib/documents.ts` (brief/market/strategy, 모드별 구조) |
| **B2** | 프로토타입 제작 패키지 생성(Gemini Canvas 프롬프트) | `68981ad` | `lib/prototypePrompt.ts` (로컬 생성/복사) |
| **B3** | 프로토타입 URL/코드 등록 | `81eda0d` | `lib/prototypes.ts` (URL→projectSources, 코드→screens) |
| **B4** | 프로토타입 확정/lock | `c30298f` | `Project.prototypeLock`, lock/unlock |
| **B5** | 확정 프로토타입 기반 IA 역작성 | `a2bb7d9` | `lib/informationArchitecture.ts` → `documents.ia` |
| **B6** | 확정 프로토타입 + IA 기반 기능정의서 역작성 | `f1ce8c6` | `lib/featureSpec.ts` → `documents.feature_spec` |
| **B7/B8** | 개발 전달 패키지(MD 4종) 생성 | `3d9e52f` | `lib/handoffPackage.ts` (로컬 생성/복사) |
| **B9** | 개발 전달 패키지 MD/ZIP 다운로드 | `5a3ae1c` | `lib/exportHandoffPackage.ts` (Blob/jszip) |

> 참고: B-라인 이전에 S1~S4(입력 소스 설계/메타 등록/Storage 코드·보류/Drive 링크), S7-1(내부 공유 딥링크)도 완료. 본 체크포인트는 B-라인 핵심 파이프라인에 집중한다.

---

## 2. 현재 사용자가 할 수 있는 실제 업무 흐름

1. 프로젝트를 생성한다.
2. 활성화 위저드에서 **아이디어 제품화** 또는 **요구사항/RFP 기반 기획** 모드를 선택한다.
3. 아이디어/요구사항을 입력한다(요구사항 모드에선 라벨·문구가 달라짐).
4. 필요 시 요구사항 모드에서 **파일 메타 / URL / Google Drive 공유 링크**를 등록한다.
5. 활성화하면 **초기 문서 3종**(브리프/시장조사(레퍼런스)/제품화(구현)전략)이 생성된다.
6. 문서 화면에서 **프로토타입 제작 패키지**를 생성해 Gemini Canvas 등에 붙여넣을 프롬프트를 복사한다.
7. 생성된 **프로토타입 URL 또는 코드(HTML/React)** 를 July Canvas에 등록한다(코드는 ScreenEditor에서 미리보기).
8. 등록 목록에서 **기준 프로토타입을 확정(lock)** 한다.
9. **확정 프로토타입 기반 IA**를 생성한다(없으면 생성, 있으면 confirm 후 갱신).
10. **확정 프로토타입 + IA 기반 기능정의서**를 생성한다(IA 선행 필수).
11. **개발 전달 패키지**(DEVELOPMENT_HANDOFF / PRD / USER_APP_UI_SPEC / ADMIN_UI_SPEC)를 생성한다.
12. 각 문서를 **복사 / MD 다운로드 / ZIP 다운로드**해 개발자에게 전달한다.

---

## 3. 핵심 정책 고정

- **IA는 아이디어만으로 생성하지 않는다.** IA는 **확정 프로토타입(`prototypeLock`)을 기준으로 역작성**한다.
- **기능정의서는 IA와 확정 프로토타입을 기준으로 역작성**한다(IA 선행 필수).
- 초기엔 brief/market_research/product_strategy 3종만 생성하고 **ia/feature_spec/prd는 미작성 상태**로 둔다.
- **개발 전달 패키지는 Firestore에 저장하지 않는다.** local state로 생성 → 복사 / MD·ZIP 다운로드(순수 클라이언트).
- **기존 PRD 조립 로직(`generatePRD`)은 유지**한다(B7/B8/B9에서 변경하지 않음). 패키지의 PRD.md는 별도 조립본.
- **Firebase Storage는 Blaze 업그레이드 전까지 라이브 검증 보류** 상태다(S3 코드/`storage.rules`는 유지, 미활성 시 업로드는 20s 후 graceful 실패).
- **Google Drive는 앱 저장소가 아니라 외부 입력 소스/참조**로만 사용한다(링크 등록, 분석은 후속).
- 모든 AI/분석/외부 연동은 **추가 레이어**다. 키/연결이 없어도 기존 흐름이 동작한다(현재 B-라인은 AI 없이 템플릿/정적 분석 기반).

---

## 4. 데이터 구조 요약

```
Project.activation.mode        : 'idea_productization' | 'requirement_planning' | 'legacy'
Project.prototypeLock          : { targetType:'screen'|'source', targetId, title?, url?, lockedAt, lockedBy } | null
documents (컬렉션)             : type = brief | market_research | product_strategy | ia | feature_spec | prd
screens (컬렉션)               : 프로토타입 코드/HTML (code), 정책 주석(annotations)
projectSources (컬렉션)        : type = text|file|screenshot|url|reference_url|prototype_url
                                 (파일 메타, URL, Drive 링크, 프로토타입 URL + 선택적 prototypeKind)
handoffPackage                 : Firestore 저장 없음 — local state 생성(MD 4종) → 복사/MD/ZIP
```

> DocumentType 6종·컬렉션은 B-라인에서 **추가하지 않았다**(요구사항 모드는 brief/market/strategy 슬롯 재라벨, 프로토타입 등록은 screens/projectSources 재사용).

---

## 5. 생성 / 저장 정책 (산출물별 위치)

| 산출물 | 저장 위치 |
|---|---|
| 초기 문서 3종(브리프/시장조사·레퍼런스/제품화·구현전략) | `documents` (brief/market_research/product_strategy) |
| IA | `documents.ia` (status draft, 재생성 시 confirm + version +0.1) |
| 기능정의서 | `documents.feature_spec` (status draft, 재생성 시 confirm) |
| 프로토타입 코드/HTML | `screens` (기존 ScreenEditor 렌더, `#screen_{id}` 딥링크) |
| 프로토타입 URL | `projectSources` (type `prototype_url`, urlType `prototype`) |
| 확정 프로토타입(lock) | `Project.prototypeLock` (optional field) |
| 프로토타입 제작 패키지 | **저장 안 함** — local state → 복사 |
| 개발 전달 패키지(MD 4종) | **저장 안 함** — local state → 복사 / MD·ZIP 다운로드 |

---

## 6. 절대 깨지면 안 되는 회귀 기준

- 프로젝트 모드 선택(아이디어/요구사항) + 모드별 문구/문서 제목
- 초기 문서 3종 생성(두 모드, IA/feature_spec/prd 미작성 유지)
- 파일 메타 / URL / Drive 링크 등록(요구사항 모드, 목록/삭제)
- 프로토타입 제작 패키지 생성/복사
- 프로토타입 URL/코드 등록 + 등록 목록 + 열기/복사/삭제
- 프로토타입 확정/해제(lock/unlock), 확정 대상 삭제 시 lock orphan 방지(자동 해제)
- IA 생성/재생성(확정 프로토타입 기준, confirm)
- 기능정의서 생성/재생성(IA 선행 필수, confirm)
- 개발 전달 패키지 생성(선행 문서 일부 없어도 fallback 생성)
- MD 다운로드 / ZIP 다운로드(한글 파일명·UTF-8·내용 일치)
- 문서 편집/저장/승인(PRD 승인 잠금 가드 포함)
- 내부 딥링크(`#project_{id}` / `#project_{id}_documents` / `#project_{id}_document_{docId}` / `#screen_{id}`)
- 기존 PRD 조립(`generatePRD`) 동작
- owner/editor/viewer 권한 게이팅, **permission-denied 0**
- **KAKE 프로젝트(`projects/8DH3maHooF9WkhnZO81c`) 무손상**

검증 명령(코드 변경 시): `npx tsc --noEmit` / `npx eslint .` / `npm run build`. 라이브 검증은 임시 프로젝트 생성 → 흐름 확인 → 캐스케이드 삭제(KAKE 무손상) 패턴.

---

## 7. 다음 후보 기능 우선순위

| 우선 | 후보 | 목적(한 줄) |
|---|---|---|
| 1 | **S7-2 public share** | 비로그인/외부 리뷰어가 링크로 프로젝트·문서·프로토타입을 읽기 전용 열람(서버 매개) |
| 2 | **S5/S6 파일·URL 분석 + 보강 자동 분해** | 등록된 파일/URL을 분석해 요구사항 보강 필드/문서 초안을 자동 채움 |
| 3 | **D2 Drive 링크 분석** | 공개 Google Drive 링크의 문서를 분석 입력으로 활용(비공개는 skip) |
| 4 | **QA Automation 연결** | 기능정의서/프로토타입을 QA 시나리오로 변환·검증, 결과를 프로젝트에 리포트 |
| 5 | **알림/이메일** | 멘션/승인/생성 이벤트 알림(notifications + Resend) |
| 6 | **Firebase Storage 라이브 재개** | Blaze 업그레이드 후 파일 원본 업로드 저장소 활성화(S3 코드 재개) |

---

## 8. 다음 작업 시 주의 사항

- **기존 B-라인 흐름을 깨지 말 것**(위 §6 회귀 기준 유지).
- **DocumentType 추가는 신중히** — 가능하면 기존 6종 + 슬롯 재사용으로 해결.
- **Firestore Rules 변경은 별도 단계로 분리** — 신규 컬렉션 추가 시 단계 A 규칙을 함께 설계·콘솔 게시(단계 B 멤버십 read는 쿼리 리팩터 전 게시 금지). Claude는 콘솔 게시 불가 → 규칙 파일 갱신 후 사용자 게시 필요.
- **public share는 서버 매개 읽기 구조 검토 후 진행** — 단계 A read=signedIn과 충돌하므로 `/api/share/{shareId}` 검증 경로 권장(클라 직접 구독으로 공개 read 열지 말 것).
- **URL/Drive 분석은 fetch/보안/권한/비공개 링크 정책을 먼저 정리** — 서버 사이드 fetch, SSRF 차단, 비공개는 skip, OAuth 토큰 Firestore 저장 금지.
- **Storage 코드(S3)·`storage.rules`를 삭제하지 말 것**(Blaze 후 재개).
- `.env.local`·키 커밋 금지. **KAKE 삭제 금지.**

---

## 부록. 본 단계 변경 금지 (체크포인트 문서화)

- 기능 추가/UI 변경/Firestore Rules 변경/새 컬렉션·DocumentType 추가/AI·public share·URL·Drive 분석/QA·알림/Storage 재작업 없음. **문서 1개만 추가.**
