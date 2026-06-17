'use client';
// public_readonly 공유 뷰어 (비로그인 외부 사용자용) — S7-2B-3
//
// 동작: GET /api/share/{shareId} 만 호출(서버 매개). Firebase client 직접 접근 없음.
// 보안:
//  - 모든 본문(document.content / handoff 파일 / screen.code)은 React 텍스트 노드로만 렌더한다.
//    dangerouslySetInnerHTML 미사용 → JSX가 자동 이스케이프하므로 <script> 등은 실행되지 않고
//    문자 그대로 보인다. ScreenEditor의 iframe/HTML 렌더 구조를 복사하지 않는다.
//  - 편집/로그인/승인/삭제/공유관리 UI 없음(읽기 전용).
import { useEffect, useState } from 'react';
import { REVIEW_LIMITS } from '@/lib/publicShareSanitizer';
import type {
  PublicDocument,
  PublicDocumentSummary,
  PublicProject,
  PublicReview,
  PublicScreen,
  PublicShare,
} from '@/lib/publicShareSanitizer';

interface HandoffFileView {
  filename: string;
  content: string;
}
interface HandoffReadinessView {
  brief: boolean;
  market: boolean;
  strategy: boolean;
  ia: boolean;
  featureSpec: boolean;
  prototype: boolean;
}

type ShareData =
  | { project: PublicProject; documents: PublicDocumentSummary[] }
  | { document: PublicDocument; project: PublicProject }
  | { screen: PublicScreen; project: PublicProject }
  | { files: HandoffFileView[]; readiness: HandoffReadinessView; project: PublicProject };

interface ShareSuccess {
  ok: true;
  share: PublicShare;
  data: ShareData;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; code: string; title: string; detail: string }
  | { kind: 'ok'; payload: ShareSuccess };

const TARGET_LABEL: Record<string, string> = {
  project: '프로젝트',
  document: '문서',
  screen: '프로토타입 화면',
  handoff_package: '개발 전달 패키지',
};

const DOC_TYPE_LABEL: Record<string, string> = {
  brief: '브리프',
  market_research: '시장조사',
  product_strategy: '제품화전략',
  ia: 'IA (정보구조)',
  feature_spec: '기능정의서',
  prd: 'PRD',
};

/** API error code / HTTP status → 사용자용 안내(읽기 전용). */
function describeError(code: string | undefined, status: number): { title: string; detail: string } {
  switch (code) {
    case 'INVALID_SHARE_ID':
      return { title: '잘못된 공유 링크', detail: '공유 링크 형식이 올바르지 않습니다. 링크를 다시 확인해주세요.' };
    case 'SHARE_NOT_FOUND':
      return { title: '존재하지 않는 공유 링크', detail: '이미 삭제되었거나 잘못된 링크일 수 있습니다.' };
    case 'SHARE_DISABLED':
      return { title: '비활성화된 공유 링크', detail: '이 공유 링크는 현재 비활성화되어 있습니다. 공유한 사람에게 문의해주세요.' };
    case 'SHARE_EXPIRED':
      return { title: '만료된 공유 링크', detail: '이 공유 링크는 만료되었습니다. 새 링크를 요청해주세요.' };
    case 'NOT_PUBLIC_READONLY':
      return { title: '외부 공개용 링크가 아님', detail: '이 링크는 외부 공개 보기용이 아닙니다. 접근하려면 로그인 후 워크스페이스에서 열어주세요.' };
    case 'ADMIN_NOT_CONFIGURED':
      return { title: '공유를 표시할 수 없음', detail: '서버 설정 문제로 공유 내용을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.' };
    default:
      return {
        title: '공유 내용을 불러오지 못했습니다',
        detail: status > 0 ? `요청 처리 중 문제가 발생했습니다. (오류 ${status})` : '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
      };
  }
}

// ---- 공통 UI 조각 ----

function ReadonlyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-text)' }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-live)' }} />
      읽기 전용 공유 보기
    </span>
  );
}

