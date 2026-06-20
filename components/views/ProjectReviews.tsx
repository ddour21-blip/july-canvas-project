'use client';
// 외부 피드백(public_review) 내부 관리 + 모더레이션 — S7-2D / S7-2E
//
// owner/editor가 /share/{shareId} 에서 수집된 비로그인 코멘트를 모아보고 승인/숨김/삭제한다.
// - 데이터/액션은 /api/projects/{projectId}/reviews(GET) + /reviews/{reviewId}(PATCH) 만 호출
//   (Firebase ID 토큰 첨부). Firestore 직접 접근 없음. Rules 변경 없음.
// - content/authorName 은 React 텍스트로만 렌더(dangerouslySetInnerHTML 미사용 → script/html 미실행).
// - 신규 댓글 기본 pending → 승인(visible) 시 public viewer 노출. 삭제는 소프트 삭제(deleted, 목록 제외).
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Check, Eye, EyeOff, MessagesSquare, RotateCw, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { ManagedReview, ReviewStatus } from '@/lib/publicShareSanitizer';
import type { ShareTargetType } from '@/types';

const TARGET_LABEL: Record<ShareTargetType, string> = {
  project: '프로젝트',
  document: '문서',
  screen: '프로토타입 화면',
  handoff_package: '개발 전달 패키지',
};

type TargetFilter = 'all' | ShareTargetType;
const TARGET_FILTERS: { value: TargetFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'project', label: '프로젝트' },
  { value: 'document', label: '문서' },
  { value: 'screen', label: '프로토타입' },
  { value: 'handoff_package', label: '개발 전달 패키지' },
];

type StatusFilter = 'all' | 'pending' | 'visible' | 'hidden';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'visible', label: '공개' },
  { value: 'hidden', label: '숨김' },
];

const STATUS_BADGE: Record<ReviewStatus, { label: string; fg: string; bg: string }> = {
  pending: { label: '대기', fg: 'var(--amber-700)', bg: 'var(--amber-50)' },
  visible: { label: '공개', fg: 'var(--green-700)', bg: 'var(--green-50)' },
  hidden: { label: '숨김', fg: 'var(--text-secondary)', bg: 'var(--surface-hover)' },
  deleted: { label: '삭제됨', fg: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
};

type Action = 'approve' | 'hide' | 'delete';

/** 로딩/완료/오류를 구분. 오류는 코드로 권한·공유 문제와 서버 오류를 가른다. */
type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; code: string };

/** 권한/공유 상태 문제와 일반 서버 오류를 구분한 안내(+ 권한 문제 여부). */
function describeReviewError(code: string): { title: string; detail: string; permission: boolean } {
  switch (code) {
    case 'UNAUTHENTICATED':
      return { title: '로그인이 필요합니다', detail: '세션이 만료되었을 수 있습니다. 다시 로그인한 뒤 시도해주세요.', permission: true };
    case 'FORBIDDEN':
      return { title: '접근 권한이 없습니다', detail: '외부 피드백은 프로젝트 소유자·편집자만 볼 수 있습니다.', permission: true };
    case 'PROJECT_NOT_FOUND':
      return { title: '프로젝트를 찾을 수 없습니다', detail: '프로젝트가 삭제되었거나 접근할 수 없습니다.', permission: true };
    default:
      return { title: '피드백을 불러오지 못했습니다', detail: '일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요.', permission: false };
  }
}

