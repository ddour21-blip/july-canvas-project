// 클릭형 프로토타입의 "화면 구조(PrototypeSpec) JSON" 생성용 프롬프트 빌더 (서버 전용).
// ⚠️ Claude는 HTML/CSS/JS를 만들지 않는다 — 짧은 화면 구조 JSON만 반환한다.
//    HTML 변환은 lib/ai/prototypeHtmlTemplate.ts(buildPrototypeHtmlFromSpec)가 담당한다.
import type { ActivationAnalysis, ProjectActivation } from '@/types';

export interface PrototypePromptInput {
  projectName?: string;
  activationAnalysis?: Partial<ActivationAnalysis> | null;
  /** 기초 문서 3종 content(마크다운). 일부 없으면 빈 문자열 — 모델이 합리적 가정으로 보완. */
  documents?: { brief?: string; marketResearch?: string; productStrategy?: string };
}

const clip = (s: string | undefined, max = 4000): string => {
  const t = (s ?? '').trim();
  return t.length > max ? `${t.slice(0, max)}\n…(이하 생략)` : t || '(자료 없음 — 합리적으로 가정)';
};

// 반환 JSON 구조(설명용 — HTML이 아니라 화면 구조만).
const SPEC_HINT = `{
  "title": string,            // 서비스명처럼 자연스럽게 (예: "트립노트", "케어로그"). "MVP/프로토타입" 같은 단어 금지
  "description": string,      // 한 줄 설명
  "productType": "mobile-app" | "web-app" | "admin" | "landing",
  "visualTone": "clean" | "premium" | "friendly" | "professional" | "playful",
  "primaryColor": string,     // #06C755 처럼 서비스에 어울리는 hex 한 가지
  "screens": [                // 4~5개 권장(최소 3)
    {
      "id": string,           // 영문 소문자 kebab-case (예: "home", "input", "result")
      "name": string,         // 탭/화면 이름(짧게)
      "layout": "home" | "input" | "result" | "dashboard" | "detail" | "pricing" | "settings",
      "purpose": string,      // 이 화면의 목적(한 줄)
      "headline": string,     // 화면 헤드라인(짧게)
      "body": string,         // 1~2문장 설명
      "primaryAction": { "label": string, "targetScreenId": string } | null,
      "secondaryAction": { "label": string, "targetScreenId": string } | null,
      "cards": [ { "title": string, "body": string, "targetScreenId": string } ],     // 0~6 (home/pricing/detail에서 활용)
      "formFields": [ { "label": string, "placeholder": string } ],                   // input layout에서 필수(1~4개)
      "metrics": [ { "label": string, "value": string, "caption": string } ],         // result/dashboard에서 활용(2~4개)
      "listItems": [ { "title": string, "body": string } ]                            // result/dashboard/detail에서 활용
    }
  ]
}`;

/** Claude CLI에 넘길 단일 프롬프트 문자열을 만든다. */
export function buildPrototypePrompt(input: PrototypePromptInput): string {
  const analysisJson = JSON.stringify(input.activationAnalysis ?? {}, null, 0);
  return `당신은 July Canvas의 프로토타입 화면 설계 어시스턴트입니다.
아래 기초 기획 문서(브리프 / 시장조사 / 제품화 전략)와 분석(activationAnalysis)을 바탕으로,
클릭 가능한 프로토타입의 "화면 구조"를 짧은 JSON으로 설계합니다.

[매우 중요 — 무엇을 만들지]
- HTML / CSS / JavaScript 를 절대 만들지 마세요.
- 화면 구조(PrototypeSpec) JSON "객체 하나만" 출력합니다. (HTML 문자열 반환 금지)
- 설명 문장 / 머리말 / 코드펜스(\`\`\`) 금지. 첫 글자는 '{' 여야 합니다.
- 모든 문자열 값은 한국어로 짧고 명확하게.

[규칙]
- screens 는 4~5개 권장(최소 3개).
- title 에 "MVP / 프로토타입 / 데모" 같은 단어를 넣지 말고, 실제 서비스명처럼 자연스럽게 작성하세요.
- 각 screen 의 id 는 영문 소문자 kebab-case, 서로 중복되지 않게.
- 각 화면은 서로 다른 layout 을 갖게 하세요. 가능하면 home + input + result + (pricing 또는 dashboard) + (detail) 조합으로 구성합니다.
- layout 별 데이터 규칙:
  - input  → formFields 를 반드시 포함(1~4개).
  - result → metrics 와 listItems(또는 cards)를 포함.
  - dashboard → metrics 와 listItems 를 포함.
  - pricing → cards 를 요금제/플랜처럼 구성(예: 무료/프리미엄).
  - home → cards 를 핵심 가치 소개로, hero 카피(headline/body) 충실히.
  - detail → listItems 를 단계/기능 설명으로.
- primaryAction.targetScreenId / secondaryAction.targetScreenId / cards[].targetScreenId 는 반드시 screens 안에 "실제로 존재하는 id"여야 합니다(화면 간 이동 관계).
- 입력 → 결과 → 프리미엄(또는 대시보드) 흐름이 자연스럽게 이해되도록 연결하세요.
- 카피는 실제 앱처럼 짧고 구체적으로(문서 요약체 금지). body/purpose는 1~2문장.
- 실제 로그인/결제/네트워크 동작은 가정하지 말고, 화면 전환 흐름만 설계합니다.
- 헬스/이너뷰티 관련 문구는 효능을 단정하지 말고 보수적으로.
- primaryColor 는 서비스 톤에 맞는 hex 한 가지(예: #06C755, #2563EB, #7C3AED 등).
- 자료가 부족하면 합리적인 가정으로 보완해서라도 4~5개 화면을 완성합니다.

[JSON 구조]
${SPEC_HINT}

[프로젝트명]
${input.projectName?.trim() || '미정'}

[activationAnalysis(JSON)]
${analysisJson}

[브리프 문서]
${clip(input.documents?.brief)}

[시장조사 문서]
${clip(input.documents?.marketResearch)}

[제품화 전략 문서]
${clip(input.documents?.productStrategy)}

위 내용을 바탕으로 PrototypeSpec JSON 객체 하나만 출력하세요.`;
}
