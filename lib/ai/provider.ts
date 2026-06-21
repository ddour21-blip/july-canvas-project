// AI Provider 추상화 (서버 전용).
// AI_PROVIDER 환경변수로 실행 주체를 선택한다. 기본값 'disabled'(Vercel 안전 기본).
// ⚠️ 클라이언트에서 import 금지 — CLI/키/네트워크 접근이 번들에 노출되면 안 된다.
//    (런타임 가드 + 사용처를 서버 라우트로 한정해 노출을 방지한다.)
import { disabledProvider } from './providers/disabledProvider';
import { localCliProvider } from './providers/localCliProvider';
import { apiProvider } from './providers/apiProvider';

export type AiProviderId = 'disabled' | 'local-cli' | 'api';

export interface AiRunInput {
  /** 실행 작업 식별자 (예: 'activation-draft'). 6단계 파이프라인에서 확장. */
  task: string;
  /** 자유 프롬프트(선택). */
  prompt?: string;
  /** 구조화 입력 페이로드(선택). */
  payload?: unknown;
}

export type AiRunFailReason = 'AI_DISABLED' | 'CLI_NOT_READY' | 'NOT_IMPLEMENTED' | 'ERROR';

export interface AiRunResult {
  ok: boolean;
  provider: AiProviderId;
  /** 실패/비활성 사유 (ok=false 일 때). */
  reason?: AiRunFailReason;
  /** provider 가 생성한 원문 텍스트 (ok=true 일 때). 이번 단계에서는 미사용. */
  text?: string;
}

export interface AiProvider {
  readonly id: AiProviderId;
  /** AI 실행을 이 provider 로 시도할 가치가 있는지 (run 호출 여부 판단). */
  readonly enabled: boolean;
  run(input: AiRunInput): Promise<AiRunResult>;
}

/**
 * AI_PROVIDER → provider 선택. 서버 전용.
 * - 미설정/오타 → 'disabled'(안전 기본, Vercel 정책).
 */
export function getAiProvider(): AiProvider {
  if (typeof window !== 'undefined') {
    throw new Error('getAiProvider() is server-only and must not run in the browser.');
  }
  const id = (process.env.AI_PROVIDER ?? 'disabled').trim() as AiProviderId;
  switch (id) {
    case 'local-cli':
      return localCliProvider;
    case 'api':
      return apiProvider;
    case 'disabled':
    default:
      return disabledProvider;
  }
}
