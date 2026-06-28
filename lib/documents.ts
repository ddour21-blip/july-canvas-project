// 프로젝트 문서 모델 - 템플릿/생성 로직
// 활성화 입력값(ProjectActivation)으로 기획 문서 초안을 자동 생성합니다.
import type {
  ActivationAnalysis,
  DocumentType,
  PipelineStep,
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
  /** 필수 진행률(missingRequired/createdCount) 계산 대상 여부. 기존 핵심 6종만 true. */
  required?: boolean;
  /** 이 문서가 속한 파이프라인 단계(탭/그룹 매핑·단계 상태 derive용). */
  stage?: PipelineStep;
}

export const DOCUMENT_META: Record<DocumentType, DocMeta> = {
  brief: { title: '프로젝트 브리프', filename: 'PROJECT_BRIEF.md', order: 1, required: true, stage: 'planning' },
  market_research: { title: '시장조사', filename: 'MARKET_RESEARCH.md', order: 2, required: true, stage: 'planning' },
  product_strategy: { title: '제품화전략', filename: 'PRODUCT_STRATEGY.md', order: 3, required: true, stage: 'planning' },
  // --- Pipeline MVP 신규 산출물 (required:false — 기존 필수 진행률 계산에 영향 없음) ---
  design_context: { title: '디자인 컨텍스트', filename: 'DESIGN_CONTEXT.md', order: 4, required: false, stage: 'design' },
  ia: { title: 'IA (정보구조)', filename: 'IA.md', order: 5, required: true, stage: 'structure' },
  feature_spec: { title: '기능정의서', filename: 'FEATURE_SPEC.md', order: 6, required: true, stage: 'structure' },
  service_structure: { title: '서비스 구조 설계', filename: 'SERVICE_STRUCTURE.md', order: 7, required: false, stage: 'structure' },
  prd: { title: 'PRD', filename: 'PRD.md', order: 8, required: true, stage: 'build_plan' },
  development_plan: { title: '개발 계획', filename: 'DEVELOPMENT_PLAN.md', order: 9, required: false, stage: 'build_plan' },
  qa_criteria: { title: 'QA 기준', filename: 'QA_CRITERIA.md', order: 10, required: false, stage: 'qa' },
  launch_checklist: { title: '배포 준비 체크리스트', filename: 'LAUNCH_CHECKLIST.md', order: 11, required: false, stage: 'launch' },
  operation_report: { title: '운영 개선 리포트', filename: 'OPERATION_REPORT.md', order: 12, required: false, stage: 'operate' },
};

/** 필수 진행률 계산 대상(기존 핵심 문서). 신규 파이프라인 문서는 제외. */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = (Object.keys(DOCUMENT_META) as DocumentType[]).filter(
  (t) => DOCUMENT_META[t].required,
);

export const DOCUMENT_ORDER: DocumentType[] = (
  Object.keys(DOCUMENT_META) as DocumentType[]
).sort((a, b) => DOCUMENT_META[a].order - DOCUMENT_META[b].order);

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

/** string[] → 마크다운 불릿. 비어 있으면 '' (섹션 생략용 — placeholder 없음). */
const bulletList = (items?: string[]): string => {
  const xs = (items ?? []).map((s) => s.trim()).filter(Boolean);
  return xs.length ? xs.map((s) => `- ${s}`).join('\n') : '';
};

/** sourceSummaries → "라벨 — 메모" 문자열 배열(라벨 없는 항목 제외). */
const sourceStrings = (sources?: ActivationAnalysis['sourceSummaries']): string[] =>
  (sources ?? [])
    .filter((s) => s.label.trim())
    .map((s) => {
      const note = [s.purpose.trim(), s.insight.trim()].filter(Boolean).join(' · ');
      return note ? `${s.label.trim()} — ${note}` : s.label.trim();
    });

/**
 * 참고자료 여러 소스를 합쳐 dedupe 후 불릿 목록으로. 없으면 ''.
 * - 입력은 문자열(줄바꿈 분리) 또는 string[] 혼용 허용.
 * - 앞 '- '/공백/대소문자 차이를 무시하고, "라벨 — 메모"는 라벨 기준으로 중복 판단(같은 항목 1회만).
 */
const mergeRefs = (...parts: (string | string[] | undefined | null)[]): string => {
  const lines: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const arr = Array.isArray(p) ? p : p.split('\n');
    for (const raw of arr) {
      const s = raw.replace(/^[-*]\s+/, '').trim();
      if (s) lines.push(s);
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of lines) {
    const key = s.split(' — ')[0].toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(`- ${s}`);
  }
  return out.join('\n');
};

