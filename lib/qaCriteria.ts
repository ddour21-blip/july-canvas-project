// QA 기준(qa_criteria) 문서 생성기 — Pipeline MVP.
// 기능정의서/개발 계획/프로토타입을 참고한 테스트 기준 템플릿. AI 호출 없음.
import type { Project, ProjectActivation, ProjectDocument, DocumentType } from '@/types';

const f = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

const HINT = '확인 필요 — 기능정의서/개발 계획을 참고해 보완하세요.';

/** QA 기준 문서(MVP 템플릿). */
export const buildQaCriteria = (
  project: Project,
  docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const upstream = [
    has(docs, 'feature_spec') ? '기능정의서' : null,
    has(docs, 'development_plan') ? '개발 계획' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `# QA 기준

> ${project.name} · 생성 ${generatedAt} · 참고: ${upstream || '상위 문서 미작성(가정으로 보완)'}

## 1. 핵심 사용자 시나리오
- 가장 중요한 사용자 흐름(해피 패스)을 단계별로 정리하세요.
- 핵심 대상 사용자: ${f(a.customer, HINT)}

## 2. 기능별 테스트 기준
- 기능정의서의 각 기능에 대해 "입력 → 기대 결과 → 합격 기준"을 정리하세요. _(${HINT})_

## 3. 예외 케이스
- 빈 입력 / 잘못된 입력 / 네트워크 실패 / 중복 제출 / 동시성 등 예외를 정리하세요. _(${HINT})_

## 4. 권한 / 상태 테스트
- 역할(owner/editor/viewer)별 접근 가능/불가 동작을 검증하세요.
- 문서/프로토타입 상태(초안·검토·승인·재생성 필요)별 동작을 검증하세요. _(${HINT})_

## 5. 브라우저 / 반응형 확인
- 데스크톱/모바일 뷰포트, 주요 브라우저에서 레이아웃·동작을 확인하세요.
- 다크 모드/접근성(키보드, 대비) 기본 확인 항목을 정리하세요. _(${HINT})_

## 6. 릴리즈 전 체크리스트
- [ ] 핵심 시나리오 정상 동작
- [ ] 주요 예외 케이스 처리 확인
- [ ] 권한/상태별 동작 확인
- [ ] 반응형/브라우저 확인
- [ ] 콘솔 에러 없음
- [ ] 빌드/타입체크 통과

---
_후속 자동화 예정: 시나리오 기반 자동 테스트 생성/실행은 다음 단계에서 검토합니다._
`;
};
