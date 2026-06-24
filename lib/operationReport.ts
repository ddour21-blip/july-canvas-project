// 운영 개선 리포트(operation_report) 문서 생성기 — Pipeline MVP.
// 출시 후 점검/개선 방향 템플릿. AI 호출 없음.
import type { Project, ProjectActivation, ProjectDocument, DocumentType } from '@/types';

const f = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

const HINT = '확인 필요 — 출시 후 데이터/피드백을 바탕으로 보완하세요.';

/** 운영 개선 리포트 문서(MVP 템플릿). */
export const buildOperationReport = (
  project: Project,
  docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const upstream = [
    has(docs, 'launch_checklist') ? '배포 준비 체크리스트' : null,
    has(docs, 'qa_criteria') ? 'QA 기준' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `# 운영 개선 리포트

> ${project.name} · 생성 ${generatedAt} · 참고: ${upstream || '상위 문서 미작성(가정으로 보완)'}

## 1. 출시 후 확인 지표
- 핵심 가치(${f(a.value, '핵심 가치')}) 달성을 보여줄 지표를 정의하세요.
- 후보: 활성 사용자, 핵심 액션 완료율, 전환율, 오류율, 응답시간. _(${HINT})_

## 2. 사용자 피드백 수집 항목
- 수집 채널(인앱 설문, 인터뷰, 지원 문의)과 질문 항목을 정리하세요.
- 핵심 대상: ${f(a.customer, HINT)}

## 3. 개선 우선순위
- 영향도 × 빈도 기준으로 개선 항목의 우선순위를 정리하세요. _(${HINT})_

## 4. 운영 리스크
- 장애/비용/보안/운영 부하 관점의 리스크와 모니터링 기준을 정리하세요. _(${HINT})_

## 5. 다음 실험 후보
- 가설 → 측정 지표 → 성공 기준 형태로 실험 후보를 정리하세요. _(${HINT})_

## 6. 다음 배포 제안
- 다음 릴리즈에 포함할 개선/기능 후보와 근거를 정리하세요.
- 후속 기능 후보: ${f(a.laterScope, HINT)}

---
_후속 자동화 예정: 지표 자동 수집/실험 자동화(성장 루프)는 다음 단계에서 검토합니다._
`;
};
