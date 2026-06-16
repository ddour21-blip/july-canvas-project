'use client';

import { BellRing, MailOpen, X } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
import { formatDateTime } from '@/lib/utils';
import type { MockEmail } from '@/types';

interface VirtualInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: MockEmail[];
  onOpenEmail: (email: MockEmail) => void;
}

export function VirtualInboxModal({ isOpen, onClose, emails, onOpenEmail }: VirtualInboxModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-3xl flex flex-col h-[80vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-card)] rounded-t-[var(--radius-2xl)] shrink-0">
          <h2 className="text-2xl font-bold text-[var(--text-strong)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <BellRing size={20} />
            </span>
            알림 <span className="text-sm font-medium text-[var(--text-tertiary)] ml-1">(수신된 멘션 내역)</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-full text-[var(--text-secondary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface-page)]">
          {emails.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-16 h-16 rounded-[var(--radius-2xl)] bg-[var(--surface-hover)] text-[var(--text-tertiary)] flex items-center justify-center mb-4">
                <MailOpen size={28} />
              </div>
              <p className="font-bold text-[var(--text-secondary)]">수신된 알림이 없습니다.</p>
              <p className="text-sm mt-1 text-[var(--text-tertiary)]">다른 사용자가 댓글에서 멘션하면 이곳에 알림이 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => onOpenEmail(email)}
                  className={`p-5 bg-[var(--surface-card)] border rounded-[var(--radius-lg)] cursor-pointer transition-all group ${
                    email.isRead
                      ? 'border-[var(--border-default)] opacity-70'
                      : 'border-[var(--brand-200)] bg-[var(--color-primary-softer)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--brand-300)]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${email.isRead ? 'bg-[var(--surface-hover)] text-[var(--text-secondary)]' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary-text)]'}`}>
                        {email.author.charAt(0)}
                      </span>
                      <span className={`font-bold ${email.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-strong)]'}`}>{email.author}님이 멘션했습니다.</span>
                      {!email.isRead && <span className="w-2 h-2 rounded-full bg-[var(--red-500)] ml-1" />}
                    </div>
                    <span className="text-xs font-medium text-[var(--text-tertiary)]">{formatDateTime(email.createdAt)}</span>
                  </div>
                  <div className="pl-10 flex flex-col gap-1.5">
                    <div className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-subtle)] px-2 py-1 rounded w-max">프로젝트명: {email.projectName || '알 수 없음'}</div>
                    <div className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-subtle)] px-2 py-1 rounded w-max">UI: {email.uiTitle || '알 수 없음'}</div>
                    <div className="text-sm text-[var(--text-body)] line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(email.text) }} />
                  </div>
                </div>
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

export function EmailSimulationModal({ isOpen, onClose, data, navigate }: EmailSimulationModalProps) {
  if (!isOpen || !data) return null;
  const handleOpenLink = () => {
    const hash = data.linkUrl.split('#')[1];
    if (hash) navigate('#' + hash);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[10000] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-2xl)] w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-[var(--border-default)]">
        <div className="bg-[var(--surface-sunken)] px-4 py-2 border-b border-[var(--border-subtle)] flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
          <span>새 멘션 알림</span>
          <button onClick={onClose} className="hover:text-[var(--text-strong)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[22px] text-[var(--text-strong)] tracking-tight leading-snug">
              <b>{data.author}</b>님이 다음 문서의 댓글에 {data.isReply ? '답글을' : '댓글을'} 남김
            </h2>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center px-4 py-1.5 border border-[var(--border-default)] bg-[var(--surface-sunken)] rounded-full text-sm font-bold text-[var(--text-body)] shadow-[var(--shadow-xs)] w-max">
              프로젝트명: {data.projectName || '알 수 없음'}
            </div>
            <div className="inline-flex items-center px-4 py-1.5 border border-[var(--border-default)] bg-[var(--surface-sunken)] rounded-full text-sm font-bold text-[var(--text-body)] shadow-[var(--shadow-xs)] w-max">
              UI: {data.uiTitle || '알 수 없음'}
            </div>
          </div>
          <div className="border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-card)] shadow-[var(--shadow-xs)] overflow-hidden mb-6">
            <div className="p-6">
              <div className="text-[13px] font-bold text-[var(--text-strong)] mb-3 flex items-center gap-2">
                {data.author} <span className="text-[var(--text-tertiary)] font-normal">• {formatDateTime(data.createdAt)}</span>
                <span className="bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[10px] px-2 py-0.5 rounded-full font-bold">신규</span>
              </div>
              <div className="text-[15px] text-[var(--text-body)] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.text) }} />
            </div>
            <div className="bg-[var(--surface-sunken)] border-t border-[var(--border-subtle)] px-6 py-4 flex justify-end items-center">
              <div className="flex gap-6 text-sm font-bold text-[var(--color-primary-text)]">
                <button onClick={handleOpenLink} className="hover:underline">
                  열기
                </button>
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] font-medium pt-4 border-t border-[var(--border-subtle)]">수신자: {data.receivers.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}
