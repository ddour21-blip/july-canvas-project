// Vercel 기본 provider. AI 실행을 완전히 비활성화한다. 네트워크/CLI/키 접근 없음.
import type { AiProvider, AiRunResult } from '../provider';

export const disabledProvider: AiProvider = {
  id: 'disabled',
  enabled: false,
  async run(): Promise<AiRunResult> {
    return { ok: false, provider: 'disabled', reason: 'AI_DISABLED' };
  },
};
