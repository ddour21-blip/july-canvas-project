// 서버 전용 인증/권한 검증 — S7-2D
//
// 내부 관리 API(owner/editor 전용)에서 사용한다.
// - Authorization: Bearer <Firebase ID token> 검증(firebase-admin auth) → uid
// - 해당 프로젝트의 역할(owner/editor) 판정(firebase-admin firestore)
//   → Firestore Rules 의 roleFor(projectMembers det-id → projects.roleByUid → ownerId)와 동일한 우선순위.
// ⚠️ 서버 전용. Firestore Rules 는 변경하지 않는다.
import { adminCol, getAdminAuth, isAdminConfigured } from './firebaseAdmin';
import type { ProjectRole } from '@/types';

export type AuthError = 'ADMIN_NOT_CONFIGURED' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'PROJECT_NOT_FOUND';

export type RequireEditorResult =
  | { ok: true; uid: string; role: ProjectRole }
  | { ok: false; status: number; error: AuthError };

/** Authorization 헤더의 Bearer 토큰 추출. */
function bearerToken(request: Request): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

/** ID 토큰 검증 → uid. 실패 시 null. */
async function verifyUid(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * 프로젝트 역할 판정 (Rules roleFor 와 동일 우선순위).
 * projectMembers/{projectId}_{uid} → projects.roleByUid[uid] → (ownerId 없음/일치 → owner) → viewer.
 */
async function getProjectRole(projectId: string, uid: string): Promise<ProjectRole | null> {
  const pm = await adminCol('projectMembers').doc(`${projectId}_${uid}`).get();
  if (pm.exists) {
    const r = (pm.data()?.role as ProjectRole | undefined) ?? null;
    if (r) return r;
  }
  const p = await adminCol('projects').doc(projectId).get();
  if (!p.exists) return null;
  const data = p.data() ?? {};
  const roleByUid = (data.roleByUid as Record<string, ProjectRole> | undefined) ?? undefined;
  if (roleByUid && roleByUid[uid]) return roleByUid[uid];
  if (!data.ownerId || data.ownerId === uid) return 'owner';
  return 'viewer';
}

/**
 * 요청 사용자가 해당 프로젝트의 owner/editor 인지 검증.
 * 비로그인/토큰무효 → 401, viewer/비멤버 → 403.
 */
export async function requireProjectEditor(
  request: Request,
  projectId: string,
): Promise<RequireEditorResult> {
  if (!isAdminConfigured()) return { ok: false, status: 500, error: 'ADMIN_NOT_CONFIGURED' };
  const uid = await verifyUid(request);
  if (!uid) return { ok: false, status: 401, error: 'UNAUTHENTICATED' };
  const role = await getProjectRole(projectId, uid);
  if (role === null) return { ok: false, status: 404, error: 'PROJECT_NOT_FOUND' };
  if (role !== 'owner' && role !== 'editor') return { ok: false, status: 403, error: 'FORBIDDEN' };
  return { ok: true, uid, role };
}
