// 서버 전용 share 검증 헬퍼 — S7-2C
//
// public_readonly 공유에 대한 "활성 여부" 판정을 한 곳에 모은다.
// (S7-2B-2의 GET /api/share 라우트는 자체 인라인 검증을 그대로 유지 — 회귀 방지. 신규 reviews 라우트가 이 헬퍼를 사용한다.)
// ⚠️ 서버 전용. firebase-admin(Rules 우회)으로만 읽는다. Firestore Rules는 변경하지 않는다.
import { adminCol, isAdminConfigured } from './firebaseAdmin';
import { getTime, nowMs } from './utils';
import type { ShareRecord } from '@/types';

/** S7-2A 생성 규칙과 일치: 'sh' + 22자 base62. */
export const SHARE_ID_RE = /^sh[A-Za-z0-9]{22}$/;

export type ShareResolveError =
  | 'INVALID_SHARE_ID'
  | 'SHARE_NOT_FOUND'
  | 'SHARE_DISABLED'
  | 'SHARE_EXPIRED'
  | 'NOT_PUBLIC_READONLY'
  | 'ADMIN_NOT_CONFIGURED'
  | 'INTERNAL_ERROR';

export type ShareResolveResult =
  | { ok: true; share: ShareRecord }
  | { ok: false; status: number; error: ShareResolveError };

/**
 * shareId → 활성 public_readonly share 판정.
 * 순서: env 설정 → shareId 형식 → 존재 → isEnabled → expiresAt → accessType==='public_readonly'.
 */
export async function resolveActivePublicShare(shareId: string): Promise<ShareResolveResult> {
  if (!isAdminConfigured()) return { ok: false, status: 500, error: 'ADMIN_NOT_CONFIGURED' };
  if (!shareId || !SHARE_ID_RE.test(shareId)) return { ok: false, status: 400, error: 'INVALID_SHARE_ID' };

  const snap = await adminCol('shares').where('shareId', '==', shareId).limit(1).get();
  if (snap.empty) return { ok: false, status: 404, error: 'SHARE_NOT_FOUND' };
  const share = { id: snap.docs[0].id, ...snap.docs[0].data() } as ShareRecord;

  if (!share.isEnabled) return { ok: false, status: 403, error: 'SHARE_DISABLED' };
  if (share.expiresAt !== null && share.expiresAt !== undefined) {
    if (getTime(share.expiresAt) <= nowMs()) return { ok: false, status: 403, error: 'SHARE_EXPIRED' };
  }
  if (share.accessType !== 'public_readonly') return { ok: false, status: 403, error: 'NOT_PUBLIC_READONLY' };

  return { ok: true, share };
}
