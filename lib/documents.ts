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

// 활성화 시 비워둔 선택 항목에 들어가는 안내 문구 (어색한 "미입력" 대체).
const EMPTY_HINT = '아직 입력되지 않았습니다. 문서 화면에서 보완해주세요.';

// "아직 조사/입력되지 않음"을 나타내는 연구형 안내(시장조사/제품화전략 상세 섹션용).
const RESEARCH_HINT = '조사 필요 — 아이디어를 바탕으로 직접 보완하거나 AI 초안 생성을 사용하세요.';

export const generateBrief = (project: Project, a: ProjectActivation): string => `# ${project.name} — 프로젝트 브리프

## 서비스 한 줄 요약 / 기획 의도
${fallback(a.intent, EMPTY_HINT)}

## 해결하려는 문제
${fallback(a.problem, EMPTY_HINT)}

## 핵심 고객
${fallback(a.customer, EMPTY_HINT)}

## 핵심 가치
${fallback(a.value, EMPTY_HINT)}

## 핵심 차별점
${fallback(a.differentiator, EMPTY_HINT)}

## 수익 구조
${fallback(a.revenue, EMPTY_HINT)}

## 최초 진입 시장
${fallback(a.market, EMPTY_HINT)}

## MVP 범위
${fallback(a.mvpScope, EMPTY_HINT)}

## 나중에 추가할 기능
${fallback(a.laterScope, EMPTY_HINT)}

## 참고 UI / 서비스 / 레퍼런스
${fallback(a.references, EMPTY_HINT)}
`;

/**
 * 시장조사 문서 — "시장 조사 전략 및 방법" 템플릿 구조(14 섹션).
 * 입력 필드가 매핑되는 곳은 채우고, 외부 조사가 필요한 곳은 RESEARCH_HINT로 표시한다.
 */
export const generateMarketResearch = (project: Project, a: ProjectActivation): string => `# 시장 조사 전략 및 방법

## 핵심 원칙
- 누가 왜 돈을 내는가? — ${fallback(a.customer, RESEARCH_HINT)}
- 처음부터 완벽한 제품보다 시장 검증이 우선
- 자동화보다 수동 판매와 실제 거래 검증이 우선

## 0. 가장 중요한 철학
- 작게 시작 / 수동으로라도 판매 / 세분화 시장 우선 / 고객이 실제로 돈을 낼지 검증

## 1. 시장 세분화 정의
### 누구에게 판매하는가?
${fallback(a.customer, RESEARCH_HINT)}
### 어떤 문제를 해결하는가?
${fallback(a.problem, RESEARCH_HINT)}
### 왜 지금 당장 구매해야 하는가?
${fallback(a.value, RESEARCH_HINT)}

## 2. 시장 조사 항목
### 제품은 어떻게 판매하는가?
_(${RESEARCH_HINT})_
### 랜딩 페이지는 어떻게 구성하는가?
_(${RESEARCH_HINT})_
### 고객은 무엇을 좋아하고 싫어하는가?
_(${RESEARCH_HINT})_
### 콘텐츠는 어떻게 배포하는가?
_(${RESEARCH_HINT})_
### 광고는 어떻게 집행하는가?
_(${RESEARCH_HINT})_
### 가격 구조는 어떤가?
${fallback(a.revenue, RESEARCH_HINT)}
### 어떤 포지셔닝을 사용하는가?
${fallback(a.differentiator, RESEARCH_HINT)}

## 3. 상품 전략 정의
### 핵심 고객
${fallback(a.customer, EMPTY_HINT)}
### 핵심 문제
${fallback(a.problem, EMPTY_HINT)}
### 핵심 가치
${fallback(a.value, EMPTY_HINT)}
### 핵심 차별점
${fallback(a.differentiator, EMPTY_HINT)}
### 수익 구조
${fallback(a.revenue, EMPTY_HINT)}
### 최초 진입 시장
${fallback(a.market, EMPTY_HINT)}
### MVP 범위
${fallback(a.mvpScope, EMPTY_HINT)}
### 나중에 추가할 기능
${fallback(a.laterScope, EMPTY_HINT)}

## 4. MVP 범위 정의
### 고객이 돈을 낼 최소 기능
${fallback(a.mvpScope, RESEARCH_HINT)}
### 수동 처리 가능 영역
_(${RESEARCH_HINT})_
### 자동화 없이도 판매 가능한가
_(${RESEARCH_HINT})_
### 처음부터 만들지 말아야 하는 것
${fallback(a.laterScope, RESEARCH_HINT)}
### 먼저 만들어야 하는 것
${fallback(a.mvpScope, RESEARCH_HINT)}

## 5. 최소 거래 페이지 템플릿
### 해결하는 문제
${fallback(a.problem, RESEARCH_HINT)}
### 적합한 고객
${fallback(a.customer, RESEARCH_HINT)}
### 실제 사례 또는 결과
_(${RESEARCH_HINT})_
### 가격 또는 협력 방식
${fallback(a.revenue, RESEARCH_HINT)}
### 연락 방법
_(${RESEARCH_HINT})_

## 6. 콘텐츠 검증 템플릿
- 고통점 콘텐츠 / 사례 콘텐츠 / 단계 콘텐츠 / 대비 콘텐츠 / 분석 지표 — _(${RESEARCH_HINT})_

## 7. 고객 수락 체인
- 자동 답장 / 문의 양식 / 연락 채널 / 예약 링크 / 견적 템플릿 / 상담 흐름 / 고객 관리 방식 — _(${RESEARCH_HINT})_

## 8. 첫 3명의 고객 확보
### 수동 판매 전략
_(${RESEARCH_HINT})_
### 첫 고객 확보 방식
_(${RESEARCH_HINT})_
### 반복 검증 방식
_(${RESEARCH_HINT})_

## 9. 실제 검증해야 하는 것
_(${RESEARCH_HINT})_

## 10. 마지막에 해야 하는 것
_(${RESEARCH_HINT})_

## 11. 현실적인 초기 전략
${fallback(a.market, RESEARCH_HINT)}

## 12. 절대 하지 말아야 하는 순서
_(${RESEARCH_HINT})_

## 13. 가장 중요한 질문
- 이 ${fallback(a.customer, '고객')}이(가) 이 문제에 실제로 돈을 낼 것인가?

## 14. 현실적인 제품 철학
- 작게, 수동으로, 검증 우선. 자동화는 수요가 증명된 다음.
`;

