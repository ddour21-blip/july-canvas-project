// 아이디어 → 보강 필드 자동 분해 + 기획 문서 초안 생성.
// 서버 전용. ANTHROPIC_API_KEY가 있으면 Claude로 생성, 없거나 실패하면 템플릿으로 graceful fallback.
import Anthropic from '@anthropic-ai/sdk';
import {
  generateBrief,
  generateMarketResearch,
  generateProductStrategy,
  MARKET_RESEARCH_SKELETON,
  PRODUCT_STRATEGY_SKELETON,
} from '@/lib/documents';
import { EMPTY_ACTIVATION, type ActivationDraftResult, type Project, type ProjectActivation } from '@/types';

interface GenerateInput {
  idea: string;
  currentFields?: Partial<ProjectActivation>;
  projectName?: string;
}

// 생성 함수가 채우는 10개 보강 필드 (기존 ProjectActivation 그대로).
const FIELD_KEYS: (keyof ProjectActivation)[] = [
  'intent', 'problem', 'customer', 'value', 'differentiator',
  'revenue', 'market', 'mvpScope', 'laterScope', 'references',
];

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fields: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(FIELD_KEYS.map((k) => [k, { type: 'string' }])),
      required: FIELD_KEYS,
    },
    documents: {
      type: 'object',
      additionalProperties: false,
      properties: {
        projectBrief: { type: 'string' },
        marketResearch: { type: 'string' },
        productStrategy: { type: 'string' },
      },
      required: ['projectBrief', 'marketResearch', 'productStrategy'],
    },
  },
  required: ['fields', 'documents'],
} as const;

const mergeFields = (idea: string, current?: Partial<ProjectActivation>): ProjectActivation => ({
  ...EMPTY_ACTIVATION,
  ...(current ?? {}),
  intent: idea.trim() || current?.intent || '',
});

const projectFor = (name?: string): Project => ({ id: '', name: name?.trim() || '프로젝트', ownerId: null });

// AI 키가 없을 때 보강 정보 필드를 비워두지 않도록 채우는 편집형 가이드(데이터가 아닌 안내문).
const TEMPLATE_SEED: Record<Exclude<keyof ProjectActivation, 'intent'>, string> = {
  problem: '해결하려는 핵심 문제를 적어주세요.',
  customer: '핵심 고객(타겟 사용자)을 적어주세요.',
  value: '고객에게 주는 핵심 가치를 적어주세요.',
  differentiator: '경쟁·대안 대비 차별점을 적어주세요.',
  revenue: '수익 구조(어떻게 돈을 버는가)를 적어주세요.',
  market: '가장 먼저 공략할 시장/세그먼트를 적어주세요.',
  mvpScope: '검증할 최소 기능(MVP)을 적어주세요.',
  laterScope: 'MVP 이후 확장 기능을 적어주세요.',
  references: '참고 서비스/경쟁사/조사할 레퍼런스를 적어주세요.',
};

/** 키 없음/실패 시 템플릿으로 fields + documents 구성. */
function templateDraft(input: GenerateInput, mode: ActivationDraftResult['mode'], reason?: string): ActivationDraftResult {
  // 문서는 실제 입력값(빈 곳은 안내문) 기준으로 생성하고,
  // UI로 돌려줄 fields는 빈 항목을 편집형 가이드로 채워 "자동 채워짐"을 보장한다.
  const docFields = mergeFields(input.idea, input.currentFields);
  const uiFields: ProjectActivation = { ...docFields };
  (Object.keys(TEMPLATE_SEED) as Exclude<keyof ProjectActivation, 'intent'>[]).forEach((k) => {
    if (!uiFields[k]?.trim()) uiFields[k] = TEMPLATE_SEED[k];
  });
  const project = projectFor(input.projectName);
  return {
    ok: true,
    mode,
    ...(reason ? { reason } : {}),
    fields: uiFields,
    documents: {
      projectBrief: generateBrief(project, docFields),
      marketResearch: generateMarketResearch(project, docFields),
      productStrategy: generateProductStrategy(project, docFields),
    },
  };
}

