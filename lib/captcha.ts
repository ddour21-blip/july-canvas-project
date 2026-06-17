// CAPTCHA 검증 (env-gated, 서버 전용) — S7-2F
//
// public review POST 봇 차단용. 환경변수로 on/off + provider 제어.
//   PUBLIC_REVIEW_CAPTCHA_ENABLED        : '1'|'true' 이면 활성(서버)
//   PUBLIC_REVIEW_CAPTCHA_SECRET_KEY     : provider 비밀키(서버, siteverify용)
//   NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY : 위젯 site key(클라이언트 노출용)
//
// ⚠️ 로컬/기본은 비활성 → 기존 테스트 그대로 통과. 운영에서 env 설정 시 활성.
// ⚠️ 실제 위젯(프론트) 연동은 후속(provider 연결 필요). 본 모듈은 서버 검증 인터페이스 + Turnstile siteverify 구현.
//    활성인데 secret 미설정이면 fail-closed(검증 실패 처리).

/** 지원 provider (현재 Cloudflare Turnstile 기준 siteverify 구현). */
export const CAPTCHA_PROVIDER = 'turnstile' as const;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** 서버에서 CAPTCHA 활성 여부. */
export function isCaptchaEnabled(): boolean {
  const v = (process.env.PUBLIC_REVIEW_CAPTCHA_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true';
}

export type CaptchaResult = { ok: true } | { ok: false; error: 'CAPTCHA_REQUIRED' | 'CAPTCHA_FAILED' };

/**
 * CAPTCHA 검증. 비활성이면 항상 통과.
 * 활성: token 없으면 CAPTCHA_REQUIRED, 검증 실패(또는 secret 미설정)면 CAPTCHA_FAILED.
 */
export async function verifyCaptcha(token: string | undefined | null): Promise<CaptchaResult> {
  if (!isCaptchaEnabled()) return { ok: true };
  if (!token || !token.trim()) return { ok: false, error: 'CAPTCHA_REQUIRED' };

  const secret = process.env.PUBLIC_REVIEW_CAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, error: 'CAPTCHA_FAILED' }; // 활성인데 secret 없음 = fail-closed

  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success ? { ok: true } : { ok: false, error: 'CAPTCHA_FAILED' };
  } catch {
    return { ok: false, error: 'CAPTCHA_FAILED' };
  }
}
