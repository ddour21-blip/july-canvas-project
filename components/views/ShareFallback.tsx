'use client';

// 공유 링크가 없거나 만료/권한 없음일 때 보여주는 fallback 안내 화면.
// 실제 공유 기능을 새로 만들지 않음 — share token/Firebase/Auth 검증 실패 시 표시되는 UI만 담당.
// 이미지는 public/share-osaka.png (없으면 graceful 폴백 박스).
import { useState } from 'react';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

export default function ShareFallback({ onHome, onSignIn }: { onHome: () => void; onSignIn?: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="min-h-[78vh] flex flex-col items-center justify-center text-center px-6 py-16 bg-[var(--surface-page)]">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/share-osaka.png"
            alt="오사카"
            onError={() => setImgOk(false)}
            className="w-full max-w-xl rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)] mb-9"
          />
        ) : (
          <div className="w-full max-w-xl aspect-[16/9] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] mb-9 flex items-center justify-center text-5xl bg-gradient-to-br from-[var(--brand-50)] to-[var(--gray-100)] text-[var(--text-tertiary)]">
            🗼
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">오사카에 있습니다. 연락주세요.</h1>
        <p className="text-[var(--text-secondary)] mt-3 leading-relaxed max-w-md">
          요청하신 공유 페이지를 찾을 수 없습니다. 링크가 만료되었거나 접근 권한이 없을 수 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onHome} className="jca-btn jca-btn--primary">
            홈으로 돌아가기
          </button>
          {onSignIn && <GoogleSignInButton onClick={onSignIn} />}
        </div>
      </div>
    </div>
  );
}
