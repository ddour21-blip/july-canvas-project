// 개발 계획(development_plan) 문서 생성기 — Pipeline MVP (Superpowers-like 실행 계획).
// 단순 일정표가 아니라, 코딩 에이전트/개발자가 "작업 순서"를 이해할 수 있는 실행 문서다.
// 구현 순서 · 작업 단위 · 예상 수정 영역 · 데이터 모델 · API 후보 · 검증 · 완료 기준 포함.
// AI 호출 없음(템플릿 기반). 외부 의존 없음. 민감정보/시크릿은 문서에 적지 않는다.
import type { Project, ProjectActivation, ProjectDocument, DocumentType } from '@/types';

const f = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

const HINT = '확인 필요 — 기능정의서/서비스 구조 설계를 참고해 보완하세요.';

/** 개발 계획 문서(MVP, 실행 계획 중심). */
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
> 이 문서는 일정표가 아니라 **작업 순서·단위·검증 기준**을 담은 실행 계획입니다(코딩 에이전트가 그대로 따를 수 있는 수준).

## 1. MVP 구현 목표
- 이번 개발에서 만들 것: ${f(a.mvpScope, 'MVP 핵심 범위를 정리하세요.')}
- 만들지 않을 것(제외): ${f(a.laterScope, '이번 범위에서 제외할 것을 명시하세요.')}

## 2. 구현 우선순위
- P0 (필수, 출시 차단): ${f(a.mvpScope, HINT)}
- P1 (중요, 출시 직후): _(${HINT})_
- P2 (후속): ${f(a.laterScope, HINT)}

## 3. 작업 단계 (순서 고정)
1. 타입 / 모델 정의
2. 데이터 / 상태 구조
3. API / 서버
4. UI (화면·컴포넌트)
5. 권한 / 보안
6. QA
7. 배포 준비

## 4. 예상 수정 영역
| 작업 | 예상 파일/디렉터리 | 목적 | 리스크 |
| --- | --- | --- | --- |
| 타입/모델 | types/ | 데이터 구조 정의 | 광범위 영향 |
| API | app/api/... | 서버 동작 | 권한/검증 |
| UI | components/ | 화면 구현 | 회귀 |
| 권한 | 서버 규칙/가드 | 접근 제어 | 보안 |
_(프로젝트 구조에 맞게 행을 수정하세요. ${HINT})_

## 5. 데이터 모델 초안
- 주요 entity / 필드 후보 / 관계를 정리하세요(서비스 구조 설계의 데이터 객체 참고).
- 저장하지 말아야 할 값: 비밀번호 평문, API 키/토큰, 민감 개인정보 원문. _(${HINT})_

## 6. API 후보
| method | path | 목적 | 입력 | 출력 | 권한 |
| --- | --- | --- | --- | --- | --- |
| POST | /api/... | 생성 | {…} | {id} | editor+ |
| GET | /api/... | 조회 | query | {…} | member |
_(행을 프로젝트에 맞게 추가/수정하세요. ${HINT})_

## 7. 개발 규칙
- 기존 기능 보존(회귀 금지)
- unrelated refactor 금지
- 민감정보 출력 금지 / 환경변수 값 마스킹
- 작은 단위로 변경(리뷰 가능 단위)
- 변경 후 \`npx tsc --noEmit\` + \`npm run build\` 검증

## 8. QA 연결
- 이 계획에서 반드시 검증할 항목(핵심 시나리오·권한·예외)을 정리하세요.
- 위 항목을 **QA 기준(qa_criteria)** 문서의 테스트 기준으로 넘깁니다. _(${HINT})_

## 9. 완료 기준
- 기능 완료: P0 기능 동작 + 핵심 시나리오 통과
- 문서 완료: 개발 계획/QA 기준 작성·검토
- 검증 완료: tsc/build 통과, 핵심 흐름 스모크 확인

## 10. 후속 자동화 후보
- GitHub issue 생성
- PR 생성
- E2E 자동화
- 배포 자동화
_(이번 MVP 범위 밖 — 안내만. 자동 실행 금지.)_
`;
};
