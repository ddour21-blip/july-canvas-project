// activationAnalysis(v2) 초안 생성용 프롬프트 빌더 (서버 전용).
// Claude CLI(`claude -p`)에 단일 프롬프트로 전달한다. 응답은 JSON만(설명문/코드펜스 금지).
// ⚠️ 여기서 키/네트워크를 직접 다루지 않는다 — 프롬프트 문자열만 생성한다.
import type { ActivationAnalysis, ProjectActivation } from '@/types';

export interface ActivationAnalysisPromptInput {
  /** 'idea' = 아이디어 제품화, 'requirements' = 요구사항/RFP. */
  mode: ActivationAnalysis['mode'];
  /** 사용자가 입력한 아이디어/요구사항 원문. */
  idea: string;
  projectName?: string;
  /** 기존 보강 정보(있으면 우선 존중). */
  currentFields?: Partial<ProjectActivation>;
  /** 등록된 참고자료 메타(파일/URL). sourceId는 그대로 보존해 sourceSummaries에 다시 쓴다. */
  sources?: { sourceId: string; label: string; purpose?: string }[];
  /** 이미 일부 작성/수정된 분석(있으면 보완 대상). */
  currentAnalysis?: Partial<ActivationAnalysis> | null;
}

// 반환해야 할 JSON 구조(설명용 — 모델이 그대로 채우도록 명시).
const SCHEMA_HINT = `{
  "mode": "idea" | "requirements",
  "brief": {
    "summary": string,            // 아이디어/요청 내용 요약
    "problem": string,            // 해결하려는 문제
    "customer": string,           // 핵심 고객
    "value": string,              // 핵심 가치
    "differentiation": string,    // 핵심 차별점
    "constraints": string[]       // 제약/전제 조건
  },
  "requirements": [               // 요구사항/RFP 모드에서 주로 채움(아이디어 모드는 비워도 됨)
    { "title": string, "description": string, "required": boolean, "rationale": string, "sourceIds": string[] }
  ],
  "marketResearch": {
    "targetMarket": string,                 // (요구사항) 기존 자사 서비스 적용 부분
    "entryMarket": string,                  // (아이디어) 목표/최초 진입 시장
    "customerProblemHypothesis": string,
    "competitors": string[],                // 경쟁/대안/참고 타사 서비스
    "references": string[],                 // 참고 레퍼런스 링크/자료명
    "insights": string[],
    "opportunities": string[],              // 시장 기회 / 유사 기능·차별화 포인트
    "risks": string[]
  },
  "productStrategy": {
    "concept": string,            // (아이디어) 제품 콘셉트 / (요구사항) 적용 방향
    "mvpIncluded": string[],
    "mvpExcluded": string[],
    "laterFeatures": string[],
    "revenueModel": string,
    "policyDraft": string[],
    "approvalFlow": string,
    "openQuestions": string[]     // 확인 필요/누락 항목
  },
  "sourceSummaries": [            // 입력으로 받은 sources를 그대로 매핑(sourceId/label 유지) + 활용 목적/인사이트
    { "sourceId": string, "label": string, "purpose": string, "insight": string }
  ]
}`;

/** Claude CLI에 넘길 단일 프롬프트 문자열을 만든다. */
export function buildActivationAnalysisPrompt(input: ActivationAnalysisPromptInput): string {
  const sourcesJson = JSON.stringify(input.sources ?? [], null, 0);
  const currentFieldsJson = JSON.stringify(input.currentFields ?? {}, null, 0);
  const currentAnalysisJson = JSON.stringify(input.currentAnalysis ?? {}, null, 0);

  return `당신은 July Canvas의 기획 자동화 어시스턴트입니다.
사용자가 입력한 아이디어/요구사항과 참고자료를 분석해, 기초 기획 산출물(브리프 → 시장조사 → 제품화 전략)의 초안을 만듭니다.

[출력 규칙 — 매우 중요]
- 아래 JSON 구조에 맞는 "JSON 객체 하나만" 출력합니다.
- 설명 문장, 머리말, 코드펜스(\`\`\`), 주석을 절대 포함하지 마세요. 첫 글자는 '{' 여야 합니다.
- 모든 문자열 값은 한국어로 작성합니다.
- 입력 자료가 부족해도 빈 문자열/빈 배열로 두지 말고 합리적인 초안(가설)을 채우고, 불확실한 점은 productStrategy.openQuestions 배열에 "확인 필요" 항목으로 넣으세요.
- 헬스/이너뷰티 관련 표현은 효능을 단정하지 말고 보수적으로 작성하세요.
- requirements는 mode가 "requirements"일 때 충실히 채우고, "idea"이면 비워도 됩니다(대신 productStrategy.mvpIncluded를 채움).
- sourceSummaries는 입력으로 받은 sources의 sourceId/label을 그대로 유지하고, 각 자료의 활용 목적(purpose)과 인사이트(insight)를 채웁니다. sources가 비어 있으면 빈 배열로 둡니다.
- 기존 입력(currentFields)과 작성 중인 분석(currentAnalysis)이 있으면 우선 존중하고 보완합니다.

[JSON 구조]
${SCHEMA_HINT}

[모드]
${input.mode}

[프로젝트명]
${input.projectName?.trim() || '미정'}

[아이디어/요구사항 원문]
${input.idea.trim() || '(비어 있음 — 합리적으로 추론)'}

[기존 보강 정보 currentFields]
${currentFieldsJson}

[등록된 참고자료 sources]
${sourcesJson}

[작성 중인 분석 currentAnalysis]
${currentAnalysisJson}

위 입력을 바탕으로 JSON 객체 하나만 출력하세요.`;
}