/**
 * 제품화전략 문서 — "아이디어 제품화 전략" 템플릿 구조(13 섹션).
 * 프로젝트 개요/전략은 입력 필드로 채우고, 시스템/개발 구조는 RESEARCH_HINT로 표시한다.
 */
export const generateProductStrategy = (project: Project, a: ProjectActivation): string => `# 아이디어 제품화 전략

## 1. 가장 중요한 원칙
- 바로 기능 구현하지 않기
- 사전 분석 → 아키텍처 → 도메인 모델 → MVP → 검증 순서 유지
- 무엇을 만들지, 왜 만드는지, 어디까지 MVP인지 정의

## 2. 프로젝트 개요
### 프로젝트명
${project.name}
### 서비스 한 줄 설명
${fallback(a.intent, EMPTY_HINT)}
### 문제 정의
${fallback(a.problem, EMPTY_HINT)}
### 타겟 사용자
${fallback(a.customer, EMPTY_HINT)}
### 핵심 사용 시나리오
_(${RESEARCH_HINT})_
### 차별점
${fallback(a.differentiator, EMPTY_HINT)}
### MVP 목표
${fallback(a.mvpScope, EMPTY_HINT)}
### 장기 방향
${fallback(a.laterScope, EMPTY_HINT)}

## 3. 제품 전략 구조
### MVP에서 반드시 검증해야 하는 것
${fallback(a.mvpScope, RESEARCH_HINT)}
### 사용자 가치
${fallback(a.value, EMPTY_HINT)}
### 자동화 가능 영역
_(${RESEARCH_HINT})_
### 수익화 가능 구조
${fallback(a.revenue, EMPTY_HINT)}
### 핵심 방향성
${fallback(a.differentiator, RESEARCH_HINT)}
### 핵심 철학
- 작게 시작, 검증 우선

## 4. 시스템 구조 템플릿
- 전체 시스템 구조 / 현실적 MVP 구조 / Frontend / Backend / Database / Storage / AI Layer / External APIs / Analytics / Scheduler / Admin Dashboard — _(${RESEARCH_HINT})_

## 5. AI 에이전트 역할 구조
- Architect / Engineer / Reviewer / Optimizer / Debugger — _(${RESEARCH_HINT})_

## 6. 개발 우선순위
- Stage 1 사전 분석 / Stage 2 아키텍처 설계 / Stage 3 핵심 데이터 모델 / Stage 4 핵심 MVP 기능 / Stage 5 관리자 운영 구조 / Stage 6 자동화 고도화 — _(${RESEARCH_HINT})_

## 7. MVP 우선순위
### 반드시 필요한 것
${fallback(a.mvpScope, RESEARCH_HINT)}
### 나중에 해야 하는 것
${fallback(a.laterScope, RESEARCH_HINT)}

## 8. 정책 및 리스크
- 실패 시 재시도 정책 / 외부 API 장애 대응 / 비용 제한 / 업로드 제한 / 사용자 승인 단계 / 데이터 보관 정책 — _(${RESEARCH_HINT})_

## 9. 먼저 확인해야 할 파일/구조
- package.json / DB 모델 / API 구조 / queue 구조 / env 사용 구조 / 공통 UI 컴포넌트 — _(${RESEARCH_HINT})_

## 10. /goal 후보 3개
_(${RESEARCH_HINT} — 각 후보: 목표 / 왜 지금 / 수정 범위 / 완료 기준 / 제약 / 검증 명령어 / 리스크 / 예상 소요 시간)_

## 11. 범용 기능 개발 템플릿
_(${RESEARCH_HINT})_

## 12. 현실적인 최적 전략
${fallback(a.mvpScope, RESEARCH_HINT)}

## 13. 현실적인 MVP 철학
- 가장 작은 검증 가능한 버전부터. 과설계 금지.
`;

