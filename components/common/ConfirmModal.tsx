'use client';

// Admin 공통 삭제 Confirm — 다른 admin 모달과 동일한 jca-modal(sm) 구조로 통일.
// 작은 danger 아이콘(28px) + 우측 정렬 footer(취소 → 삭제, danger solid). 현재 사용처가 모두 삭제 확인이라 기본 라벨 '삭제'.
import { AlertCircle, X } from 'lucide-react';

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
      <div className="jca-modal jca-modal--sm" role="alertdialog" aria-modal="true">
        <div className="jca-modal__head">
          <h2 className="jca-modal__title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--admin-danger-soft)',
                color: 'var(--admin-danger)',
                flex: 'none',
              }}
            >
              <AlertCircle size={16} />
            </span>
            {title}
          </h2>
          <button type="button" className="jca-icon-btn" onClick={onCancel} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="jca-modal__body">
          <p>{message}</p>
        </div>
        <div className="jca-modal__foot">
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
