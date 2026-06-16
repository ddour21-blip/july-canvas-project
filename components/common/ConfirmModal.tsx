'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  msg: string;
  action: (() => void) | null;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button variant="danger" onClick={() => onConfirm?.()}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