/**
 * (분석 반영) 류 섹션 lean 렌더. 값 있는 항목만 "## 헤딩{suffix}\n값"으로 출력하고,
 * 비어 있는 '중요(track)' 항목 라벨만 마지막 "## 추가 확인 필요{suffix}"로 한 번 모은다(섹션마다 placeholder 금지).
 */
const renderAnalysisBlocks = (
  blocks: Array<{ h: string; v: string; track?: boolean }>,
  suffix = '',
): string => {
  const out: string[] = [];
  const missing: string[] = [];
  for (const b of blocks) {
    const v = (b.v ?? '').trim();
    if (v) out.push(`## ${b.h}${suffix}\n${v}`);
    else if (b.track) missing.push(b.h);
  }
  if (missing.length) out.push(`## 추가 확인 필요${suffix}\n${missing.map((m) => `- ${m}`).join('\n')}`);
  return out.join('\n\n');
};

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


/**
 * 브리프 문서 말미에 붙는 "분석 반영" 섹션. analysis 없으면 ''(=기존 문서 그대로).
 * 요구사항/RFP 모드에서만 핵심 요구사항 테이블을 노출한다.
 */
const briefAnalysisSection = (
  analysis: ActivationAnalysis | undefined,
  mode: Exclude<ProjectMode, 'legacy'>,
): string => {
  if (!analysis) return '';
  const hasReqs = (analysis.requirements ?? []).some((r) => r.title.trim() || r.description.trim());
  const blocks: Array<{ h: string; v: string; track?: boolean }> = [];
  if (mode === 'requirement_planning') {
    blocks.push({
      h: '핵심 요구사항',
      v: hasReqs ? renderRequirements(analysis.requirements, analysis.sourceSummaries, '') : '',
      track: true,
    });
  }
  blocks.push({ h: '제약 / 전제 조건', v: bulletList(analysis.brief.constraints) });
  blocks.push({ h: '확인 필요 항목', v: bulletList(analysis.productStrategy.openQuestions) });
  const body = renderAnalysisBlocks(blocks, ' (분석 반영)');
  return body ? `\n${body}\n` : '';
};

// --- 시장조사 문서(아이디어 모드) 커스텀 헬퍼 ---
// 공통 14섹션 템플릿(고정 질문 + 빈칸 placeholder 반복) 대신, 아이디어 유형에 맞는 관점만 선별하고
// 값은 [사용자 입력 > AI 분석 > 아이디어 기반 fallback] 순으로 채운다. 부족한 항목만 마지막에 한 번 모은다.

type IdeaCategory = 'app_service' | 'content_social' | 'b2b_saas' | 'commerce';

/** 아이디어/요구사항 텍스트에서 카테고리 추정(키워드 휴리스틱). 기본 app_service. */
const detectIdeaCategory = (text: string): IdeaCategory => {
  const t = (text || '').toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => t.includes(k));
  if (has('b2b', 'saas', '관리자', '대시보드', '워크플로', '업무', 'crm', 'erp', '협업', '사내', '기업용', '솔루션 도입')) return 'b2b_saas';
  if (has('커머스', '쇼핑', '마켓', '마켓플레이스', '판매자', '구매자', '상품', '결제', '중고', '거래', '배송', '셀러', '이커머스', '스토어')) return 'commerce';
  if (has('sns', '소셜', '커뮤니티', '콘텐츠', '크리에이터', '피드', '밈', 'meme', '영상', '공유', '팔로', '바이럴', '트렌드', '크롤')) return 'content_social';
  return 'app_service';
};

/** 아이디어에서 핵심 주제 명사 추출(접미어 제거). */
const ideaCore = (idea: string): string => {
  const first = (idea || '').split('\n')[0].trim();
  const sent = (first.split(/[.!?。,]/)[0] || first).trim();
  const topic = (sent.length > 28 ? sent.slice(0, 28).trim() : sent) || '이 서비스';
  return topic.replace(/(앱|어플|애플리케이션|서비스|플랫폼|사이트|웹사이트|웹|툴|솔루션)\s*$/u, '').trim() || topic;
};

/** 첫 번째 비어있지 않은 문자열. 없으면 ''. */
const firstFilled = (...vals: (string | undefined)[]): string =>
  vals.map((v) => (v ?? '').trim()).find(Boolean) ?? '';

