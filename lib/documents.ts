// 프로젝트 문서 모델 - 템플릿/생성 로직
// 활성화 입력값(ProjectActivation)으로 기획 문서 초안을 자동 생성합니다.
import type {
  ActivationAnalysis,
  DocumentType,
  Project,
  ProjectActivation,
  ProjectDocument,
  ProjectMode,
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

// 요구사항/RFP 모드에서 요구사항 문서/레퍼런스 분석이 선행되어야 하는 섹션 안내.
const REQ_HINT = '요구사항 문서 또는 레퍼런스 분석 후 보완해주세요.';

/** 비어 있는 활성화 항목을 "현재 부족한 정보" 목록으로 변환. 모두 채워지면 안내 1줄. */
const missingFields = (
  a: ProjectActivation,
  fields: Array<{ key: keyof ProjectActivation; label: string }>,
): string => {
  const missing = fields
    .filter((f) => !(a[f.key] as string | undefined)?.trim())
    .map((f) => `- ${f.label}`);
  return missing.length ? missing.join('\n') : '- 핵심 항목이 모두 입력되었습니다. (필요 시 문서 화면에서 보완)';
};

// --- activationAnalysis(3단계 산출물) → 문서 반영 헬퍼 (보조 인자, 있을 때만 동작) ---

/** string[] → 마크다운 불릿. 비어 있으면 placeholder 유지(_(...)_). */
const renderList = (items: string[] | undefined, placeholder: string): string => {
  const xs = (items ?? []).map((s) => s.trim()).filter(Boolean);
  return xs.length ? xs.map((s) => `- ${s}`).join('\n') : `_(${placeholder})_`;
};

/** 단일 텍스트 값 → 본문. 비어 있으면 placeholder 유지. */
const renderText = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

/** requirements[] → 마크다운(요구사항명/필수/설명/근거/관련 참고자료). sourceId는 라벨로 치환. */
const renderRequirements = (
  reqs: ActivationAnalysis['requirements'] | undefined,
  sources: ActivationAnalysis['sourceSummaries'] | undefined,
  placeholder: string,
): string => {
  const list = (reqs ?? []).filter((r) => r.title.trim() || r.description.trim());
  if (!list.length) return `_(${placeholder})_`;
  const labelOf = (id: string) => (sources ?? []).find((s) => s.sourceId === id)?.label ?? id;
  return list
    .map((r, i) => {
      const lines = [`### ${i + 1}. ${r.title.trim() || '(제목 없음)'} ${r.required ? '— 필수' : '— 선택'}`];
      if (r.description.trim()) lines.push(`- 설명: ${r.description.trim()}`);
      if (r.rationale.trim()) lines.push(`- 근거: ${r.rationale.trim()}`);
      const refs = r.sourceIds.map(labelOf).filter(Boolean);
      if (refs.length) lines.push(`- 관련 참고자료: ${refs.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');
};

/** sourceSummaries[] → 마크다운(라벨 · 목적/인사이트). */
const renderSources = (
  sources: ActivationAnalysis['sourceSummaries'] | undefined,
  placeholder: string,
): string => {
  const xs = (sources ?? []).filter((s) => s.label.trim());
  if (!xs.length) return `_(${placeholder})_`;
  return xs
    .map((s) => {
      const note = [s.purpose.trim(), s.insight.trim()].filter(Boolean).join(' · ');
      return note ? `- ${s.label.trim()} — ${note}` : `- ${s.label.trim()}`;
    })
    .join('\n');
};

/**
 * 브리프 문서 말미에 붙는 "분석 반영" 섹션. analysis 없으면 ''(=기존 문서 그대로).
 * 요구사항/RFP 모드에서만 핵심 요구사항 테이블을 노출한다.
 */
const briefAnalysisSection = (
  analysis: ActivationAnalysis | undefined,
  mode: Exclude<ProjectMode, 'legacy'>,
): string => {
  if (!analysis) return '';
  const parts: string[] = [];
  if (mode === 'requirement_planning') {
    parts.push(
      `## 핵심 요구사항 (분석 반영)\n${renderRequirements(analysis.requirements, analysis.sourceSummaries, '추출된 요구사항이 없습니다. 3단계 분석에서 추가하세요.')}`,
    );
  }
  parts.push(`## 제약 / 전제 조건 (분석 반영)\n${renderList(analysis.brief.constraints, '제약/전제 조건이 입력되지 않았습니다.')}`);
  parts.push(`## 확인 필요 항목 (분석 반영)\n${renderList(analysis.productStrategy.openQuestions, '확인 필요 항목이 없습니다.')}`);
  return `\n${parts.join('\n\n')}\n`;
};

/** 시장조사 문서 말미 "분석 반영" 섹션. analysis 없으면 ''. */
const marketAnalysisSection = (analysis: ActivationAnalysis | undefined): string => {
  if (!analysis) return '';
  const m = analysis.marketResearch;
  const parts = [
    `## 고객 문제 가설 (분석 반영)\n${renderText(m.customerProblemHypothesis, RESEARCH_HINT)}`,
    `## 경쟁 / 대안 서비스 (분석 반영)\n${renderList(m.competitors, RESEARCH_HINT)}`,
    `## 시장 / 사용자 인사이트 (분석 반영)\n${renderList(m.insights, RESEARCH_HINT)}`,
    `## 시장 기회 (분석 반영)\n${renderList(m.opportunities, RESEARCH_HINT)}`,
    `## 리스크 (분석 반영)\n${renderList(m.risks, RESEARCH_HINT)}`,
    `## 참고 레퍼런스 / 자료 (분석 반영)\n${renderList(m.references, '등록된 레퍼런스 링크가 없습니다.')}\n${renderSources(analysis.sourceSummaries, '등록된 참고자료가 없습니다.')}`,
  ];
  return `\n${parts.join('\n\n')}\n`;
};

/** 제품화 전략 문서 말미 "분석 반영" 섹션. MVP 제외/정책/승인 흐름/확인 필요를 분리 노출. analysis 없으면 ''. */
const strategyAnalysisSection = (analysis: ActivationAnalysis | undefined): string => {
  if (!analysis) return '';
  const p = analysis.productStrategy;
  const parts = [
    `## 제품 콘셉트 (분석 반영)\n${renderText(p.concept, RESEARCH_HINT)}`,
    `## MVP 포함 기능 (분석 반영)\n${renderList(p.mvpIncluded, 'MVP 포함 기능이 입력되지 않았습니다.')}`,
    `## MVP 제외 범위 (분석 반영)\n${renderList(p.mvpExcluded, 'MVP 제외 범위가 입력되지 않았습니다.')}`,
    `## 나중에 추가할 기능 (분석 반영)\n${renderList(p.laterFeatures, '후속 기능이 입력되지 않았습니다.')}`,
    `## 수익 구조 (분석 반영)\n${renderText(p.revenueModel, RESEARCH_HINT)}`,
    `## 정책 초안 (분석 반영)\n${renderList(p.policyDraft, '정책 초안이 입력되지 않았습니다.')}`,
    `## 승인 / 검토 흐름 (분석 반영)\n${renderText(p.approvalFlow, RESEARCH_HINT)}`,
    `## 확인 필요 항목 (분석 반영)\n${renderList(p.openQuestions, '확인 필요 항목이 없습니다.')}`,
  ];
  return `\n${parts.join('\n\n')}\n`;
};

/**
 * 활성화 데이터의 mode를 정규화한다.
 * 저장되지 않았거나 'legacy'인 경우(기존 프로젝트)는 idea_productization으로 처리한다.
 */
export const resolveProjectMode = (a: ProjectActivation): Exclude<ProjectMode, 'legacy'> =>
  a.mode === 'requirement_planning' ? 'requirement_planning' : 'idea_productization';

/** 요구사항/RFP 모드에서 사용할 초기 3종 문서의 제목. */
const REQUIREMENT_DOC_TITLES: Partial<Record<DocumentType, string>> = {
  brief: '요구사항 분석 및 서비스 기획 초안',
  market_research: '레퍼런스 조사 및 유사 서비스 분석',
  product_strategy: '구현 전략 및 프로토타입 제작 계획',
};

/** mode에 맞는 초기 문서 제목. 요구사항 모드면 재라벨, 아니면 기본 DOCUMENT_META 제목. */
export const activationDocTitle = (type: DocumentType, mode: ProjectMode): string =>
  mode === 'requirement_planning'
    ? REQUIREMENT_DOC_TITLES[type] ?? DOCUMENT_META[type].title
    : DOCUMENT_META[type].title;

// --- 요구사항/RFP 모드 초기 3종 문서 생성기 (DocumentType은 그대로, content 프레이밍만 다름) ---

const generateRequirementBrief = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => `# 요구사항 분석 및 서비스 기획 초안

> ${project.name} · 전달받은 요구사항/RFP를 분석한 초안입니다.

## 1. 요구사항 요약
${fallback(a.intent, EMPTY_HINT)}

## 2. 프로젝트 목적
${fallback(a.value, '요구사항의 목적과 기대 효과를 정리하세요.')}

## 3. 신규 서비스 / 기존 서비스 확장 여부
_(${REQ_HINT})_

## 4. 핵심 사용자
${fallback(a.customer, EMPTY_HINT)}

## 5. 필수 기능 범위
${fallback(a.mvpScope, '요구사항에서 도출한 필수 기능을 정리하세요.')}

## 6. 플랫폼 구분
${fallback(a.market, '사용자 앱 / 관리자(웹) / 기타 플랫폼 구분을 정리하세요.')}

## 7. 모호한 요구사항
- 해결 과제 관점: ${fallback(a.problem, REQ_HINT)}
- 정의가 불명확하거나 추가 확인이 필요한 요구사항을 적으세요. _(${REQ_HINT})_

## 8. 추가 확인 질문
- 대상 사용자/권한 범위는 명확한가?
- 사용자 앱과 관리자 기능의 경계는?
- 연동/외부 시스템·로그인 방식은?
- 일정·우선순위 제약은?

## 9. 초기 기획 방향
- 차별/강조 포인트: ${fallback(a.differentiator, REQ_HINT)}
- 위 분석을 바탕으로 서비스 기획 방향을 정리하고 레퍼런스/구현 전략 문서로 이어갑니다.
- IA / 기능정의서는 **확정된 프로토타입** 기반으로 역작성합니다(초기 미작성).
${briefAnalysisSection(analysis, 'requirement_planning')}`;

const generateRequirementReferences = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => `# 레퍼런스 조사 및 유사 서비스 분석

> ${project.name} · 요구사항을 충족하는 구현 방향과 UX 레퍼런스를 확보합니다.

## 1. 참고해야 할 서비스 유형
- 대상 사용자: ${fallback(a.customer, REQ_HINT)}
- 적용 도메인/시장: ${fallback(a.market, REQ_HINT)}

## 2. 기능 레퍼런스
- 필수 기능(MVP) 기준 참고 기능: ${fallback(a.mvpScope, REQ_HINT)}

## 3. UI/UX 레퍼런스
_(${REQ_HINT})_

## 4. 운영/관리자 레퍼런스
- 관리자(어드민) 화면·운영 흐름 참고 — _(${REQ_HINT})_

## 5. 가격/비즈니스 모델 참고
${fallback(a.revenue, REQ_HINT)}

## 6. 경쟁 서비스 비교 항목
- 차별 포인트: ${fallback(a.differentiator, REQ_HINT)}
- 비교 축: 기능 / UX / 권한 구조 / 플랫폼 대응 / 가격

## 7. 레퍼런스 조사 체크리스트
- 화면 구성 / 핵심 플로우 / 권한 구분 / 사용자 앱·관리자 분리 / 반응형 / 로그인 방식

## 8. 등록된 URL / Drive 링크
${fallback(a.references, '등록된 참고 URL/Drive 링크가 없습니다. 보강 정보 또는 요구사항 모드 URL 등록에서 추가하세요.')}

## 9. 추가 조사 필요 항목
_(${REQ_HINT})_
${marketAnalysisSection(analysis)}`;

const generateRequirementStrategy = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => `# 구현 전략 및 프로토타입 제작 계획

> ${project.name} · 요구사항을 프로토타입 제작 계획으로 구체화합니다.

## 1. 구현 방향 요약
${fallback(a.intent, EMPTY_HINT)}

## 2. MVP 범위
${fallback(a.mvpScope, '요구사항에서 도출한 1차 구현 범위를 정리하세요.')}

## 3. 제외 범위
- 1차에서 제외(후속): ${fallback(a.laterScope, REQ_HINT)}

## 4. 사용자 앱 / 관리자 / 기타 플랫폼 구분
- 적용 환경: ${fallback(a.market, REQ_HINT)}
- 사용자 앱 영역 / 관리자(어드민) 영역 / 기타 플랫폼을 구분해 정리하세요.

## 5. 프로토타입 제작 목표
- 요구사항을 화면/플로우로 검증하고 의사결정권자 리뷰를 받는다.
- 확정 후 화면/주석/플로우를 기반으로 문서를 역작성한다.

## 6. 프로토타입에 반드시 포함할 화면
_(${REQ_HINT})_

## 7. 프로토타입에 반드시 포함할 주요 기능
- MVP 기준: ${fallback(a.mvpScope, REQ_HINT)}
- 핵심 가치/목표: ${fallback(a.value, REQ_HINT)}

## 8. 의사결정권자 확인 포인트
- 핵심 차별 요소: ${fallback(a.differentiator, REQ_HINT)}
- 사용자 앱·관리자 경계 / 권한 정책 / 필수 플로우 / 일정·우선순위

## 9. Gemini Canvas 또는 프로토타입 생성용 입력 초안
_(초안 — AI 없이 입력값 기반 요약입니다)_
- 만들 것: ${fallback(a.intent, REQ_HINT)}
- 대상 사용자: ${fallback(a.customer, REQ_HINT)}
- 핵심 화면/기능: ${fallback(a.mvpScope, REQ_HINT)}
- 플랫폼: ${fallback(a.market, REQ_HINT)}

## 10. 확정 후 역작성할 문서
- IA / FEATURE_SPEC (확정된 프로토타입 코드·화면·플로우 기반 역작성)
- PRD / USER_APP_UI_SPEC / (관리자 있으면) ADMIN_UI_SPEC
- **초기에는 IA / FEATURE_SPEC / PRD를 생성하지 않습니다.**
${strategyAnalysisSection(analysis)}`;

export const generateBrief = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementBrief(project, a, analysis);
  return `# ${project.name} — 프로젝트 브리프

## 1. 아이디어 요약
${fallback(a.intent, EMPTY_HINT)}

## 2. 해결하려는 문제
${fallback(a.problem, EMPTY_HINT)}

## 3. 핵심 고객
${fallback(a.customer, EMPTY_HINT)}

## 4. 핵심 가치
${fallback(a.value, EMPTY_HINT)}

## 5. 차별점
${fallback(a.differentiator, EMPTY_HINT)}

## 6. MVP 범위
${fallback(a.mvpScope, EMPTY_HINT)}

## 7. 나중에 추가할 기능
${fallback(a.laterScope, EMPTY_HINT)}

## 8. 현재 부족한 정보
${missingFields(a, [
    { key: 'problem', label: '해결하려는 문제' },
    { key: 'customer', label: '핵심 고객' },
    { key: 'value', label: '핵심 가치' },
    { key: 'differentiator', label: '차별점' },
    { key: 'revenue', label: '수익 구조' },
    { key: 'market', label: '최초 진입 시장' },
    { key: 'mvpScope', label: 'MVP 범위' },
    { key: 'laterScope', label: '나중에 추가할 기능' },
  ])}

## 9. 다음 액션
- 위 부족한 정보를 보완하고, 시장조사·제품화전략 문서를 검토하세요.
- 프로토타입을 등록·확정하면 IA·기능정의서를 역작성할 수 있습니다.
${briefAnalysisSection(analysis, 'idea_productization')}`;
};

/**
 * 시장조사 문서 — "시장 조사 전략 및 방법" 템플릿 구조(14 섹션).
 * 입력 필드가 매핑되는 곳은 채우고, 외부 조사가 필요한 곳은 RESEARCH_HINT로 표시한다.
 * 요구사항/RFP 모드에서는 "레퍼런스 조사 및 유사 서비스 분석"으로 생성한다.
 */
export const generateMarketResearch = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementReferences(project, a, analysis);
  return `# 시장 조사 전략 및 방법

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

## 7. 고객 수락 체인 구축
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
${marketAnalysisSection(analysis)}`;
};