export default function ProjectReviews({ projectId, user }: { projectId: string; user: User | null }) {
  const [reviews, setReviews] = useState<ManagedReview[]>([]);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      if (!user) {
        setState({ kind: 'error', code: 'UNAUTHENTICATED' });
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok && Array.isArray(body.reviews)) {
        setReviews(body.reviews as ManagedReview[]);
        setState({ kind: 'ready' });
      } else {
        setState({ kind: 'error', code: (body?.error as string) || `HTTP_${res.status}` });
      }
    } catch {
      setState({ kind: 'error', code: 'NETWORK' });
    }
  };

  const reload = () => {
    setState({ kind: 'loading' });
    void load();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ kind: 'loading' });
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user]);

  const act = async (reviewId: string, action: Action): Promise<void> => {
    if (!user || busyId) return;
    setBusyId(reviewId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await load();
    } catch {
      /* noop — 목록 갱신 실패 시 사용자가 다시 시도 */
    } finally {
      setBusyId(null);
    }
  };

  const shown = reviews.filter(
    (r) =>
      (targetFilter === 'all' || r.targetType === targetFilter) &&
      (statusFilter === 'all' || r.status === statusFilter),
  );

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-2 mb-1">
        <span className="shrink-0 w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
          <MessagesSquare size={18} />
        </span>
        <div>
          <h3 className="font-bold text-[var(--text-strong)] text-lg">외부 피드백</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">외부 공유 링크(읽기 전용)에서 받은 비로그인 코멘트이며, 작성된 댓글은 먼저 대기 상태로 저장됩니다.</p>
        </div>
      </div>
      <details className="mt-2 mb-4 group">
        <summary className="text-[11px] font-semibold text-[var(--color-primary-text)] cursor-pointer select-none list-none inline-flex items-center gap-1">
          <span className="group-open:hidden">자세히</span>
          <span className="hidden group-open:inline">접기</span>
        </summary>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 leading-relaxed">
          새 댓글은 <b>대기(pending)</b> 상태로 저장되며, <b>승인</b>해야 외부 공유 화면에 공개됩니다. 부적절한 댓글은 <b>숨김</b>(복구 가능) 또는 <b>삭제</b>할 수 있습니다.
        </p>
      </details>

      {/* 상위 필터: 피드백 상태 (segmented control — 연결된 한 덩어리, 굵고 큼) */}
      <div className="inline-flex flex-wrap p-0.5 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border-default)]">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all' ? reviews.length : reviews.filter((r) => r.status === f.value).length;
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`text-sm font-bold px-3.5 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                active
                  ? 'bg-[var(--surface-card)] text-[var(--text-strong)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-strong)]'
              }`}
            >
              {f.label} {count > 0 && <span className={active ? 'text-[var(--color-primary-text)]' : 'opacity-70'}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 하위 필터: 피드백 대상 ('대상' 레이블 + 작은 outline pill — 상위와 크기·색·간격 구분) */}
      <div className="flex items-center flex-wrap gap-1.5 mt-3 mb-4">
        {TARGET_FILTERS.map((f) => {
          const count = f.value === 'all' ? reviews.length : reviews.filter((r) => r.targetType === f.value).length;
          const active = targetFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setTargetFilter(f.value)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] border transition-colors ${
                active
                  ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--surface-active)]'
                  : 'border-[var(--border-default)] text-[var(--text-tertiary)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {f.label}{count > 0 && <span className="opacity-70"> {count}</span>}
            </button>
          );
        })}
      </div>

      {/* 로딩 */}
      {state.kind === 'loading' && (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-tertiary)]">
          <span className="jca-spinner" /> 외부 피드백을 불러오는 중…
        </div>
      )}

      {/* 오류: 권한/공유 문제와 서버 오류를 구분 + 다시 불러오기 */}
      {state.kind === 'error' && (() => {
        const e = describeReviewError(state.code);
        return (
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-[var(--text-strong)]">{e.title}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{e.detail}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <RotateCw size={13} /> 다시 불러오기
            </button>
          </div>
        );
      })()}

      {/* 피드백 없음 (전체 0건) */}
      {state.kind === 'ready' && reviews.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
          아직 외부 피드백이 없습니다. 외부 공유 링크에서 댓글이 작성되면 여기에 표시됩니다.
        </p>
      )}

      {/* 필터 결과 없음 (데이터는 있으나 현재 필터에 0건) */}
      {state.kind === 'ready' && reviews.length > 0 && shown.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">현재 필터에 해당하는 피드백이 없습니다.</p>
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setTargetFilter('all'); }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            필터 초기화
          </button>
        </div>
      )}

      {state.kind === 'ready' && shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((r) => {
            const badge = STATUS_BADGE[r.status];
            const busy = busyId === r.id;
            return (
              <li
                key={r.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-3"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                    {TARGET_LABEL[r.targetType]}
                  </span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: badge.fg, background: badge.bg }}>
                    {badge.label}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-body)]">{r.authorName}</span>
                  {r.createdAt && (
                    <span className="text-[11px] text-[var(--text-tertiary)]">{formatDateTime(r.createdAt)}</span>
                  )}
                  <span className="text-[11px] text-[var(--text-tertiary)] ml-auto font-mono" title={`shareId: ${r.shareId}`}>
                    {r.shareId.slice(0, 8)}…
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">{r.content}</p>
                {r.targetId && (
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)] font-mono truncate" title={r.targetId}>
                    대상: {r.targetId}
                  </p>
                )}
                {/* 모더레이션 액션 */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.status !== 'visible' && (
                    <button
                      type="button"
                      onClick={() => act(r.id, 'approve')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--green-100)] bg-[var(--green-50)] text-[var(--green-700)] hover:bg-[var(--green-100)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check size={13} /> 승인
                    </button>
                  )}
                  {r.status !== 'hidden' && (
                    <button
                      type="button"
                      onClick={() => act(r.id, 'hide')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {r.status === 'visible' ? <EyeOff size={13} /> : <Eye size={13} />} 숨김
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act(r.id, 'delete')}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--red-100)] bg-[var(--surface-card)] text-[var(--red-600)] hover:bg-[var(--red-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={13} /> 삭제
                  </button>
                  {busy && <span className="text-[11px] text-[var(--text-tertiary)] self-center">처리 중…</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
