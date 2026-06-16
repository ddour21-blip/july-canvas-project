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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <h3 className="text-xl font-bold text-gray-900 mb-2">닉네임 설정</h3>
        <p className="text-sm text-gray-500 mb-4">
          댓글 작성자로 표시될 이름(닉네임)을 직접 입력하거나 아래 팀원 목록에서 선택해주세요.
        </p>

        {members && members.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 mb-2">등록된 팀원 선택</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 -ml-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setName(m.nickname)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-all border ${
                    name === m.nickname
                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
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
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-sm"
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
