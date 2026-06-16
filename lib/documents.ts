// 프로젝트 문서 모델 - 템플릿/생성 로직
// 활성화 입력값(ProjectActivation)으로 기획 문서 초안을 자동 생성합니다.
import type {
  DocumentType,
  Project,
  ProjectActivation,
  ProjectDocument,
} from '@/types';

interface DocMeta {
  title: string;
  filename: string;
  /** 생성/검수 순서 */
  order: number;
}

export const DOCUMENT_META: Record<DocumentType, DocMeta> = {
  brief: { title: '프로젝트 브리프', filename: 'PROJECT_BRIEF.md', order: 1 },
  market_research: { title: '시장조사', filename: 'MARKET_RESEARCH.md', order: 2 },
  product_strategy: { title: '제품화전략', filename: 'PRODUCT_STRATEGY.md', order: 3 },
  ia: { title: 'IA (정보구조)', filename: 'IA.md', order: 4 },
  feature_spec: { title: '기능정의서', filename: 'FEATURE_SPEC.md', order: 5 },
  prd: { title: 'PRD', filename: 'PRD.md', order: 6 },
};

export const DOCUMENT_ORDER: DocumentType[] = (
  Object.keys(DOCUMENT_META) as DocumentType[]
).sort((a, b) => DOCUMENT_META[a].order - DOCUMENT_META[b].order);

const fallback = (v: string | undefined, placeholder: string) =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

export const generateBrief = (project: Project, a: ProjectActivation): string => `# ${project.name} — 프로젝트 브리프

## 기획 의도
${fallback(a.intent, '미입력')}

## 해결하려는 문제
${fallback(a.problem, '미입력')}

## 핵심 고객
${fallback(a.customer, '미입력')}

## 핵심 가치
${fallback(a.value, '미입력')}

## 핵심 차별점
${fallback(a.differentiator, '미입력')}

## 참고 UI / 서비스 / 레퍼런스
${fallback(a.references, '미입력')}
`;

export const generateMarketResearch = (a: ProjectActivation): string => `# 시장조사

## 핵심 고객
${fallback(a.customer, '미입력')}

## 핵심 문제
${fallback(a.problem, '미입력')}

## 핵심 가치
${fallback(a.value, '미입력')}

## 핵심 차별점
${fallback(a.differentiator, '미입력')}

## 최초 진입 시장
${fallback(a.market, '미입력')}

## 참고 레퍼런스
${fallback(a.references, '미입력')}
`;

export const generateProductStrategy = (a: ProjectActivation): string => `# 제품화전략

## 핵심 고객
${fallback(a.customer, '미입력')}

## 핵심 문제
${fallback(a.problem, '미입력')}

## 핵심 가치
${fallback(a.value, '미입력')}

## 핵심 차별점
${fallback(a.differentiator, '미입력')}

## 수익 구조
${fallback(a.revenue, '미입력')}

## 최초 진입 시장
${fallback(a.market, '미입력')}

## MVP 범위
${fallback(a.mvpScope, '미입력')}

## 나중에 추가할 기능
${fallback(a.laterScope, '미입력')}
`;

/** 활성화 시 자동 생성되는 3개 기본 문서의 초안 페이로드 */
export const buildActivationDocuments = (
  project: Project,
  a: ProjectActivation,
): Array<Pick<ProjectDocument, 'type' | 'title' | 'content' | 'version' | 'status'>> => [
  { type: 'brief', title: DOCUMENT_META.brief.title, content: generateBrief(project, a), version: '1.0', status: 'draft' },
  { type: 'market_research', title: DOCUMENT_META.market_research.title, content: generateMarketResearch(a), version: '1.0', status: 'draft' },
  { type: 'product_strategy', title: DOCUMENT_META.product_strategy.title, content: generateProductStrategy(a), version: '1.0', status: 'draft' },
];

/**
 * 최종 PRD.md 조립.
 * 기존 활성화 데이터 + 작성된 IA/기능정의서 문서 + 프로토타입 URL을 종합합니다.
 */
export const generatePRD = (
  project: Project,
  docs: ProjectDocument[],
  prototypeUrl?: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const byType = (t: DocumentType) => docs.find((d) => d.type === t)?.content?.trim();
  const ia = byType('ia');
  const featureSpec = byType('feature_spec');

  return `# PRD — ${project.name}

## 1. 프로젝트 개요
${fallback(project.description || a.intent, '프로젝트 개요 미입력')}

## 2. 기획 의도
${fallback(a.intent, '미입력')}

## 3. 핵심 고객
${fallback(a.customer, '미입력')}

## 4. 핵심 문제
${fallback(a.problem, '미입력')}

## 5. 핵심 가치
${fallback(a.value, '미입력')}

## 6. 시장조사 요약
- 최초 진입 시장: ${fallback(a.market, '미입력')}
- 핵심 차별점: ${fallback(a.differentiator, '미입력')}

## 7. 제품화전략
- 수익 구조: ${fallback(a.revenue, '미입력')}

## 8. MVP 범위
${fallback(a.mvpScope, '미입력')}

## 9. IA
${ia ? ia : '_(IA 문서가 아직 작성되지 않았습니다)_'}

## 10. 화면 목록
_(프로토타입 화면 목록은 프로토타입 탭에서 관리됩니다)_

## 11. 기능정의
${featureSpec ? featureSpec : '_(기능정의서가 아직 작성되지 않았습니다)_'}

## 12. 권한 정책
- owner: 전체 관리, 멤버 관리, 승인, 최종 PRD 생성
- editor: 문서 작성, 프로토타입 수정, 댓글, 승인 요청
- viewer: 조회, 댓글, 제한적 다운로드

## 13. 주요 사용자 플로우
_(IA의 사용자 플로우 참조)_

## 14. 프로토타입 URL
${prototypeUrl ? prototypeUrl : '_(프로토타입 URL 미생성)_'}

## 15. 개발 우선순위
- 1순위: ${fallback(a.mvpScope, 'MVP 범위 미입력')}
- 이후: ${fallback(a.laterScope, '추가 기능 미입력')}

## 16. 제외 범위
${fallback(a.laterScope, 'MVP 이후 단계로 분리')}

## 17. 검수 기준
- 필수 문서(브리프/시장조사/제품화전략/IA/기능정의서) 작성 완료
- 프로토타입 URL 생성 완료
- 주요 리뷰/댓글 해결 완료
`;
};
