// public_readonly 공유 조회 API (서버 전용) — S7-2B-2
//
// GET /api/share/{shareId}
// 비로그인 사용자가 public_readonly 공유 링크로 "허용된 최소 데이터"만 읽도록 한다.
// firebase-admin(서비스 계정)으로 서버에서만 Firestore를 읽고, sanitize 후 반환한다.
//
// ⚠️ Firestore Rules 의 public read 는 열지 않는다(클라이언트 비로그인 직접 조회 금지).
//    이 라우트만 Admin 권한으로 읽는다.
// ⚠️ 이번 단계는 API + sanitizer 까지만. public viewer UI / public_review·comment 는 후속(S7-2B-3 / S7-2C).
import { adminCol, getAdminInitError } from '@/lib/firebaseAdmin';
import { buildHandoffPackage, type HandoffPrototype } from '@/lib/handoffPackage';
import { DOCUMENT_META } from '@/lib/documents';
import { shareHash } from '@/lib/shareLinks';
import {
  sanitizeDocumentForPublic,
  sanitizeDocumentSummaryForPublic,
  sanitizeProjectForPublic,
  sanitizeScreenForPublic,
  sanitizeShareForPublic,
} from '@/lib/publicShareSanitizer';
import { formatDateTime, getTime, nowMs } from '@/lib/utils';
import type { Project, ProjectDocument, ProjectSource, Screen, ShareRecord } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** S7-2A 생성 규칙과 일치: 'sh' + 22자 base62. */
const SHARE_ID_RE = /^sh[A-Za-z0-9]{22}$/;

type ErrorCode =
  | 'INVALID_SHARE_ID'
  | 'SHARE_NOT_FOUND'
  | 'SHARE_DISABLED'
  | 'SHARE_EXPIRED'
  | 'NOT_PUBLIC_READONLY'
  | 'TARGET_NOT_FOUND'
  | 'ADMIN_NOT_CONFIGURED'
  | 'ADMIN_INIT_FAILED'
  | 'INTERNAL_ERROR';

const fail = (status: number, error: ErrorCode): Response =>
  Response.json({ ok: false, error }, { status });

/** projectId 의 모든 문서 조회 (DOCUMENT_META order 정렬). */
async function loadDocuments(projectId: string): Promise<ProjectDocument[]> {
  const snap = await adminCol('documents').where('projectId', '==', projectId).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProjectDocument);
  return docs.sort(
    (a, b) => (DOCUMENT_META[a.type]?.order ?? 99) - (DOCUMENT_META[b.type]?.order ?? 99),
  );
}

/** project.prototypeLock → 서버 측 HandoffPrototype 재구성 (클라이언트 handleBuildHandoff 와 동일 규칙). */
async function resolveHandoffPrototype(project: Project): Promise<HandoffPrototype | undefined> {
  const lock = project.prototypeLock;
  if (!lock) return undefined;
  if (lock.targetType === 'screen') {
    const sc = await adminCol('screens').doc(lock.targetId).get();
    const name = lock.title || (sc.exists ? (sc.data() as Screen).name : undefined) || '확정 화면';
    return { name, type: 'screen', link: shareHash.screen(lock.targetId) };
  }
  const src = await adminCol('projectSources').doc(lock.targetId).get();
  const data = src.exists ? (src.data() as ProjectSource) : undefined;
  const name = lock.title || data?.title || '외부 프로토타입';
  const url = lock.url || data?.url;
  return { name, type: 'source', url, link: url };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
): Promise<Response> {
  // 0. 서버 설정 확인 (private key/env 상세는 응답에 노출하지 않는다)
  //    설정 누락(ADMIN_NOT_CONFIGURED)과 자격증명 파싱 실패(ADMIN_INIT_FAILED)를 구분한다.
  const initError = getAdminInitError();
  if (initError) return fail(500, initError);

  // 1. shareId 형식 검증
  const { shareId } = await params;
  if (!shareId || !SHARE_ID_RE.test(shareId)) return fail(400, 'INVALID_SHARE_ID');

  try {
    // 2~3. shares 조회 + 존재 확인
    const snap = await adminCol('shares').where('shareId', '==', shareId).limit(1).get();
    if (snap.empty) return fail(404, 'SHARE_NOT_FOUND');
    const share = { id: snap.docs[0].id, ...snap.docs[0].data() } as ShareRecord;

    // 4. 활성 여부
    if (!share.isEnabled) return fail(403, 'SHARE_DISABLED');

    // 5. 만료 여부 (null/미설정이면 만료 없음)
    if (share.expiresAt !== null && share.expiresAt !== undefined) {
      if (getTime(share.expiresAt) <= nowMs()) return fail(403, 'SHARE_EXPIRED');
    }

    // 6. public_readonly 만 통과 (internal/public_review 차단)
    if (share.accessType !== 'public_readonly') return fail(403, 'NOT_PUBLIC_READONLY');

    // 7~8. targetType별 데이터 조회 + sanitize
    const shareMeta = sanitizeShareForPublic(share);

    // project 는 모든 targetType의 공통 컨텍스트
    const projectDoc = await adminCol('projects').doc(share.projectId).get();
    if (!projectDoc.exists) return fail(404, 'TARGET_NOT_FOUND');
    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

    switch (share.targetType) {
      case 'project': {
        const documents = await loadDocuments(share.projectId);
        return Response.json({
          ok: true,
          share: shareMeta,
          data: {
            project: sanitizeProjectForPublic(project),
            documents: documents.map(sanitizeDocumentSummaryForPublic),
          },
        });
      }

      case 'document': {
        if (!share.targetId) return fail(404, 'TARGET_NOT_FOUND');
        const docSnap = await adminCol('documents').doc(share.targetId).get();
        if (!docSnap.exists) return fail(404, 'TARGET_NOT_FOUND');
        const docData = { id: docSnap.id, ...docSnap.data() } as ProjectDocument;
        return Response.json({
          ok: true,
          share: shareMeta,
          data: {
            document: sanitizeDocumentForPublic(docData),
            project: sanitizeProjectForPublic(project),
          },
        });
      }

      case 'screen': {
        if (!share.targetId) return fail(404, 'TARGET_NOT_FOUND');
        const scSnap = await adminCol('screens').doc(share.targetId).get();
        if (!scSnap.exists) return fail(404, 'TARGET_NOT_FOUND');
        const screen = { id: scSnap.id, ...scSnap.data() } as Screen;
        return Response.json({
          ok: true,
          share: shareMeta,
          data: {
            screen: sanitizeScreenForPublic(screen),
            project: sanitizeProjectForPublic(project),
          },
        });
      }

      case 'handoff_package': {
        // Firestore에 저장돼 있지 않으므로 서버에서 재조립 (lib/handoffPackage 순수 함수 재사용).
        const documents = await loadDocuments(share.projectId);
        const prototype = await resolveHandoffPrototype(project);
        const pkg = buildHandoffPackage(project, documents, {
          prototype,
          generatedAt: formatDateTime(nowMs()),
        });
        return Response.json({
          ok: true,
          share: shareMeta,
          data: {
            files: pkg.files.map((f) => ({ filename: f.name, content: f.content })),
            readiness: pkg.readiness,
            project: sanitizeProjectForPublic(project),
          },
        });
      }

      default:
        return fail(404, 'TARGET_NOT_FOUND');
    }
  } catch (err) {
    // 내부 오류 상세(스택/자격증명 등)는 응답에 노출하지 않고 서버 로그로만 남긴다.
    console.error('[api/share] internal error', err);
    return fail(500, 'INTERNAL_ERROR');
  }
}
