// 미래 Console API 전환용 stub. 이번 단계에서 실제 Anthropic API 호출은 구현하지 않는다.
// run() 은 호출 시 명시적으로 미구현 에러를 던진다.
import type { AiProvider, AiRunResult } from '../provider';

export const apiProvider: AiProvider = {
  id: 'api',
  enabled: false, // 스텁 — 아직 실행 불가.
  async run(): Promise<AiRunResult> {
    throw new Error('API provider is not implemented yet');
  },
};