/** AI 초안 생성 프롬프트에서 구조를 그대로 따르도록 전달하는 템플릿 스켈레톤(헤딩 구조만). */
export const MARKET_RESEARCH_SKELETON = `# 시장 조사 전략 및 방법
## 핵심 원칙
## 0. 가장 중요한 철학
## 1. 시장 세분화 정의 (### 누구에게 판매하는가? / ### 어떤 문제를 해결하는가? / ### 왜 지금 당장 구매해야 하는가?)
## 2. 시장 조사 항목 (### 제품은 어떻게 판매하는가? / 랜딩 페이지 / 고객 호불호 / 콘텐츠 배포 / 광고 집행 / 가격 구조 / 포지셔닝)
## 3. 상품 전략 정의 (### 핵심 고객 / 핵심 문제 / 핵심 가치 / 핵심 차별점 / 수익 구조 / 최초 진입 시장 / MVP 범위 / 나중에 추가할 기능)
## 4. MVP 범위 정의 (### 고객이 돈을 낼 최소 기능 / 수동 처리 가능 영역 / 자동화 없이 판매 가능한가 / 처음부터 만들지 말 것 / 먼저 만들 것)
## 5. 최소 거래 페이지 템플릿 (### 해결하는 문제 / 적합한 고객 / 실제 사례 / 가격·협력 방식 / 연락 방법)
## 6. 콘텐츠 검증 템플릿 (고통점/사례/단계/대비 콘텐츠 / 분석 지표)
## 7. 고객 수락 체인 (자동 답장 / 문의 양식 / 연락 채널 / 예약 링크 / 견적 템플릿 / 상담 흐름 / 고객 관리)
## 8. 첫 3명의 고객 확보 (### 수동 판매 전략 / 첫 고객 확보 방식 / 반복 검증 방식)
## 9. 실제 검증해야 하는 것
## 10. 마지막에 해야 하는 것
## 11. 현실적인 초기 전략
## 12. 절대 하지 말아야 하는 순서
## 13. 가장 중요한 질문
## 14. 현실적인 제품 철학`;