/** string[] 목록 중 첫 번째 비어있지 않은 것을 'a, b, c'로. 없으면 ''. */
const firstFilledList = (...lists: (string[] | undefined)[]): string => {
  for (const l of lists) {
    const xs = (l ?? []).map((s) => s.trim()).filter(Boolean);
    if (xs.length) return xs.join(', ');
  }
  return '';
};

/**
 * 활성화 필드별 fallback 문장. 값이 비었을 때 placeholder("미입력/조사 필요") 대신
 * 아이디어/요구사항 핵심 주제 기반의 합리적 초안 문장을 돌려준다(모든 문서 공용).
 */
const draftFields = (a: ProjectActivation) => {
  const core = ideaCore(a.intent || '');
  return {
    intent: () => firstFilled(a.intent) || `${core}에 대한 기획을 정리합니다.`,
    problem: () => firstFilled(a.problem) || `${core} 과정에서 사용자가 겪는 불편을 해소하는 것을 목표로 합니다.`,
    customer: () => firstFilled(a.customer) || `${core}을(를) 직접 사용하는 핵심 사용자`,
    value: () => firstFilled(a.value) || `간단한 흐름으로 ${core}의 핵심 가치를 빠르게 전달합니다.`,
    differentiator: () => firstFilled(a.differentiator) || '복잡한 기능보다 빠른 실행과 명확한 가치로 차별화합니다.',
    mvpScope: () => firstFilled(a.mvpScope) || `${core}의 핵심 기능부터 우선 구현합니다.`,
    laterScope: () => firstFilled(a.laterScope) || '고급 기능·자동화 등은 후속 단계로 분리합니다.',
    market: () => firstFilled(a.market) || '핵심 사용자군이 있는 초기 시장부터 진입합니다.',
    revenue: () => firstFilled(a.revenue) || `${core}에 맞는 수익 모델(구독·결제·프리미엄 기능 등)을 검토합니다.`,
  };
};

/**
 * 시장조사 문서(아이디어 모드) 본문 생성.
 * - 카테고리별 관점만 노출(고정 14질문 미사용).
 * - 각 항목: 사용자 입력 > AI 분석 > 아이디어 기반 fallback. inline "조사 필요" 반복 없음.
 * - 정말 부족한 경험적 항목만 마지막 "추가 조사 필요 항목"으로 한 번 모음.
 */
