// 로컬 전용 provider. 추후 `claude -p`(사용자 Claude 구독 인증)로 실행한다.
// ⚠️ 서버 전용. ANTHROPIC_API_KEY 사용 금지(구독 CLI 사용). 클라이언트 번들 노출 금지.
//    이번 단계는 인터페이스만 준비 — 실제 CLI 실행(spawn)은 다음 단계에서 연결한다.
import type { AiProvider, AiRunInput, AiRunResult } from '../provider';

export const localCliProvider: AiProvider = {
  id: 'local-cli',
  enabled: true,
  async run(_input: AiRunInput): Promise<AiRunResult> {
    // ── 다음 단계 연결 지점(이번 단계 미실행) ─────────────────────────────
    // const { spawn } = await import('node:child_process');
    // 구독 인증을 강제하기 위해 ANTHROPIC_API_KEY 를 빈 값으로 덮어쓴다(가드레일).
    // const child = spawn('claude', ['-p', _input.prompt ?? ''], {
    //   env: { ...process.env, ANTHROPIC_API_KEY: '' },
    // });
    // ... stdout 수집 → { ok: true, provider: 'local-cli', text } 반환, 실패 시 reason: 'ERROR'
    // ───────────────────────────────────────────────────────────────────
    return { ok: false, provider: 'local-cli', reason: 'CLI_NOT_READY' };
  },
};
