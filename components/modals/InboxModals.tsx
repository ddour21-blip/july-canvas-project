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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[80vh] animate-in zoom-in-95">
        <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BellRing className="text-blue-600" /> 알림 <span className="text-sm font-medium text-gray-400 ml-2">(수신된 멘션 내역)</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {emails.length === 0 ? (
            <div className="text-center text-gray-400 py-20 flex flex-col items-center">
              <MailOpen size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-gray-500">수신된 알림이 없습니다.</p>
              <p className="text-sm mt-1">다른 사용자가 댓글에서 멘션하면 이곳에 알림이 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => onOpenEmail(email)}
                  className={`p-5 bg-white border rounded-xl cursor-pointer transition-all group ${
                    email.isRead ? 'border-gray-200 opacity-70' : 'border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${email.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                        {email.author.charAt(0)}
                      </span>
                      <span className={`font-bold ${email.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{email.author}님이 멘션했습니다.</span>
                      {!email.isRead && <span className="w-2 h-2 rounded-full bg-red-500 ml-1" />}
                    </div>
                    <span className="text-xs font-medium text-gray-400">{formatDateTime(email.createdAt)}</span>
                  </div>
                  <div className="pl-10 flex flex-col gap-1.5">
                    <div className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded w-max">프로젝트명: {email.projectName || '알 수 없음'}</div>
                    <div className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded w-max">UI: {email.uiTitle || '알 수 없음'}</div>
                    <div className="text-sm text-gray-700 line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(email.text) }} />
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-gray-200">
        <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center text-xs font-bold text-gray-500">
          <span>새 멘션 알림</span>
          <button onClick={onClose} className="hover:text-gray-800">
            <X size={16} />
          </button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[22px] text-gray-900 tracking-tight leading-snug">
              <b>{data.author}</b>님이 다음 문서의 댓글에 {data.isReply ? '답글을' : '댓글을'} 남김
            </h2>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center px-4 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-sm font-bold text-gray-700 shadow-sm w-max">
              프로젝트명: {data.projectName || '알 수 없음'}
            </div>
            <div className="inline-flex items-center px-4 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-sm font-bold text-gray-700 shadow-sm w-max">
              UI: {data.uiTitle || '알 수 없음'}
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="text-[13px] font-bold text-gray-800 mb-3 flex items-center gap-2">
                {data.author} <span className="text-gray-400 font-normal">• {formatDateTime(data.createdAt)}</span>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">신규</span>
              </div>
              <div className="text-[15px] text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.text) }} />
            </div>
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end items-center">
              <div className="flex gap-6 text-sm font-bold text-blue-600">
                <button onClick={handleOpenLink} className="hover:underline">
                  열기
                </button>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 font-medium pt-4 border-t border-gray-100">수신자: {data.receivers.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}
