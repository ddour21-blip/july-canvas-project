'use client';

// 공유 링크가 없거나 만료/권한 없음/로드 실패일 때 보여주는 fallback 안내 화면.
// 실제 공유 기능을 새로 만들지 않음 — share token/Firebase/Auth 검증 실패 시 표시되는 UI만 담당.
// 이미지는 /share-osaka.png 를 우선 렌더(캐시버스트 ?v=…로 옛 404 캐시 우회). 실제 로드 실패 시에만 🗼 placeholder.
import { useState } from 'react';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

// 이미지 캐시버스트 버전(추가/교체 시 갱신). 이전에 404가 캐시된 경우를 우회하기 위함.
const OSAKA_SRC = '/share-osaka.png?v=930511f';

export default function ShareFallback({ onHome, onSignIn }: { onHome: () => void; onSignIn?: () => void }) {
  // 시작값 true → 항상 실제 이미지를 먼저 시도하고, onError(실제 로드 실패) 시에만 placeholder로 전환.
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="min-h-[78vh] flex flex-col items-center justify-center text-center px-6 py-16 bg-[var(--surface-page)]">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={OSAKA_SRC}
            alt="오사카"
            onError={() => setImgFailed(true)}
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
