'use client';

import { MailOpen, X } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
import { formatDateTime } from '@/lib/utils';
import type { MockEmail } from '@/types';

interface VirtualInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: MockEmail[];
  onOpenEmail: (email: MockEmail) => void;
}

// 알림 모달 — admin jca-modal. 비어 있을 때 큰 회색 영역 대신 compact empty state, 높이는 콘텐츠에 맞춤.
export function VirtualInboxModal({ isOpen, onClose, emails, onOpenEmail }: VirtualInboxModalProps) {
  if (!isOpen) return null;
  return (
    <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="jca-modal" role="dialog" aria-modal="true" aria-label="알림">
        <div className="jca-modal__head">
          <div>
            <h2 className="jca-modal__title">알림</h2>
            <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">수신된 멘션 내역</p>
          </div>
          <button className="jca-icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="jca-modal__body" style={{ maxHeight: '60vh' }}>
          {emails.length === 0 ? (
            <div className="jca-empty" style={{ padding: 'var(--space-8) var(--space-6)' }}>
              <span className="jca-empty__icon">
                <MailOpen size={22} />
              </span>
              <div className="jca-empty__title">수신된 알림이 없습니다</div>
              <p className="jca-empty__desc">다른 사용자가 댓글에서 회원님을 멘션하면 이곳에 표시됩니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {emails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => onOpenEmail(email)}
                  className={`text-left p-4 rounded-[var(--admin-radius-md)] border transition-colors ${
                    email.isRead
                      ? 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)]'
                      : 'border-[var(--admin-border-strong)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="jca-avatar jca-avatar--xs">{email.author.charAt(0)}</span>
                      <span className={`text-sm font-bold truncate ${email.isRead ? 'text-[var(--admin-text-secondary)]' : 'text-[var(--admin-text-primary)]'}`}>
                        {email.author}님이 멘션했습니다
                      </span>
                      {!email.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-danger)] shrink-0" />}
                    </div>
                    <span className="text-[11px] text-[var(--admin-text-muted)] shrink-0">{formatDateTime(email.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className="jca-badge jca-badge--neutral">{email.projectName || '알 수 없음'}</span>
                    <span className="jca-badge jca-badge--neutral">{email.uiTitle || '알 수 없음'}</span>
                  </div>
                  <div className="text-sm text-[var(--admin-text-secondary)] line-clamp-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(email.text) }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmailSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MockEmail | null;
  navigate: (hash: string) => void;
}

// 멘션 상세 — admin jca-modal.
export function EmailSimulationModal({ isOpen, onClose, data, navigate }: EmailSimulationModalProps) {
  if (!isOpen || !data) return null;
  const handleOpenLink = () => {
    const hash = data.linkUrl.split('#')[1];
    if (hash) navigate('#' + hash);
    onClose();
  };
  return (
    <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000 }}>
      <div className="jca-modal" role="dialog" aria-modal="true">
        <div className="jca-modal__head">
          <h2 className="jca-modal__title">새 멘션 알림</h2>
          <button className="jca-icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="jca-modal__body" style={{ maxHeight: '70vh' }}>
          <h3 className="text-base font-bold text-[var(--admin-text-primary)] leading-snug mb-4">
            <b>{data.author}</b>님이 다음 문서의 댓글에 {data.isReply ? '답글을' : '댓글을'} 남겼습니다
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="jca-badge jca-badge--neutral">프로젝트: {data.projectName || '알 수 없음'}</span>
            <span className="jca-badge jca-badge--neutral">UI: {data.uiTitle || '알 수 없음'}</span>
          </div>
          <div className="jca-card jca-card--flat" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="jca-card__body">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                {data.author}
                <span className="text-[var(--admin-text-muted)] font-normal">· {formatDateTime(data.createdAt)}</span>
                <span className="jca-badge jca-badge--primary">신규</span>
              </div>
              <div className="text-sm text-[var(--admin-text-secondary)] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.text) }} />
            </div>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)] mt-4">수신자: {data.receivers.join(', ')}</p>
        </div>
        <div className="jca-modal__foot">
          <button type="button" className="jca-btn jca-btn--secondary" onClick={onClose}>닫기</button>
          <button type="button" className="jca-btn jca-btn--primary" onClick={handleOpenLink}>해당 위치 열기</button>
        </div>
      </div>
    </div>
  );
}
