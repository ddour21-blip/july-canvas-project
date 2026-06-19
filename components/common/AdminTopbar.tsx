'use client';

// Admin 셸 상단 네이비 토pbar.
// 좌: 메뉴 토글 + July Canvas 로고(별도 'Admin' 라벨 없음).
// 우(로그인): 알림 · 프로필 이미지 → 사용자 이름 → 로그아웃. (도움말/앱/조직 고정값 없음)
// 전역 검색 기능이 아직 없어 topbar 검색은 노출하지 않음(검색은 프로젝트 목록 내부에서만).
import { Bell, LogOut, Menu } from 'lucide-react';
import type { AuthUser } from '@/types';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

interface AdminTopbarProps {
  isGoogleUser: boolean;
  authUser: AuthUser | null;
  unreadCount: number;
  onToggleSidebar: () => void;
  onOpenInbox: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onHome: () => void;
}

export function AdminTopbar({
  isGoogleUser,
  authUser,
  unreadCount,
  onToggleSidebar,
  onOpenInbox,
  onSignIn,
  onSignOut,
  onHome,
}: AdminTopbarProps) {
  const displayName = authUser?.displayName || authUser?.email?.split('@')[0] || '사용자';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="jca-topbar">
      <div className="jca-topbar__lead">
        {isGoogleUser && (
          <button className="jca-topbar__menu" onClick={onToggleSidebar} aria-label="메뉴 접기/펼치기">
            <Menu size={22} />
          </button>
        )}
        <button className="jca-topbar__brand" onClick={onHome} type="button" style={{ gap: '8px', fontSize: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo/symbol.svg" alt="" style={{ height: '20px', width: 'auto' }} />
          <span>July Canvas</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div className="jca-topbar__actions">
        {isGoogleUser ? (
          <>
            <button className="jca-topbar__icon" data-badge={unreadCount > 0 ? 'true' : undefined} onClick={onOpenInbox} aria-label="알림">
              <Bell size={18} />
            </button>
            <div className="jca-topbar__divider" />
            {authUser?.photoURL ? (
              <span className="jca-topbar__avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={authUser.photoURL} alt="" referrerPolicy="no-referrer" />
              </span>
            ) : (
              <span className="jca-topbar__avatar">{initial}</span>
            )}
            <span className="jca-topbar__org">{displayName}</span>
            <button className="jca-topbar__icon" onClick={onSignOut} title="로그아웃" aria-label="로그아웃">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <GoogleSignInButton size="sm" label="로그인" onClick={onSignIn} />
        )}
      </div>
    </header>
  );
}

export default AdminTopbar;