const buildIdeaMarketResearch = (a: ProjectActivation, analysis: ActivationAnalysis | undefined): string => {
  const idea = a.intent || '';
  const core = ideaCore(idea);
  const cat = detectIdeaCategory(`${idea} ${a.customer} ${a.value} ${a.mvpScope}`);
  const m = analysis?.marketResearch;
  const b = analysis?.brief;
  const p = analysis?.productStrategy;

  // 우선순위 해석값 (사용자 활성화 값 > AI 분석 값)
  const customer = firstFilled(a.customer, b?.customer);
  const problem = firstFilled(a.problem, b?.problem, m?.customerProblemHypothesis);
  const differentiator = firstFilled(a.differentiator, b?.differentiation, p?.concept);
  const revenue = firstFilled(a.revenue, p?.revenueModel);
  const competitors = firstFilledList(m?.competitors);
  const insights = firstFilledList(m?.insights);
  const opportunities = firstFilledList(m?.opportunities);
  const risks = firstFilledList(m?.risks);
  const mvp = firstFilled(firstFilledList(p?.mvpIncluded), a.mvpScope);

  // 관점/수익화/포지셔닝 fallback 및 추가 조사 항목을 카테고리별로 구성.
  const P = (label: string, primary: string, fb: string) => ({ label, value: primary.trim() || fb });
  let perspectives: { label: string; value: string }[];
  let monetizationFb: string;
  let researchNeeds: string[];
  switch (cat) {
    case 'content_social':
      perspectives = [
        P('타깃 사용자 행동', customer, `${core}을(를) 사용할 사용자가 트렌드를 소비하고 짧은 시간에 반응형 콘텐츠를 만들어 공유하는 행동을 검토합니다.`),
        P('콘텐츠 생성·소비 패턴', '', '짧은 주기로 생성·소비되는 콘텐츠 특성과 반응 속도, 재가공 패턴을 검토합니다.'),
        P('확산 채널', '', 'SNS 공유, 추천 노출, 트렌드 편승 등 콘텐츠가 퍼지는 경로를 검토합니다.'),
        P('유사 서비스 / 대안', competitors, `기존 ${core} 및 유사 콘텐츠 제작·편집 도구와 비교합니다.`),
        P('운영 리스크', risks, '콘텐츠 저작권, 데이터·API 활용 정책, 부적절 콘텐츠 관리 등 운영 리스크를 검토합니다.'),
      ];
      monetizationFb = '프리미엄 생성 기능, 워터마크 제거, 템플릿·기능 확장, 광고 기반 무료 플랜 등을 검토할 수 있습니다.';
      researchNeeds = ['실제 타깃 사용자의 콘텐츠 제작·소비 빈도', 'SNS·플랫폼별 데이터·API 활용 가능 범위와 정책'];
      if (!revenue) researchNeeds.push('유사 서비스의 가격·수익 구조');
      break;
    case 'b2b_saas':
      perspectives = [
        P('구매 의사결정자', customer, `${core} 도입을 결정하는 담당자·조직과 결정 기준을 검토합니다.`),
        P('도입 문제', problem, `현재 업무에서 ${core}이(가) 필요한 병목과 비효율을 검토합니다.`),
        P('기존 업무 방식', '', `${core} 이전에 사용하던 수작업·기존 도구 흐름을 검토합니다.`),
        P('경쟁 솔루션', competitors, `유사 ${core} 솔루션과 기능·가격을 비교합니다.`),
        P('도입 장벽', risks, '보안, 데이터 마이그레이션, 학습 비용 등 도입 장벽을 검토합니다.'),
      ];
      monetizationFb = '시트 기반 구독, 사용량 과금, 기능 티어 등 과금 구조를 검토합니다.';
      researchNeeds = ['실제 도입 조직의 예산·결재 프로세스', '경쟁 솔루션 대비 전환 비용'];
      if (!revenue) researchNeeds.push('경쟁 솔루션의 가격·과금 구조');
      break;
    case 'commerce':
      perspectives = [
        P('구매자 / 판매자 니즈', customer, `${core}의 구매자와 판매자가 각각 기대하는 가치를 검토합니다.`),
        P('상품 / 공급 구조', '', '취급 상품과 공급·재고 구조를 검토합니다.'),
        P('유통 / 판매 채널', '', '상품이 노출·판매되는 채널과 물류 흐름을 검토합니다.'),
        P('경쟁 플랫폼', competitors, `기존 ${core} 및 경쟁 마켓플레이스와 비교합니다.`),
        P('신뢰 / 운영 리스크', risks, '거래 신뢰, 정산, 분쟁 처리 등 운영 리스크를 검토합니다.'),
      ];
      monetizationFb = '거래 수수료, 입점·노출 광고, 구독형 셀러 도구 등을 검토할 수 있습니다.';
      researchNeeds = ['초기 공급(판매자·상품) 확보 가능성', '거래 규모와 단가, 정산 구조'];
      if (!revenue) researchNeeds.push('경쟁 플랫폼의 수수료 구조');
      break;
    default: // app_service
      perspectives = [
        P('주요 사용자', customer, `${core}을(를) 필요로 하는 핵심 사용자군을 검토합니다.`),
        P('사용자가 겪는 문제', problem, `${core} 과정에서 사용자가 겪는 불편과 미충족 니즈를 검토합니다.`),
        P('기존 대안 서비스', competitors, `사용자가 현재 ${core}을(를) 대체하는 방식과 기존 서비스를 비교합니다.`),
        P('초기 MVP 검증 방법', mvp, '핵심 기능을 가진 최소 버전으로 사용자 반응과 재사용률을 검증합니다.'),
      ];
      monetizationFb = `구독, 인앱 결제, 프리미엄 기능 등 ${core}에 맞는 수익 모델을 검토합니다.`;
      researchNeeds = ['실제 사용자 규모와 결제 의향', '핵심 기능의 재사용률·유지율 기준'];
      if (!revenue) researchNeeds.push('경쟁 서비스의 가격 구조');
      break;
  }

  const summary = firstFilled(
    problem && customer ? `${core}에 대한 시장 상황과 사용자 니즈, 대안 서비스 관점을 검토합니다. 핵심 사용자는 ${customer}이며, ${problem}을(를) 해결하는 데 집중합니다.` : '',
    `${core}에 대한 시장 상황과 사용자 니즈, 대안 서비스 관점을 검토합니다.`,
  );
  const positioning = firstFilled(differentiator, `${core}의 핵심 흐름을 단순화해 빠른 실행과 명확한 가치로 차별화합니다.`);
  const monetization = firstFilled(revenue, monetizationFb);

  const sections: string[] = [
    '# 시장 조사',
    `## 시장조사 요약\n${summary}`,
    `## 주요 조사 관점\n${perspectives.map((x) => `### ${x.label}\n${x.value}`).join('\n\n')}`,
    `## 수익화 / 판매 방식\n${monetization}`,
    `## 포지셔닝 / 차별화\n${positioning}`,
  ];
  // AI 분석에 값이 있을 때만 보강 섹션 추가(placeholder 없음).
  if (insights) sections.push(`## 시장 / 사용자 인사이트\n${insights}`);
  if (opportunities) sections.push(`## 시장 기회\n${opportunities}`);
  const refLines = mergeRefs(m?.references, sourceStrings(analysis?.sourceSummaries));
  if (refLines) sections.push(`## 참고 자료 / 레퍼런스\n${refLines}`);

  sections.push(
    `## 추가 조사 필요 항목\n${researchNeeds.length ? researchNeeds.map((s) => `- ${s}`).join('\n') : '- 현재 입력과 분석으로 주요 관점이 채워졌습니다.'}`,
  );
  return sections.join('\n\n');
};

