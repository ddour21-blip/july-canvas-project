// 개발 계획(development_plan) 문서 생성기 — Pipeline v2 (Task → Step 실행 포맷).
// 코딩 에이전트/개발자가 Task 단위로 실행할 수 있도록 Steps / Files / Interfaces / Verification 구조로 작성.
// 시그니처 불변( (project, docs, generatedAt) => string ). 기존 저장 문서는 영향 없음(재생성 시에만 갱신).
// AI 호출 없음(템플릿 기반). 민감정보/시크릿은 문서에 적지 않는다. placeholder 표시는 최소화한다.
import type { Project, ProjectActivation, ProjectDocument, DocumentType } from '@/types';

const f = (v: string | undefined, fallbackInstruction: string): string =>
  v && v.trim() ? v.trim() : fallbackInstruction;

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

/** 개발 계획 문서(MVP, Task → Step 실행 포맷). */
export const buildDevelopmentPlan = (
  project: Project,
  docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const upstream = [
    has(docs, 'feature_spec') ? '기능정의서' : null,
    has(docs, 'service_structure') ? '서비스 구조 설계' : null,
    has(docs, 'prd') ? 'PRD' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `# 개발 계획

> ${project.name} · 생성 ${generatedAt} · 참고: ${upstream || '상위 문서 미작성(가정으로 보완)'}
> 일정표가 아니라 **Task 단위 실행 계획**입니다. 각 Task는 Steps / Files / Interfaces / Verification 으로 구성합니다.

## 1. MVP 구현 목표
- 만들 것: ${f(a.mvpScope, '이번 MVP에서 구현할 핵심 범위를 한두 문장으로 적으세요.')}
- 만들지 않을 것: ${f(a.laterScope, '이번 범위에서 제외하고 후속으로 미룰 것을 적으세요.')}

## 2. 구현 우선순위
- P0 (출시 차단 필수): ${f(a.mvpScope, '없으면 동작이 성립하지 않는 기능을 적으세요.')}
- P1 (출시 직후 보완): 핵심 흐름을 보강하는 항목을 적으세요.
- P2 (후속/선택): ${f(a.laterScope, '여유가 될 때 진행할 항목을 적으세요.')}

## 3. 작업 단위 (Task)
> 아래는 작성 형식 예시입니다. 기능정의서/서비스 구조 설계를 기준으로 Task를 추가·수정하세요.

### Task 1. 데이터 모델 / 타입 정의 (P0)
- 목적: 핵심 객체의 타입과 저장 구조를 먼저 확정해 이후 작업의 기준을 만든다.
- Steps:
  1. 확인 기준 정의 — 어떤 필드/관계가 있어야 하는지 합의
  2. 최소 구현 — 타입/모델 정의(저장 금지 값 제외)
  3. 검증 — 타입체크 통과, 관련 화면/참조에서 사용 가능
- Files:
  - types/ (도메인 타입), 데이터 접근 모듈
- Interfaces:
  - 핵심 entity 타입, 생성/조회 함수 시그니처
- Verification:
  - 명령어: npx tsc --noEmit
  - 합격 기준: 타입 오류 0, 모델이 화면/요구사항과 일치(참조 가능)

### Task 2. 핵심 API / 서버 동작 (P0)
- 목적: 핵심 사용자 액션을 처리하는 서버 경로를 구현한다.
- Steps:
  1. 확인 기준 정의 — 입력/출력/권한 명세
  2. 최소 구현 — 엔드포인트 + 권한 가드
  3. 검증 — 정상/예외/권한 케이스 확인
- Files:
  - app/api/ 또는 서버 모듈, 권한/검증 유틸
- Interfaces:
  - method · path · 입력 · 출력 · 권한
- Verification:
  - 명령어: npm run build
  - 합격 기준: 핵심 시나리오 통과, 권한 우회 없음

### Task 3. 핵심 화면 / 컴포넌트 (P1)
- 목적: 핵심 흐름을 사용자에게 노출한다.
- Steps:
  1. 확인 기준 정의 — 화면별 상태(빈/로딩/오류) 정의
  2. 최소 구현 — 화면/컴포넌트 + 상태 처리
  3. 검증 — 데스크톱/모바일 동작 확인
- Files:
  - components/ (화면·컴포넌트)
- Interfaces:
  - 컴포넌트 props, 상태 모델
- Verification:
  - 명령어: npm run build
  - 합격 기준: 핵심 시나리오 화면 정상, 콘솔 오류 없음

## 4. 개발 규칙
- 기존 기능 보존(회귀 금지)
- unrelated refactor 금지
- 민감정보(API 키·토큰·개인정보) 출력·커밋 금지 / 환경변수 값 마스킹
- 작은 단위로 변경(리뷰 가능 단위)

## 5. QA 연결
- 각 Task의 Verification 항목을 QA 기준(qa_criteria) 문서의 테스트 기준으로 연결하세요.
- 핵심 사용자 시나리오 · 권한/상태 · 예외 케이스를 반드시 포함하세요.

## 6. 완료 기준
- 기능 완료: P0 Task 전부 동작 + 핵심 시나리오 통과
- 문서 완료: 개발 계획/QA 기준 작성·검토
- 검증 완료: tsc / build 통과, 핵심 흐름 스모크 확인

## 7. 후속 자동화 후보
- GitHub issue/PR 생성, E2E 자동화, 배포 자동화 (이번 MVP 범위 밖 — 안내만, 자동 실행 금지)
`;
};