export const PRODUCT_STRATEGY_SKELETON = `# 아이디어 제품화 전략
## 1. 가장 중요한 원칙
## 2. 프로젝트 개요 (### 프로젝트명 / 서비스 한 줄 설명 / 문제 정의 / 타겟 사용자 / 핵심 사용 시나리오 / 차별점 / MVP 목표 / 장기 방향)
## 3. 제품 전략 구조 (### MVP에서 반드시 검증할 것 / 사용자 가치 / 자동화 가능 영역 / 수익화 가능 구조 / 핵심 방향성 / 핵심 철학)
## 4. 시스템 구조 템플릿 (전체 구조 / 현실적 MVP 구조 / Frontend / Backend / Database / Storage / AI Layer / External APIs / Analytics / Scheduler / Admin Dashboard)
## 5. AI 에이전트 역할 구조 (Architect / Engineer / Reviewer / Optimizer / Debugger)
## 6. 개발 우선순위 (Stage 1 사전 분석 ~ Stage 6 자동화 고도화)
## 7. MVP 우선순위 (### 반드시 필요한 것 / 나중에 해야 하는 것)
## 8. 정책 및 리스크 (재시도 / 외부 API 장애 / 비용 제한 / 업로드 제한 / 사용자 승인 / 데이터 보관)
## 9. 먼저 확인해야 할 파일/구조 (package.json / DB 모델 / API 구조 / queue / env / 공통 UI)
## 10. /goal 후보 3개 (각: 목표 / 왜 지금 / 수정 범위 / 완료 기준 / 제약 / 검증 명령어 / 리스크 / 예상 소요 시간 — 복사해서 쓸 수 있는 수준으로)
## 11. 범용 기능 개발 템플릿
## 12. 현실적인 최적 전략
## 13. 현실적인 MVP 철학`;

/** 활성화 시 자동 생성되는 3개 기본 문서의 초안 페이로드. aiDocs가 있으면 그것을 우선 사용. */
export const buildActivationDocuments = (
  project: Project,
  a: ProjectActivation,
  aiDocs?: { projectBrief?: string; marketResearch?: string; productStrategy?: string },
): Array<Pick<ProjectDocument, 'type' | 'title' | 'content' | 'version' | 'status'>> => [
  {
    type: 'brief',
    title: DOCUMENT_META.brief.title,
    content: aiDocs?.projectBrief?.trim() || generateBrief(project, a),
    version: '1.0',
    status: 'draft',
  },
  {
    type: 'market_research',
    title: DOCUMENT_META.market_research.title,
    content: aiDocs?.marketResearch?.trim() || generateMarketResearch(project, a),
    version: '1.0',
    status: 'draft',
  },
  {
    type: 'product_strategy',
    title: DOCUMENT_META.product_strategy.title,
    content: aiDocs?.productStrategy?.trim() || generateProductStrategy(project, a),
    version: '1.0',
    status: 'draft',
  },
];

/**
 * PRD 본문의 "## 14. 프로토타입 URL" 섹션만 최신 URL로 교체.
 * 수동 편집된 다른 섹션은 보존합니다. 섹션이 없으면 말미에 추가합니다.
 */
export const injectPrototypeUrl = (content: string, url: string): string => {
  const re = /(##\s*14\.\s*프로토타입 URL\s*\n)([^\n]*)/;
  if (re.test(content)) return content.replace(re, `$1${url}`);
  return `${content.trimEnd()}\n\n## 14. 프로토타입 URL\n${url}\n`;
};

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
${fallback(a.intent, EMPTY_HINT)}

## 3. 핵심 고객
${fallback(a.customer, EMPTY_HINT)}

## 4. 핵심 문제
${fallback(a.problem, EMPTY_HINT)}

## 5. 핵심 가치
${fallback(a.value, EMPTY_HINT)}

## 6. 시장조사 요약
- 최초 진입 시장: ${fallback(a.market, EMPTY_HINT)}
- 핵심 차별점: ${fallback(a.differentiator, EMPTY_HINT)}

## 7. 제품화전략
- 수익 구조: ${fallback(a.revenue, EMPTY_HINT)}

## 8. MVP 범위
${fallback(a.mvpScope, EMPTY_HINT)}

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
