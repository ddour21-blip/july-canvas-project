'use client';

import { Share2, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { copyToClipboard, showToast } from '@/lib/utils';

export interface ShareState {
  isOpen: boolean;
  type: string;
  id: string;
}

interface ShareModalProps {
  isOpen: boolean;
  type: string;
  id: string;
  onClose: () => void;
  workspaceId: string;
}

export function ShareModal({ isOpen, type, id, onClose, workspaceId }: ShareModalProps) {
  if (!isOpen) return null;
  const displayHash = `${type}_${id}`;
  const fullUrl = `${window.location.origin}${window.location.pathname}#ws_${workspaceId}_${type}_${id}`;

  const handleCopy = (text: string, msg: string) => {
    if (copyToClipboard(text)) showToast(msg);
    else showToast('복사 실패', 'error');
  };

  const handleCopyMessage = () => {
    const text = `🚀 July 캔버스 공유\n\n🔗 접속 링크: ${fullUrl}\n🔑 접속 코드: ${displayHash}\n\n* 안내: 위 링크를 클릭하거나, July 캔버스 메인 화면의 '접속 코드' 입력란에 코드를 붙여넣고 [바로 입장]을 클릭해주세요.`;
    handleCopy(text, '초대 메시지와 접속 링크가 복사되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="text-blue-600" /> 프로젝트 공유
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-center">
            <label className="block text-sm font-bold text-blue-800 mb-3">고유 접속 링크 및 코드</label>
            <div
              className="bg-white border border-blue-200 rounded-xl px-4 py-3 font-mono font-bold text-gray-800 text-[13px] shadow-inner select-all overflow-hidden text-ellipsis whitespace-nowrap mb-4"
              title={fullUrl}
            >
              {fullUrl}
            </div>
            <Button onClick={handleCopyMessage} className="w-full py-3.5 text-base font-bold shadow-md">
              링크 + 접속 코드 함께 복사
            </Button>
            <div className="bg-green-50 px-4 py-3 border border-green-200 rounded-xl text-xs font-bold text-green-700 flex flex-col gap-1 mt-4">
              <span>💡 이 링크는 안심하고 한 번만 공유하세요.</span>
              <span className="text-green-600 font-medium">
                코드가 업데이트되어도 팀원 접속 시 자동으로 최신 버전 화면으로 즉시 연결됩니다.
              </span>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-xs font-bold text-gray-500 text-center">
              💡 팀원 직접 입장 가이드
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="flex bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm h-[40px] w-full max-w-[300px] mb-4 pointer-events-none">
                <div className="px-4 py-2 text-sm font-medium text-gray-800 flex-1 text-left bg-blue-50/20 font-mono select-none truncate">
                  {displayHash}
                </div>
                <div className="bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600 border-l border-gray-300 select-none whitespace-nowrap">
                  바로 입장
                </div>
              </div>
              <p className="text-[13px] font-bold text-gray-700 leading-relaxed">
                공유 받은 다이렉트 링크를 클릭하거나
                <br />
                <span className="text-blue-600">접속 코드</span>를 입력 후 접속하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
