'use client';

import dynamic from 'next/dynamic';

// 브라우저 전용 SPA: 프리렌더(SSR) 비활성화.
// Firebase 초기화/브라우저 API가 서버 빌드 단계에서 실행되지 않도록 합니다.
const CanvasApp = dynamic(() => import('./CanvasApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  ),
});

export default function ClientApp() {
  return <CanvasApp />;
}
