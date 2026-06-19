'use client';

// Admin 공통 Confirm 다이얼로그 (admin-kit .jca-confirm). 위험 액션 = subtle danger 아이콘 + danger 버튼.
// 버튼 우측 정렬, 순서: 취소 → 확인/삭제. 현재 사용처가 모두 삭제 확인이라 기본 라벨은 '삭제'.
import { AlertCircle } from 'lucide-react';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  msg: string;
  action: (() => void) | null;
  /** 확인 버튼 라벨 (기본 '삭제') */
  confirmLabel?: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  onCancel: () => void;
  confirmLabel?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = '삭제' }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="jca-confirm" role="alertdialog" aria-modal="true">
        <span className="jca-confirm__icon jca-confirm__icon--danger">
          <AlertCircle size={22} />
        </span>
        <div className="jca-confirm__title">{title}</div>
        <p className="jca-confirm__desc">{message}</p>
        <div className="jca-confirm__foot">
          <button type="button" className="jca-btn jca-btn--secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="jca-btn jca-btn--danger" onClick={() => onConfirm?.()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