const SYSTEM_PROMPT = `당신은 July Canvas의 기획 자동화 어시스턴트입니다. 사용자가 자유롭게 입력한 서비스 아이디어를 분석해, 한국어로 다음을 생성합니다.

1) fields — 아이디어를 아래 10개 항목으로 분해. 각 항목은 1~3문장. 모르면 합리적으로 추론하되 불확실하면 "(가설)"을 덧붙입니다. 빈 문자열 금지.
   - intent: 서비스 한 줄 요약 + 기획 의도
   - problem: 해결하려는 문제
   - customer: 핵심 고객
   - value: 핵심 가치
   - differentiator: 차별점
   - revenue: 수익 구조
   - market: 최초 진입 시장 / 세분화 시장
   - mvpScope: MVP 범위
   - laterScope: 나중에 추가할 기능
   - references: 참고 서비스 / 경쟁사 / 조사해야 할 레퍼런스
   - 사용자가 이미 입력한 보강 정보(currentFields)가 있으면 우선 존중하고 보완합니다.

2) documents.marketResearch — 아래 "시장 조사 전략 및 방법" 템플릿 구조를 정확히 따르고, 모든 섹션을 아이디어에 맞게 구체화합니다. 모르는 항목은 "조사 필요: ..." 처럼 무엇을 조사해야 하는지 적습니다. 빈 템플릿 금지. 실행 가능한 체크리스트처럼 작성.
${MARKET_RESEARCH_SKELETON}

3) documents.productStrategy — 아래 "아이디어 제품화 전략" 템플릿 구조를 정확히 따릅니다. 개발자가 바로 다음 작업을 판단할 수 있게 구체적으로. "## 10. /goal 후보 3개"는 실제 복사해서 쓸 수 있는 수준으로 3개를 작성(각: 목표 / 왜 지금 / 수정 범위 / 완료 기준 / 제약 / 검증 명령어 / 리스크 / 예상 소요 시간).
${PRODUCT_STRATEGY_SKELETON}

4) documents.projectBrief — 위 fields를 바탕으로 자연스러운 프로젝트 브리프(마크다운). 서비스 요약/문제/고객/가치/차별점/수익/시장/MVP/추가기능/레퍼런스 포함.

모든 문서는 마크다운. 응답은 지정된 JSON 스키마에 맞춰 fields와 documents만 담습니다.`;

/**
 * 아이디어 기반 초안 생성. 항상 ok:true로 반환(graceful) — 키 없음/오류 시 template 모드.
 * 이 함수는 Firestore에 쓰지 않습니다. 클라이언트가 기존 권한 흐름으로 저장합니다.
 */
export async function generateActivationDraft(input: GenerateInput): Promise<ActivationDraftResult> {
  if (!input.idea?.trim()) {
    return templateDraft(input, 'template', '아이디어가 비어 있습니다.');
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return templateDraft(input, 'template', 'ANTHROPIC_API_KEY is not configured');
  }

  try {
    const client = new Anthropic({ apiKey });
    const userContent = `아이디어:\n${input.idea.trim()}\n\n현재 입력된 보강 정보(있으면 우선 반영, 비어 있으면 무시):\n${JSON.stringify(
      input.currentFields ?? {},
    )}\n\n프로젝트명: ${input.projectName?.trim() || '미정'}`;

    // 긴 구조화 출력이므로 스트리밍으로 받아 타임아웃을 피하고 최종 메시지를 조립.
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema: DRAFT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    } as Anthropic.MessageStreamParams);

    const message = await stream.finalMessage();
    const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
    if (!text) throw new Error('빈 응답');

    const parsed = JSON.parse(text) as {
      fields: Record<string, string>;
      documents: { projectBrief: string; marketResearch: string; productStrategy: string };
    };

    // 누락 필드는 현재값/빈값으로 보정.
    const base = mergeFields(input.idea, input.currentFields);
    const fields = { ...base } as ProjectActivation;
    for (const k of FIELD_KEYS) {
      const v = parsed.fields?.[k];
      if (typeof v === 'string' && v.trim()) fields[k] = v.trim();
    }

    return {
      ok: true,
      mode: 'ai',
      fields,
      documents: {
        projectBrief: parsed.documents?.projectBrief?.trim() || generateBrief(projectFor(input.projectName), fields),
        marketResearch: parsed.documents?.marketResearch?.trim() || generateMarketResearch(projectFor(input.projectName), fields),
        productStrategy: parsed.documents?.productStrategy?.trim() || generateProductStrategy(projectFor(input.projectName), fields),
      },
    };
  } catch (err) {
    console.error('AI activation draft failed, falling back to template:', err);
    return templateDraft(input, 'template', err instanceof Error ? err.message : 'AI 생성 실패');
  }
}