/**
 * 제품화 전략 문서(아이디어 모드) 본문 생성. lean — placeholder 반복 없음.
 * 각 항목: 사용자 입력 > AI 분석 > 아이디어 기반 fallback. 비어있는 확인 항목만 마지막 "추가 확인 필요"로 한 번.
 * (구버전의 시스템/AI에이전트/개발 우선순위 등 placeholder 전용 섹션은 제거 — 제품화 전략 범위로 한정.)
 */
const buildIdeaProductStrategy = (project: Project, a: ProjectActivation, analysis: ActivationAnalysis | undefined): string => {
  const core = ideaCore(a.intent || '');
  const p = analysis?.productStrategy;
  const b = analysis?.brief;
  const concept = firstFilled(a.intent, p?.concept) || `${core}을(를) 핵심 기능부터 빠르게 검증하는 제품으로 구체화합니다.`;
  const problem = firstFilled(a.problem, b?.problem) || `${core} 과정의 불편을 줄이는 것을 목표로 합니다.`;
  const customer = firstFilled(a.customer, b?.customer) || `${core}을(를) 직접 사용하는 핵심 사용자`;
  const value = firstFilled(a.value, b?.value) || `간단한 흐름으로 ${core}의 핵심 가치를 빠르게 전달합니다.`;
  const differentiator = firstFilled(a.differentiator, b?.differentiation) || '복잡한 기능보다 빠른 실행과 확인에 집중합니다.';
  const revenue = firstFilled(a.revenue, p?.revenueModel) || `${core}에 맞는 수익 모델(구독·인앱 결제·프리미엄 기능 등)을 검토합니다.`;
  const asBullets = (s: string) => (s.startsWith('- ') ? s : `- ${s}`);
  const mvpIncluded = asBullets(firstFilled(bulletList(p?.mvpIncluded), a.mvpScope) || '핵심 기능 등록\n- 목록 확인\n- 기본 현황 보기');
  const mvpExcluded = asBullets(firstFilled(bulletList(p?.mvpExcluded), a.laterScope) || '고급 분석·자동화 등은 후속 단계로 분리');
  const policy = bulletList(p?.policyDraft);
  const openQ = bulletList(p?.openQuestions) || '- 초기 사용자 확보·검증 방법\n- 핵심 지표(활성/재방문) 정의';

  const sections: string[] = [
    '# 제품화 전략',
    '## 핵심 원칙\n- 작게 시작해 검증을 우선합니다.\n- 무엇을·왜·어디까지(MVP) 만들지 먼저 정의합니다.\n- 과설계를 피하고 가장 작은 검증 가능한 버전부터 만듭니다.',
    `## 제품 개요\n### 서비스 한 줄 설명\n${concept}\n\n### 문제 정의\n${problem}\n\n### 타깃 사용자\n${customer}\n\n### 차별점\n${differentiator}`,
    `## 핵심 가치 / MVP 검증 포인트\n${value}`,
    `## MVP 범위\n### 포함\n${mvpIncluded}\n\n### 제외 / 후속\n${mvpExcluded}`,
    `## 수익화 구조\n${revenue}`,
  ];
  if (policy) sections.push(`## 운영 / 정책\n${policy}`);
  sections.push(`## 추가 확인 필요\n${openQ}`);
  return sections.join('\n\n');
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

// 요구사항/RFP 모드 브리프(lean). 값 있는 항목만, placeholder 반복 없음. 결손은 마지막 "추가 확인 필요"로 한 번.
const generateRequirementBrief = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  const d = draftFields(a);
  const b = analysis?.brief;
  const reqs = (analysis?.requirements ?? []).some((r) => r.title.trim() || r.description.trim())
    ? renderRequirements(analysis!.requirements, analysis!.sourceSummaries, '')
    : '';
  const customer = firstFilled(a.customer, b?.customer);
  const constraints = bulletList(b?.constraints);
  const openQ = bulletList(analysis?.productStrategy?.openQuestions);

  const sections: string[] = [
    '# 요구사항 브리프',
    `> ${project.name} · 전달받은 요구사항/RFP를 분석한 초안입니다.`,
    `## 요청 요약\n${d.intent()}`,
    `## 프로젝트 목적\n${firstFilled(a.value, b?.value) || `${ideaCore(a.intent || '')}의 목적과 기대 효과를 정리합니다.`}`,
  ];
  if (reqs) sections.push(`## 핵심 요구사항\n${reqs}`);
  if (customer) sections.push(`## 주요 사용자 / 이해관계자\n${customer}`);
  sections.push(`## 적용 방향\n${firstFilled(a.market, b?.differentiation) || '기존 서비스에 적용할 방향 또는 신규 서비스 구성 방향을 정리합니다.'}`);
  if (constraints) sections.push(`## 제약 조건 / 전제\n${constraints}`);
  sections.push('## 후속 작업\n- IA / 기능정의서는 확정된 프로토타입을 기반으로 역작성합니다(초기 미작성).');
  sections.push(
    `## 추가 확인 필요\n${openQ || '- 대상 사용자 / 권한 범위\n- 사용자 앱과 관리자 기능의 경계\n- 연동 / 외부 시스템·로그인 방식\n- 일정·우선순위 제약'}`,
  );
  return sections.join('\n\n');
};