/**
 * 제품화전략 문서 — "아이디어 제품화 전략" 템플릿 구조(13 섹션).
 * 프로젝트 개요/전략은 입력 필드로 채우고, 시스템/개발 구조는 RESEARCH_HINT로 표시한다.
 * 요구사항/RFP 모드에서는 "구현 전략 및 프로토타입 제작 계획"으로 생성한다.
 */
export const generateProductStrategy = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementStrategy(project, a, analysis);
  return `# 아이디어 제품화 전략

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
${strategyAnalysisSection(analysis)}`;
};

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

/**
 * 활성화 시 자동 생성되는 3개 기본 문서의 초안 페이로드. aiDocs가 있으면 그것을 우선 사용.
 * mode(activation.mode)에 따라 제목·content 프레이밍이 달라진다. DocumentType은 항상 동일.
 */
export const buildActivationDocuments = (
  project: Project,
  a: ProjectActivation,
  aiDocs?: { projectBrief?: string; marketResearch?: string; productStrategy?: string },
  analysis?: ActivationAnalysis,
): Array<Pick<ProjectDocument, 'type' | 'title' | 'content' | 'version' | 'status'>> => {
  const mode = resolveProjectMode(a);
  return [
    {
      type: 'brief',
      title: activationDocTitle('brief', mode),
      content: aiDocs?.projectBrief?.trim() || generateBrief(project, a, analysis),
      version: '1.0',
      status: 'draft',
    },
    {
      type: 'market_research',
      title: activationDocTitle('market_research', mode),
      content: aiDocs?.marketResearch?.trim() || generateMarketResearch(project, a, analysis),
      version: '1.0',
      status: 'draft',
    },
    {
      type: 'product_strategy',
      title: activationDocTitle('product_strategy', mode),
      content: aiDocs?.productStrategy?.trim() || generateProductStrategy(project, a, analysis),
      version: '1.0',
      status: 'draft',
    },
  ];
};

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
