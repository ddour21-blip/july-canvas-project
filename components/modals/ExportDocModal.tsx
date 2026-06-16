'use client';

import { FileDown, X } from 'lucide-react';
import { Button } from '@/components/common/Button';

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
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileDown className="text-blue-600" /> 기획서 문서 다운로드
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => { handleExportPPTX(); onClose(); }} className="py-3 shadow-sm justify-start pl-5" variant="outline">
            <span className="text-[#d24726] font-black w-10 text-left">PPTX</span>
          </Button>
          <Button onClick={() => { handleExportPDF(); onClose(); }} className="py-3 shadow-sm justify-start pl-5" variant="outline">
            <span className="text-red-500 font-black w-10 text-left">PDF</span>
          </Button>
          <Button onClick={() => { handleExportMD(); onClose(); }} className="py-3 shadow-sm justify-start pl-5" variant="outline">
            <span className="text-gray-800 font-black w-10 text-left">MD</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportDocModal;
