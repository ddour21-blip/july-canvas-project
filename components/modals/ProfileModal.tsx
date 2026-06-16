'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import type { Member } from '@/types';

interface ProfileModalProps {
  isOpen: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  members?: Member[];
}

export function ProfileModal({ isOpen, onConfirm, onCancel, members = [] }: ProfileModalProps) {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-sm p-6 animate-in zoom-in-95">
        <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">닉네임 설정</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          댓글 작성자로 표시될 이름(닉네임)을 직접 입력하거나 아래 팀원 목록에서 선택해주세요.
        </p>

        {members && members.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-[var(--text-tertiary)] mb-2">등록된 팀원 선택</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 -ml-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setName(m.nickname)}
                  className={`px-3 py-1.5 rounded-[var(--radius-pill)] text-[13px] font-bold transition-all border ${
                    name === m.nickname
                      ? 'bg-[var(--surface-active)] border-[var(--color-primary)] text-[var(--color-primary-text)] shadow-[var(--shadow-xs)]'
                      : 'bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {m.nickname}
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="직접 입력 (예: 김기획)"
          className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none mb-6 text-sm bg-[var(--surface-card)] text-[var(--text-body)]"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={() => onConfirm(name)} disabled={!name.trim()}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
