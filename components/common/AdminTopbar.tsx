'use client';

// Admin 셸 상단 네이비 토pbar (admin index 기준).
// 로고 · 검색 · 공유 · 알림 · 도움말 · 앱 · 조직명 · 사용자 아바타.
// Auth/데이터 로직은 prop 콜백으로만 위임 — 여기서 직접 변경하지 않음.
import { Bell, HelpCircle, LayoutGrid, LogOut, Menu, Search, Share2 } from 'lucide-react';
import type { AuthUser } from '@/types';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

interface AdminTopbarProps {
  isGoogleUser: boolean;
  authUser: AuthUser | null;
  unreadCount: number;
  orgName: string;
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
  orgName,
  onToggleSidebar,
  onOpenInbox,
  onSignIn,
  onSignOut,
  onHome,
}: AdminTopbarProps) {
  const initial = (authUser?.displayName || authUser?.email || '?').charAt(0).toUpperCase();
  return (
    <header className="jca-topbar">
      <div className="jca-topbar__lead">
        {isGoogleUser && (
          <button className="jca-topbar__menu" onClick={onToggleSidebar} aria-label="메뉴 접기/펼치기">
            <Menu size={20} />
          </button>
        )}
        <button className="jca-topbar__brand" onClick={onHome} type="button">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo/header-dark.svg" alt="July Canvas" />
          <span style={{ color: 'var(--admin-text-on-nav-dim)', fontWeight: 'var(--fw-semibold)' }}>Admin</span>
        </button>
      </div>

      {isGoogleUser && (
        <div className="jca-topbar__search">
          <Search size={16} />
          <input type="text" placeholder="프로젝트 · 메뉴 검색" aria-label="검색" />
        </div>
      )}

      <div className="jca-topbar__actions">
        {isGoogleUser ? (
          <>
            <button className="jca-topbar__icon" data-badge={unreadCount > 0 ? 'true' : undefined} onClick={onOpenInbox} aria-label="알림">
              <Bell size={18} />
            </button>
            <button className="jca-topbar__icon" aria-label="도움말">
              <HelpCircle size={18} />
            </button>
            <button className="jca-topbar__icon" aria-label="앱">
              <LayoutGrid size={18} />
            </button>
            <div className="jca-topbar__divider" />
            <span className="jca-topbar__org">{orgName}</span>
            {authUser?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authUser.photoURL} alt="" className="jca-topbar__avatar" referrerPolicy="no-referrer" />
            ) : (
              <button className="jca-topbar__avatar" onClick={onSignOut} title="로그아웃" aria-label="내 계정">
                {initial}
              </button>
            )}
            {authUser?.photoURL && (
              <button className="jca-topbar__icon" onClick={onSignOut} title="로그아웃" aria-label="로그아웃">
                <LogOut size={18} />
              </button>
            )}
          </>
        ) : (
          <GoogleSignInButton size="sm" label="로그인" onClick={onSignIn} />
        )}
      </div>
    </header>
  );
}

export default AdminTopbar;
