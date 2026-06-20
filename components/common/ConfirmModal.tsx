'use client';

// Admin 공통 삭제 Confirm — 다른 admin 모달과 동일한 jca-modal(sm) 구조로 통일.
// 작은 danger 아이콘(28px) + 우측 정렬 footer(취소 → 삭제, danger solid). 현재 사용처가 모두 삭제 확인이라 기본 라벨 '삭제'.
import { AlertCircle, X } from 'lucide-react';

/** 확인 액션의 위험도 톤. danger=삭제(빨강 solid), warning=주의/기준 변경(앰버 아이콘 + 중립 버튼). */
export type ConfirmTone = 'danger' | 'warning';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  msg: string;
  action: (() => void) | null;
  /** 확인 버튼 라벨 (기본 '삭제') */
  confirmLabel?: string;
  /** 위험도 톤 (기본 'danger') */
  tone?: ConfirmTone;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  onCancel: () => void;
  confirmLabel?: string;
  tone?: ConfirmTone;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = '삭제', tone = 'danger' }: ConfirmModalProps) {
  if (!isOpen) return null;
  // warning은 파괴적 액션이 아니므로 빨강 solid 대신 앰버 아이콘 + 중립(secondary) 확인 버튼을 쓴다(primary green 남용 금지).
  const iconBg = tone === 'warning' ? 'var(--amber-50)' : 'var(--admin-danger-soft)';
  const iconFg = tone === 'warning' ? 'var(--amber-700)' : 'var(--admin-danger)';
  const confirmClass = tone === 'warning' ? 'jca-btn jca-btn--secondary' : 'jca-btn jca-btn--danger';
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
                background: iconBg,
                color: iconFg,
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
          <button type="button" className={confirmClass} onClick={() => onConfirm?.()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