// 요구사항/RFP 모드 시장조사(레퍼런스 조사). lean: 값 있는 항목만, placeholder 반복 없음, GTM 항목 제외.
// 우선순위: 사용자 입력 > AI 분석 > 요구사항 기반 fallback. 외부 확인 필요 항목만 마지막에 한 번.
const generateRequirementReferences = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  const m = analysis?.marketResearch;
  const b = analysis?.brief;
  const problem = firstFilled(a.problem, b?.problem, m?.customerProblemHypothesis) || `요구사항에서 드러난 사용자·업무 문제를 정리합니다.`;
  const apply = firstFilled(a.market, m?.targetMarket) || `요구사항을 기존 서비스·도메인에 적용할 방향을 검토합니다.`;
  const competitors = firstFilled(bulletList(m?.competitors)) || `유사 서비스·대안을 비교해 적용할 부분과 차별점을 검토합니다.`;
  const differentiator = firstFilled(a.differentiator, b?.differentiation) || `요구사항 충족 관점의 차별화 포인트를 검토합니다.`;
  const insights = bulletList(m?.insights);
  const opportunities = bulletList(m?.opportunities);
  const risks = bulletList(m?.risks);
  const refs = mergeRefs(a.references, m?.references, sourceStrings(analysis?.sourceSummaries));

  const sections: string[] = [
    '# 레퍼런스 조사 및 유사 서비스 분석',
    `> ${project.name} · 요구사항을 충족하는 구현 방향과 유사 서비스를 검토합니다.`,
    `## 요구사항에서 드러난 사용자 / 업무 문제\n${problem}`,
    `## 기존 서비스 적용 방향\n${apply}`,
    `## 참고 서비스 / 대안\n${competitors}`,
    `## 차별화 포인트\n${differentiator}`,
  ];
  if (insights) sections.push(`## 시장 / 사용자 관점 인사이트\n${insights}`);
  if (opportunities) sections.push(`## 유사 기능 / 차별화 관점\n${opportunities}`);
  if (risks) sections.push(`## 리스크\n${risks}`);
  if (refs) sections.push(`## 등록된 URL / 참고 자료\n${refs}`);
  sections.push(
    `## 추가 확인 필요\n- 핵심 플로우·권한 구조의 상세 정의\n- 외부 연동 / 로그인 방식\n- 일정·우선순위 제약`,
  );
  return sections.join('\n\n');
};

