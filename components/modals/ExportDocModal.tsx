'use client';

import { Download, FileDown, X } from 'lucide-react';

interface ExportDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleExportPPTX: () => void;
  handleExportPDF: () => void;
  handleExportMD: () => void;
}

export function ExportDocModal({
  isOpen,
  onClose,
  handleExportPPTX,
  handleExportPDF,
  handleExportMD,
}: ExportDocModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-3xl)] shadow-[var(--shadow-2xl)] w-full max-w-sm p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-[var(--text-strong)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <FileDown size={20} />
            </span>
            기획서 문서 다운로드
          </h2>
          <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-5">내보낼 파일 형식을 선택하세요.</p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'PPTX', desc: '발표용 슬라이드 (.pptx)', badge: 'bg-[var(--amber-50)] text-[var(--amber-700)]', onClick: handleExportPPTX },
            { label: 'PDF', desc: '인쇄용 문서 (.pdf)', badge: 'bg-[var(--red-50)] text-[var(--red-600)]', onClick: handleExportPDF },
            { label: 'MD', desc: '마크다운 텍스트 (.md)', badge: 'bg-[var(--surface-hover)] text-[var(--text-body)]', onClick: handleExportMD },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => { opt.onClick(); onClose(); }}
              className="group flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] text-left transition-all hover:border-[var(--brand-300)] hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              <span className={`shrink-0 w-12 h-9 rounded-[var(--radius-md)] flex items-center justify-center font-black text-xs ${opt.badge}`}>{opt.label}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[var(--text-strong)]">{opt.label} 다운로드</span>
                <span className="block text-xs text-[var(--text-secondary)]">{opt.desc}</span>
              </span>
              <Download size={16} className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--color-primary-text)] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExportDocModal;
