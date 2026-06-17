'use client';
// 외부 피드백(public_review) 내부 관리 목록 — S7-2D
//
// owner/editor가 /share/{shareId} 에서 수집된 비로그인 코멘트를 July Canvas 내부에서 모아본다.
// - 데이터는 /api/projects/{projectId}/reviews 만 호출(Firebase ID 토큰 첨부). Firestore 직접 접근 없음.
// - content/authorName 은 React 텍스트로만 렌더(dangerouslySetInnerHTML 미사용 → script/html 미실행).
// - v1: status visible 즉시 공개. 승인/숨김/삭제는 후속.
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { MessagesSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { ManagedReview } from '@/lib/publicShareSanitizer';
import type { ShareTargetType } from '@/types';

const TARGET_LABEL: Record<ShareTargetType, string> = {
  project: '프로젝트',
  document: '문서',
  screen: '프로토타입 화면',
  handoff_package: '개발 전달 패키지',
};

type Filter = 'all' | ShareTargetType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'project', label: '프로젝트' },
  { value: 'document', label: '문서' },
  { value: 'screen', label: '프로토타입' },
  { value: 'handoff_package', label: '개발 전달 패키지' },
];

export default function ProjectReviews({ projectId, user }: { projectId: string; user: User | null }) {
  const [reviews, setReviews] = useState<ManagedReview[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        if (!user) {
          if (!cancelled) setState('error');
          return;
        }
        const token = await user.getIdToken();
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && body?.ok && Array.isArray(body.reviews)) {
          setReviews(body.reviews as ManagedReview[]);
          setState('ready');
        } else {
          setState('error');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, user]);

  const shown = filter === 'all' ? reviews : reviews.filter((r) => r.targetType === filter);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-2 mb-1">
        <span className="shrink-0 w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
          <MessagesSquare size={18} />
        </span>
        <div>
          <h3 className="font-bold text-[var(--text-strong)] text-lg">외부 피드백</h3>
          <p className="text-xs text-[var(--text-secondary)]">외부 공유 링크(읽기 전용)에서 받은 비로그인 코멘트입니다.</p>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)] mb-4 mt-2 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2">
        v1은 즉시 공개되는 댓글입니다. 승인 / 숨김 / 삭제 기능은 후속 단계에서 제공될 예정입니다.
      </p>

      {/* 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => {
          const count = f.value === 'all' ? reviews.length : reviews.filter((r) => r.targetType === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`text-xs font-bold px-3 py-1.5 rounded-[var(--radius-pill)] transition-colors ${
                filter === f.value
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                  : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {f.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {state === 'loading' && <p className="text-sm text-[var(--text-tertiary)]">불러오는 중…</p>}
      {state === 'error' && <p className="text-sm text-[var(--text-tertiary)]">피드백을 불러오지 못했습니다.</p>}
      {state === 'ready' && shown.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">아직 수집된 외부 피드백이 없습니다.</p>
      )}
      {state === 'ready' && shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                  {TARGET_LABEL[r.targetType]}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