// 요구사항/RFP 모드 제품화/구현 전략(lean). 값 있는 항목만, placeholder 반복 없음. 결손은 마지막 "추가 확인 필요".
const generateRequirementStrategy = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  const d = draftFields(a);
  const p = analysis?.productStrategy;
  const asB = (s: string) => (s.startsWith('- ') ? s : `- ${s}`);
  const mvpIncluded = firstFilled(bulletList(p?.mvpIncluded), a.mvpScope) || d.mvpScope();
  const mvpExcluded = firstFilled(bulletList(p?.mvpExcluded), a.laterScope) || '고급 기능·자동화 등은 후속 단계로 분리합니다.';
  const policy = bulletList(p?.policyDraft);
  const risks = bulletList(analysis?.marketResearch?.risks);
  const openQ = bulletList(p?.openQuestions);

  const sections: string[] = [
    '# 제품화 전략',
    `> ${project.name} · 요구사항을 제품화·구현 방향으로 구체화합니다.`,
    `## 전략 요약\n${firstFilled(a.intent, p?.concept) || `${ideaCore(a.intent || '')}의 구현 방향을 정리합니다.`}`,
    `## MVP 포함 범위\n${asB(mvpIncluded)}`,
    `## MVP 제외 / 후순위 범위\n${asB(mvpExcluded)}`,
  ];
  if (policy) sections.push(`## 운영 / 정책 고려사항\n${policy}`);
  sections.push(`## 구현 우선순위\n- 1차: ${d.mvpScope()}\n- 후속: ${d.laterScope()}`);
  if (risks) sections.push(`## 리스크\n${risks}`);
  sections.push('## 프로토타입 / 역작성 계획\n- 요구사항을 화면·플로우로 검증하고 의사결정권자 리뷰를 받습니다.\n- 확정 후 화면·주석·플로우를 기반으로 IA / 기능정의서 / PRD를 역작성합니다(초기 미작성).');
  sections.push(
    `## 추가 확인 필요\n${openQ || '- 권한 / 승인 정책\n- 데이터 보관 기준\n- 예외 처리 방식\n- 일정·우선순위 제약'}`,
  );
  return sections.join('\n\n');
};

export const generateBrief = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementBrief(project, a, analysis);
  const d = draftFields(a);
  return `# ${project.name} — 프로젝트 브리프

## 1. 아이디어 요약
${d.intent()}

## 2. 해결하려는 문제
${d.problem()}

## 3. 핵심 고객
${d.customer()}

## 4. 핵심 가치
${d.value()}

## 5. 차별점
${d.differentiator()}

## 6. MVP 범위
${d.mvpScope()}

## 7. 나중에 추가할 기능
${d.laterScope()}

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
 * 시장조사 문서.
 * - 아이디어 모드: buildIdeaMarketResearch — 카테고리별 관점만 선별, [사용자 입력 > AI 분석 > 아이디어 fallback] 순.
 * - 요구사항/RFP 모드: "레퍼런스 조사 및 유사 서비스 분석"으로 생성.
 */
export const generateMarketResearch = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementReferences(project, a, analysis);
  // 아이디어 모드: 카테고리 맞춤 시장조사(고정 14질문 + 빈칸 placeholder 반복 제거). AI 분석값을 우선 반영.
  return buildIdeaMarketResearch(a, analysis);
};

/**
 * 제품화전략 문서.
 * - 아이디어 모드: buildIdeaProductStrategy — lean(placeholder 반복 없음), [사용자 입력 > AI 분석 > 아이디어 fallback] 순.
 * - 요구사항/RFP 모드: "구현 전략 및 프로토타입 제작 계획"으로 생성.
 */
export const generateProductStrategy = (project: Project, a: ProjectActivation, analysis?: ActivationAnalysis): string => {
  if (resolveProjectMode(a) === 'requirement_planning') return generateRequirementStrategy(project, a, analysis);
  // 아이디어 모드: lean 제품화 전략(placeholder 반복 제거, AI 분석값 우선 반영).
  return buildIdeaProductStrategy(project, a, analysis);
};

/**
 * AI 초안 생성 프롬프트에서 구조를 그대로 따르도록 전달하는 시장조사 스켈레톤(헤딩 구조만).
 * 시장조사 범위로 한정한다(랜딩/최소 거래 페이지/고객 수락 체인/첫 고객 확보/검증 순서 등 GTM·검증 항목은 제품화 전략으로 분리).
 * 부족한 항목은 섹션마다 placeholder를 넣지 말고 마지막 "추가 조사 필요 항목"으로 한 번만 모은다.
 */
export const MARKET_RESEARCH_SKELETON = `# 시장조사
## 시장조사 요약
## 주요 사용자 / 시장 니즈
## 유사 서비스 / 대안
## 확산 / 유통 채널
## 수익화 가능성
## 포지셔닝 / 차별화
## 리스크
## 추가 조사 필요 항목`;

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

