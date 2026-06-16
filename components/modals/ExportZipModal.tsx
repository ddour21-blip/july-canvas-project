'use client';

import { Globe, X } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface ExportZipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** 외부 호스팅 배포 안내 (정보성 모달) */
export function ExportZipModal({ isOpen, onClose }: ExportZipModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="text-gray-800" /> 외부 호스팅 배포 안내
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-5">
          <p className="text-gray-600 text-sm">
            July Canvas는 Next.js 프로젝트입니다. 아래 단계를 따라 배포하세요.
          </p>
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
              <div className="text-sm text-gray-700">
                프로젝트 루트에 <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">.env.local</code> 을 만들고 Firebase 환경변수(<code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">NEXT_PUBLIC_FIREBASE_*</code>)를 입력합니다.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
              <div className="text-sm text-gray-700">
                <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">npm install</code> 후 <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">npm run build</code> 로 빌드를 확인합니다.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
              <div className="text-sm text-gray-700">
                GitHub에 푸시하고 Vercel에서 레포지토리를 연결한 뒤, 같은 환경변수를 등록하여 배포합니다.
              </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full py-3.5">확인했습니다</Button>
        </div>
      </div>
    </div>
  );
}

export default ExportZipModal;
