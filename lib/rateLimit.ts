// 서버 사이드 레이트리밋 — S7-2F
//
// 비로그인 public review POST 남용 방지. firebase-admin(Rules 우회)로 rateLimits 컬렉션에만 기록한다.
// ⚠️ raw IP/UA 를 저장하지 않는다. IP+UA 를 HMAC-SHA256 해시(clientHash)로만 저장한다.
//    해시 secret 은 PUBLIC_REVIEW_HASH_SECRET(서버 env). 미설정 시 폴백 상수(개발용) — 운영에선 반드시 설정.
// ⚠️ 서버 전용. 클라이언트는 rateLimits 에 직접 접근하지 않는다(Rules 미등록 = 기본 거부).
import { createHmac } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminCol, getAdminDb } from './firebaseAdmin';
import { nowMs } from './utils';

/** 레이트리밋 정책 (코드 상수로 분리). */
export const RATE_LIMITS = {
  /** 같은 클라이언트 + 같은 shareId: 60초에 3회. */
  perShare: { max: 3, windowMs: 60_000 },
  /** 같은 클라이언트 전체 public review POST: 600초에 10회. */
  global: { max: 10, windowMs: 600_000 },
} as const;

const HASH_FALLBACK = 'july-canvas-dev-ratelimit-secret';

/** 요청에서 IP/UA 를 추출해 HMAC 해시(clientHash) 생성. raw 값은 반환/저장하지 않는다. */
export function clientHash(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') || '';
  const ip = xff.split(',')[0].trim() || request.headers.get('x-real-ip') || 'noip';
  const ua = request.headers.get('user-agent') || 'noua';
  const secret = process.env.PUBLIC_REVIEW_HASH_SECRET || HASH_FALLBACK;
  return createHmac('sha256', secret).update(`${ip}|${ua}`).digest('hex').slice(0, 32);
}

/**
 * 만료 시각 필드. Firestore Native TTL은 Timestamp 필드를 요구하므로 `expiresAt`(Timestamp)에 TTL을 건다.
 * 비교 로직은 `windowStart`(ms)를 쓰지만, ms 참조가 필요할 경우를 위해 `expiresAtMs`도 병행 저장한다.
 */
const expiryFields = (atMs: number) => ({ expiresAt: Timestamp.fromMillis(atMs), expiresAtMs: atMs });

/** 단일 키 고정 윈도우 카운터. 허용이면 true(카운트 증가), 초과면 false(증가 안 함). */
async function hit(key: string, max: number, windowMs: number): Promise<boolean> {
  const ref = adminCol('rateLimits').doc(key);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = nowMs();
    if (!snap.exists) {
      tx.set(ref, {
        key,
        count: 1,
        windowStart: now,
        ...expiryFields(now + windowMs),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    }
    const d = snap.data() as { count: number; windowStart: number };
    if (now - d.windowStart >= windowMs) {
      // 윈도우 만료 → 리셋.
      tx.update(ref, { count: 1, windowStart: now, ...expiryFields(now + windowMs), updatedAt: FieldValue.serverTimestamp() });
      return true;
    }
    if (d.count >= max) return false; // 초과 — 증가하지 않음.
    tx.update(ref, { count: d.count + 1, ...expiryFields(d.windowStart + windowMs), updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/**
 * public review POST 레이트리밋 강제.
 * per-share(분당) → global(10분) 순으로 검사. 초과 시 false.
 */
export async function allowReviewPost(request: Request, shareId: string): Promise<boolean> {
  const ch = clientHash(request);
  const perShare = await hit(`s:${shareId}:${ch}`, RATE_LIMITS.perShare.max, RATE_LIMITS.perShare.windowMs);
  if (!perShare) return false;
  const global = await hit(`g:${ch}`, RATE_LIMITS.global.max, RATE_LIMITS.global.windowMs);
  return global;
}