function ProjectSummary({ project }: { project: PublicProject }) {
  const a = project.activation;
  const rows: [string, string | undefined][] = a
    ? [
        ['기획 의도', a.intent],
        ['해결 문제', a.problem],
        ['핵심 고객', a.customer],
        ['핵심 가치', a.value],
        ['차별점', a.differentiator],
        ['MVP 범위', a.mvpScope],
      ]
    : [];
  const filled = rows.filter(([, v]) => v && v.trim());
  return (
    <section
      className="rounded-2xl border bg-white p-5 sm:p-6"
      style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>
          {project.name}
        </h2>
        {project.status && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
          >
            {project.status}
          </span>
        )}
      </div>
      {project.description && (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-body)' }}>
          {project.description}
        </p>
      )}
      {filled.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {filled.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </dt>
              <dd className="mt-0.5 text-sm" style={{ color: 'var(--text-body)' }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {project.prototypeLock && (
        <div
          className="mt-4 rounded-xl border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
        >
          기준 프로토타입: {project.prototypeLock.title || (project.prototypeLock.targetType === 'screen' ? '확정 화면' : '외부 프로토타입')}
        </div>
      )}
    </section>
  );
}

/** 읽기 전용 본문 블록 (마크다운/코드 원문을 텍스트로만 렌더 — 절대 HTML 실행 안 함). */
function TextBlock({ text, mono }: { text: string; mono?: boolean }) {
  return (
    <pre
      className={`max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border p-4 text-sm leading-relaxed ${
        mono ? 'font-mono text-[13px]' : ''
      }`}
      style={{ borderColor: 'var(--border-default)', background: 'var(--surface-sunken)', color: 'var(--text-body)' }}
    >
      {text || '_(내용 없음)_'}
    </pre>
  );
}

// ---- targetType별 본문 ----

function ProjectView({ project, documents }: { project: PublicProject; documents: PublicDocumentSummary[] }) {
  return (
    <div className="space-y-5">
      <ProjectSummary project={project} />
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
          문서 목록 ({documents.length})
        </h3>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            아직 공유된 문서가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>
                  {d.title}
                </span>
                <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                  >
                    {DOC_TYPE_LABEL[d.type] || d.type}
                  </span>
                  {d.version && <span>v{d.version}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          문서 본문은 이 공유 범위에 포함되지 않았습니다.
        </p>
      </section>
    </div>
  );
}

function DocumentView({ document, project }: { document: PublicDocument; project: PublicProject }) {
  return (
    <div className="space-y-5">
      <ProjectSummary project={project} />
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>
            {document.title}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
          >
            {DOC_TYPE_LABEL[document.type] || document.type}
          </span>
          {document.version && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              v{document.version}
            </span>
          )}
        </div>
        <div className="mt-4">
          <TextBlock text={document.content} />
        </div>
      </section>
    </div>
  );
}

function ScreenView({ screen, project }: { screen: PublicScreen; project: PublicProject }) {
  return (
    <div className="space-y-5">
      <ProjectSummary project={project} />
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h3 className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>
          {screen.name}
        </h3>
        <div
          className="mt-3 rounded-xl border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
        >
          보안을 위해 프로토타입 코드는 <strong>실행하지 않고 코드 원문만</strong> 표시합니다.
        </div>
        <div className="mt-3">
          <TextBlock text={screen.code} mono />
        </div>
      </section>
    </div>
  );
}

function HandoffView({
  files,
  readiness,
  project,
}: {
  files: HandoffFileView[];
  readiness: HandoffReadinessView;
  project: PublicProject;
}) {
  const [tab, setTab] = useState(0);
  const active = files[tab];
  const readinessItems: [string, boolean][] = [
    ['브리프', readiness.brief],
    ['시장조사', readiness.market],
    ['제품화전략', readiness.strategy],
    ['IA', readiness.ia],
    ['기능정의서', readiness.featureSpec],
    ['프로토타입', readiness.prototype],
  ];
  return (
    <div className="space-y-5">
      <ProjectSummary project={project} />
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
          준비 상태
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {readinessItems.map(([label, ok]) => (
            <span
              key={label}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={
                ok
                  ? { background: 'var(--status-approved-bg)', color: 'var(--status-approved-fg)' }
                  : { background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }
              }
            >
              {ok ? '✓' : '–'} {label}
            </span>
          ))}
        </div>
      </section>
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <button
              key={f.filename}
              type="button"
              onClick={() => setTab(i)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                i === tab
                  ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                  : { background: 'var(--surface-hover)', color: 'var(--text-secondary)' }
              }
            >
              {f.filename}
            </button>
          ))}
        </div>
        {active && (
          <div className="mt-4">
            <TextBlock text={active.content} mono />
          </div>
        )}
      </section>
    </div>
  );
}

// ---- 루트 ----

