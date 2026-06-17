// public_readonly 공유 코멘트 API (서버 전용) — S7-2C
//
// GET  /api/share/{shareId}/reviews  → 해당 공유의 visible 코멘트 목록
// POST /api/share/{shareId}/reviews  → 비로그인 코멘트 작성
//
// ⚠️ Firestore Rules 의 public read/write 는 열지 않는다. 클라이언트는 publicReviews 컬렉션에
//    직접 접근하지 않고, 이 라우트가 firebase-admin(Rules 우회)으로만 읽고 쓴다.
// ⚠️ 비로그인 사용자의 uid/IP 는 요구·저장하지 않는다.
// TODO(S7-2C+): reCAPTCHA/레이트리밋/스팸 방지 — 이번 단계는 보류(미구현). 운영 전 반드시 추가.
import { FieldValue } from 'firebase-admin/firestore';
import { adminCol } from '@/lib/firebaseAdmin';
import { resolveActivePublicShare } from '@/lib/shareServer';
import {
  REVIEW_DEFAULT_AUTHOR,
  REVIEW_LIMITS,
  sanitizeReviewForPublic,
  type PublicReviewRecord,
} from '@/lib/publicShareSanitizer';
import { getTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVIEWS = 'publicReviews';

const fail = (status: number, error: string): Response => Response.json({ ok: false, error }, { status });

/** 해당 share 의 visible 코멘트 목록 (createdAt 오름차순). 단일 equality 쿼리 후 메모리 정렬 — 복합 색인 불필요. */
async function listReviews(shareId: string) {
  const snap = await adminCol(REVIEWS).where('shareId', '==', shareId).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as PublicReviewRecord)
    .filter((r) => r.status === 'visible')
    .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt))
    .slice(0, REVIEW_LIMITS.listMax);
  return rows.map(sanitizeReviewForPublic);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
): Promise<Response> {
  const { shareId } = await params;
  try {
    const resolved = await resolveActivePublicShare(shareId);
    if (!resolved.ok) return fail(resolved.status, resolved.error);
    return Response.json({ ok: true, reviews: await listReviews(shareId) });
  } catch (err) {
    console.error('[api/share/reviews GET] internal error', err);
    return fail(500, 'INTERNAL_ERROR');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
): Promise<Response> {
  const { shareId } = await params;
  try {
    const resolved = await resolveActivePublicShare(shareId);
    if (!resolved.ok) return fail(resolved.status, resolved.error);
    const share = resolved.share;

    let body: { authorName?: unknown; content?: unknown };
    try {
      body = await request.json();
    } catch {
      return fail(400, 'INVALID_BODY');
    }

    // content: 필수, 트림 후 1자 이상 / 상한 초과 차단.
    const content = (typeof body.content === 'string' ? body.content : '').trim();
    if (!content) return fail(400, 'EMPTY_CONTENT');
    if (content.length > REVIEW_LIMITS.contentMax) return fail(400, 'CONTENT_TOO_LONG');

    // authorName: 선택, 비면 '익명'. 상한 초과 차단(자르지 않고 거부).
    const rawName = (typeof body.authorName === 'string' ? body.authorName : '').trim();
    if (rawName.length > REVIEW_LIMITS.authorNameMax) return fail(400, 'NAME_TOO_LONG');
    const authorName = rawName || REVIEW_DEFAULT_AUTHOR;

    const ref = await adminCol(REVIEWS).add({
      shareId,
      projectId: share.projectId,
      targetType: share.targetType,
      ...(share.targetId ? { targetId: share.targetId } : {}),
      authorName,
      content,
      status: 'visible',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 방금 작성한 코멘트를 즉시 반환(서버 타임스탬프는 아직 미확정일 수 있어 클라가 목록 갱신으로 보정).
    return Response.json(
      {
        ok: true,
        review: { id: ref.id, authorName, content },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[api/share/reviews POST] internal error', err);
    return fail(500, 'INTERNAL_ERROR');
  }
}
