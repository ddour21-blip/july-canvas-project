// 내부 리뷰 관리 API (owner/editor 전용, 서버 전용) — S7-2D
//
// GET /api/projects/{projectId}/reviews → 해당 프로젝트의 외부 public_review 코멘트 목록.
//
// 인증: Authorization: Bearer <Firebase ID token>. firebase-admin 으로 토큰 검증 후
//       해당 프로젝트의 owner/editor 인지 확인(viewer/비로그인 차단).
// ⚠️ 클라이언트는 publicReviews 에 직접 접근하지 않는다. Firestore Rules 변경 없음(admin 우회).
//    응답에서 uid/IP 등 식별 정보는 애초에 저장하지 않으므로 노출되지 않는다.
import { adminCol } from '@/lib/firebaseAdmin';
import { requireProjectEditor } from '@/lib/authServer';
import {
  REVIEW_LIMITS,
  sanitizeReviewForManage,
  type PublicReviewRecord,
} from '@/lib/publicShareSanitizer';
import { getTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVIEWS = 'publicReviews';
const fail = (status: number, error: string): Response => Response.json({ ok: false, error }, { status });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;
  if (!projectId) return fail(400, 'INVALID_PROJECT_ID');

  try {
    const auth = await requireProjectEditor(request, projectId);
    if (!auth.ok) return fail(auth.status, auth.error);

    // 단일 equality 쿼리 후 메모리 정렬(createdAt 내림차순) — 복합 색인 불필요.
    const snap = await adminCol(REVIEWS).where('projectId', '==', projectId).get();
    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as PublicReviewRecord)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
      .slice(0, REVIEW_LIMITS.listMax)
      .map(sanitizeReviewForManage);

    return Response.json({ ok: true, reviews });
  } catch (err) {
    console.error('[api/projects/reviews GET] internal error', err);
    return fail(500, 'INTERNAL_ERROR');
  }
}