export default function ShareViewer({ shareId }: { shareId: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, { cache: 'no-store' });
        let body: { ok?: boolean; error?: string; share?: PublicShare; data?: ShareData } | null = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        if (cancelled) return;
        if (res.ok && body?.ok && body.share && body.data) {
          setState({ kind: 'ok', payload: { ok: true, share: body.share, data: body.data } });
        } else {
          const { title, detail } = describeError(body?.error, res.status);
          setState({ kind: 'error', code: body?.error || `HTTP_${res.status}`, title, detail });
        }
      } catch {
        if (cancelled) return;
        const { title, detail } = describeError(undefined, 0);
        setState({ kind: 'error', code: 'NETWORK', title, detail });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  return (
    <main className="min-h-full" style={{ background: 'var(--gradient-aurora)' }}>
      {/* 상단 바: 외부 읽기 전용 공유임을 명확히 */}
      <header
        className="sticky top-0 z-10 border-b backdrop-blur"
        style={{ background: 'var(--glass-fill)', borderColor: 'var(--border-default)', backdropFilter: 'var(--glass-blur)' }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <span className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-strong)' }}>
            July Canvas
          </span>
          <ReadonlyBadge />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {state.kind === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--color-primary)', borderRightColor: 'var(--color-primary)' }}
            />
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              공유 내용을 불러오는 중…
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div
            className="mx-auto max-w-md rounded-2xl border bg-white p-8 text-center"
            style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl"
              style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
            >
              🔒
            </div>
            <h1 className="mt-4 text-lg font-bold" style={{ color: 'var(--text-strong)' }}>
              {state.title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {state.detail}
            </p>
          </div>
        )}

        {state.kind === 'ok' && (
          <>
            <div className="mb-5">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                {TARGET_LABEL[state.payload.share.targetType] || '공유'}
              </p>
              {state.payload.share.targetTitle && (
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-strong)' }}>
                  {state.payload.share.targetTitle}
                </h1>
              )}
            </div>
            <ShareBody payload={state.payload} />
            <CommentsSection shareId={shareId} />
            <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              이 화면은 읽기 전용 공유 보기입니다. 편집하려면 July Canvas에 로그인하세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

/** 비로그인 코멘트 영역 (S7-2C). /api/share/{shareId}/reviews 만 호출(Firebase client 미접근). */
function CommentsSection({ shareId }: { shareId: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareId)}/reviews`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok && Array.isArray(body.reviews)) {
        setReviews(body.reviews as PublicReview[]);
        setListState('ready');
      } else {
        setListState('error');
      }
    } catch {
      setListState('error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const errorMessage = (code: string | undefined): string => {
    switch (code) {
      case 'EMPTY_CONTENT':
        return '내용을 입력해주세요.';
      case 'CONTENT_TOO_LONG':
        return `내용은 ${REVIEW_LIMITS.contentMax}자 이내로 입력해주세요.`;
      case 'NAME_TOO_LONG':
        return `이름은 ${REVIEW_LIMITS.authorNameMax}자 이내로 입력해주세요.`;
      case 'SHARE_DISABLED':
      case 'SHARE_EXPIRED':
      case 'NOT_PUBLIC_READONLY':
        return '이 공유에는 댓글을 남길 수 없습니다.';
      default:
        return '댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: name.trim(), content: trimmed }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setContent('');
        // S7-2E: 신규 댓글은 pending → 즉시 공개되지 않음. 검토 후 공개 안내.
        setNotice({ kind: 'success', msg: '댓글이 제출되었습니다. 검토 후 공개될 수 있습니다.' });
        await load();
      } else {
        setNotice({ kind: 'error', msg: errorMessage(body?.error) });
      }
    } catch {
      setNotice({ kind: 'error', msg: '네트워크 오류로 등록에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="mt-6 rounded-2xl border bg-white p-5 sm:p-6"
      style={{ borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
    >
      <h3 className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
        댓글 {listState === 'ready' ? `(${reviews.length})` : ''}
      </h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        로그인 없이 의견을 남길 수 있습니다. 이름은 선택이며 비우면 “{`익명`}”으로 표시됩니다. 작성한 댓글은 검토 후 공개됩니다.
      </p>

      {/* 입력 폼 */}
      <div className="mt-4 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={REVIEW_LIMITS.authorNameMax}
          placeholder="이름 (선택, 기본: 익명)"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-body)' }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={REVIEW_LIMITS.contentMax}
          rows={3}
          placeholder="의견을 입력하세요"
          className="w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-body)' }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs" style={{ color: notice ? (notice.kind === 'success' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--text-tertiary)' }}>
            {notice ? notice.msg : `${content.length}/${REVIEW_LIMITS.contentMax}`}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {submitting ? '등록 중…' : '댓글 등록'}
          </button>
        </div>
      </div>

      {/* 목록 (텍스트로만 렌더 — dangerouslySetInnerHTML 미사용 → script/html 미실행) */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        {listState === 'loading' && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>댓글을 불러오는 중…</p>
        )}
        {listState === 'error' && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>댓글을 불러오지 못했습니다.</p>
        )}
        {listState === 'ready' && reviews.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>아직 댓글이 없습니다. 첫 의견을 남겨보세요.</p>
        )}
        {listState === 'ready' && reviews.length > 0 && (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-sunken)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {r.authorName}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-body)' }}>
                  {r.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** share.targetType 기준으로 본문 선택. */
function ShareBody({ payload }: { payload: ShareSuccess }) {
  const { share, data } = payload;
  switch (share.targetType) {
    case 'project':
      return 'documents' in data ? <ProjectView project={data.project} documents={data.documents} /> : null;
    case 'document':
      return 'document' in data ? <DocumentView document={data.document} project={data.project} /> : null;
    case 'screen':
      return 'screen' in data ? <ScreenView screen={data.screen} project={data.project} /> : null;
    case 'handoff_package':
      return 'files' in data ? (
        <HandoffView files={data.files} readiness={data.readiness} project={data.project} />
      ) : null;
    default:
      return null;
  }
}