// 문자열 → 짧은 안정 해시(djb2 → base36). 내부 비교용. 원문/민감정보는 출력하지 않는다.
const hashStr = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/**
 * 기획 산출물 재생성 필요 판단용 내부 fingerprint.
 * activation + activationAnalysis 중 문서 출력에 반영되는 값만 반영한다. (해시만 반환 — 원문 비노출)
 * 같은 입력 → 같은 값. 문서의 sourceFingerprint와 다르면 "재생성 필요".
 */
export const activationDocFingerprint = (
  type: DocumentType,
  a?: ProjectActivation | null,
  analysis?: ActivationAnalysis | null,
): string => {
  const av = a
    ? [a.mode, a.intent, a.problem, a.customer, a.value, a.differentiator, a.revenue, a.market, a.mvpScope, a.laterScope, a.references]
    : [];
  const nv = analysis
    ? [
        JSON.stringify(analysis.brief ?? {}),
        JSON.stringify(analysis.marketResearch ?? {}),
        JSON.stringify(analysis.productStrategy ?? {}),
        JSON.stringify((analysis.requirements ?? []).map((r) => [r.title, r.description, r.required, r.rationale, r.sourceIds])),
        JSON.stringify((analysis.sourceSummaries ?? []).map((s) => [s.label, s.purpose, s.insight])),
      ]
    : [];
  return hashStr([type, ...av, ...nv].map((x) => x ?? '').join(''));
};

/**
 * 활성화 시 자동 생성되는 3개 기본 문서의 초안 페이로드. aiDocs가 있으면 그것을 우선 사용.
 * mode(activation.mode)에 따라 제목·content 프레이밍이 달라진다. DocumentType은 항상 동일.
 * 각 문서에 생성 시점 sourceFingerprint를 포함해 이후 "재생성 필요" 비교에 사용한다.
 */
export const buildActivationDocuments = (
  project: Project,
  a: ProjectActivation,
  aiDocs?: { projectBrief?: string; marketResearch?: string; productStrategy?: string },
  analysis?: ActivationAnalysis,
): Array<Pick<ProjectDocument, 'type' | 'title' | 'content' | 'version' | 'status' | 'sourceFingerprint'>> => {
  const mode = resolveProjectMode(a);
  return [
    {
      type: 'brief',
      title: activationDocTitle('brief', mode),
      content: aiDocs?.projectBrief?.trim() || generateBrief(project, a, analysis),
      version: '1.0',
      status: 'draft',
      sourceFingerprint: activationDocFingerprint('brief', a, analysis),
    },
    {
      type: 'market_research',
      title: activationDocTitle('market_research', mode),
      content: aiDocs?.marketResearch?.trim() || generateMarketResearch(project, a, analysis),
      version: '1.0',
      status: 'draft',
      sourceFingerprint: activationDocFingerprint('market_research', a, analysis),
    },
    {
      type: 'product_strategy',
      title: activationDocTitle('product_strategy', mode),
      content: aiDocs?.productStrategy?.trim() || generateProductStrategy(project, a, analysis),
      version: '1.0',
      status: 'draft',
      sourceFingerprint: activationDocFingerprint('product_strategy', a, analysis),
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
  const d = draftFields(a);
  const byType = (t: DocumentType) => docs.find((d) => d.type === t)?.content?.trim();
  const ia = byType('ia');
  const featureSpec = byType('feature_spec');

  return `# PRD — ${project.name}

## 1. 프로젝트 개요
${firstFilled(project.description, a.intent) || d.intent()}

## 2. 기획 의도
${d.intent()}

## 3. 핵심 고객
${d.customer()}

## 4. 핵심 문제
${d.problem()}

## 5. 핵심 가치
${d.value()}

## 6. 시장조사 요약
- 최초 진입 시장: ${d.market()}
- 핵심 차별점: ${d.differentiator()}

## 7. 제품화전략
- 수익 구조: ${d.revenue()}

## 8. MVP 범위
${d.mvpScope()}

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
- 1순위: ${d.mvpScope()}
- 이후: ${d.laterScope()}

## 16. 제외 범위
${d.laterScope()}

## 17. 검수 기준
- 필수 문서(브리프/시장조사/제품화전략/IA/기능정의서) 작성 완료
- 프로토타입 URL 생성 완료
- 주요 리뷰/댓글 해결 완료
`;
};
