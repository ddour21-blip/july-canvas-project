// 댓글 모더레이션 API (owner/editor 전용, 서버 전용) — S7-2E
//
// PATCH /api/projects/{projectId}/reviews/{reviewId}  body: { action: 'approve' | 'hide' | 'delete' }
//   approve → status='visible' (public viewer 노출)
//   hide    → status='hidden'  (미노출, 복구 가능)
//   delete  → status='deleted' (소프트 삭제, 모든 목록 제외)
//
// 인증: Authorization: Bearer <Firebase ID token> → owner/editor 검증(requireProjectEditor 재사용).
// ⚠️ 클라이언트는 publicReviews 에 직접 접근하지 않는다. Firestore Rules 변경 없음(admin 우회).
//    대상 리뷰가 해당 projectId 소속인지 확인(타 프로젝트 리뷰 교차 조작 방지).
import { FieldValue } from 'firebase-admin/firestore';
import { adminCol } from '@/lib/firebaseAdmin';
import { requireProjectEditor } from '@/lib/authServer';
import type { ReviewStatus } from '@/lib/publicShareSanitizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVIEWS = 'publicReviews';
const fail = (status: number, error: string): Response => Response.json({ ok: false, error }, { status });

const ACTION_TO_STATUS: Record<string, ReviewStatus> = {
  approve: 'visible',
  hide: 'hidden',
  delete: 'deleted',
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; reviewId: string }> },
): Promise<Response> {
  const { projectId, reviewId } = await params;
  if (!projectId || !reviewId) return fail(400, 'INVALID_PARAMS');

  try {
    const auth = await requireProjectEditor(request, projectId);
    if (!auth.ok) return fail(auth.status, auth.error);

    let body: { action?: unknown };
    try {
      body = await request.json();
    } catch {
      return fail(400, 'INVALID_BODY');
    }
    const action = typeof body.action === 'string' ? body.action : '';
    const nextStatus = ACTION_TO_STATUS[action];
    if (!nextStatus) return fail(400, 'INVALID_ACTION');

    const ref = adminCol(REVIEWS).doc(reviewId);
    const doc = await ref.get();
    // 존재하지 않거나 다른 프로젝트 소속이면 거부(권한 경계: 이 프로젝트 editor는 이 프로젝트 리뷰만 조작).
    if (!doc.exists || doc.data()?.projectId !== projectId) return fail(404, 'REVIEW_NOT_FOUND');

    await ref.update({ status: nextStatus, updatedAt: FieldValue.serverTimestamp() });
    return Response.json({ ok: true, status: nextStatus });
  } catch (err) {
    console.error('[api/projects/reviews PATCH] internal error', err);
    return fail(500, 'INTERNAL_ERROR');
  }
}
