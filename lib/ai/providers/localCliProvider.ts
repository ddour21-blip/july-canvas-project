// 로컬 전용 provider. 실제 `claude -p`(사용자 Claude 구독 인증)로 실행한다.
// ⚠️ 서버 전용. ANTHROPIC_API_KEY 사용 금지(구독 CLI 사용 — spawn env에서 빈 값으로 강제).
//    클라이언트 번들 노출 금지(child_process는 run() 내부에서 동적 import).
//    Vercel/Production에서는 AI_PROVIDER가 'local-cli'가 아니므로 이 provider 자체가 선택되지 않는다.
import type { AiProvider, AiRunInput, AiRunResult } from '../provider';

// `claude -p`를 stdin으로 프롬프트를 넣어 실행하고 stdout을 수집한다.
// - ANTHROPIC_API_KEY='' : API 키 과금 경로 차단(구독 인증 강제).
// - timeout 초과 시 프로세스를 종료하고 reject.
async function runClaudeCli(prompt: string, timeoutMs = 120_000): Promise<string> {
  const { spawn } = await import('node:child_process');
  const bin = (process.env.CLAUDE_BIN ?? 'claude').trim() || 'claude';

  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, ['-p'], {
      env: { ...process.env, ANTHROPIC_API_KEY: '' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('claude CLI timeout'));
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err); // 예: ENOENT(claude 미설치)
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export const localCliProvider: AiProvider = {
  id: 'local-cli',
  enabled: true,
  async run(input: AiRunInput): Promise<AiRunResult> {
    // 가드레일: AI_PROVIDER가 명시적으로 'local-cli'일 때만 실제 실행(이중 안전).
    if ((process.env.AI_PROVIDER ?? '').trim() !== 'local-cli') {
      return { ok: false, provider: 'local-cli', reason: 'AI_DISABLED' };
    }
    const prompt = input.prompt?.trim();
    if (!prompt) {
      return { ok: false, provider: 'local-cli', reason: 'ERROR' };
    }
    // task별 timeout: 프로토타입(HTML) 생성은 분석보다 오래 걸려 300초까지 허용. 그 외는 기존 120초.
    const timeoutMs = input.task === 'prototype' ? 300_000 : 120_000;
    try {
      const text = await runClaudeCli(prompt, timeoutMs);
      if (!text.trim()) return { ok: false, provider: 'local-cli', reason: 'ERROR' };
      return { ok: true, provider: 'local-cli', text };
    } catch (err) {
      console.error('[ai] local-cli run failed:', err);
      return { ok: false, provider: 'local-cli', reason: 'ERROR' };
    }
  },
};
