'use client';

// Admin 셸 좌측 사이드바 (admin index 기준 IA).
// 섹션: 공통 관리(대시보드/프로젝트/멤버·권한/설정) · 워크스페이스 관리.
// active = neutral well + emerald left rail (admin-kit .jca-nav-item--active).
// navigate(해시)만 사용 — Auth/Firestore/권한 로직 없음.
import { useState, type ComponentType } from 'react';
import {
  BarChart3,
  ChevronDown,
  Database,
  FolderKanban,
  LayoutDashboard,
  ScrollText,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { showToast } from '@/lib/utils';

interface WorkspaceSidebarProps {
  navigate: (hash: string) => void;
  currentRoute: string;
  /** NEXT_PUBLIC_ADMIN_TOOLS 가 켜졌을 때만 백업/복원 노출 */
  adminTools?: boolean;
  onOpenBackup?: () => void;
}

/** 현재 해시에서 최상위 view 키를 도출 ('ws_x_' 프리픽스 제거). */
function viewOf(currentRoute: string): string {
  const parts = currentRoute.replace('#', '').split('_');
  const rest = parts[0] === 'ws' ? parts.slice(2) : parts;
  return rest[0] || 'dashboard';
}

export function WorkspaceSidebar({ navigate, currentRoute, adminTools, onOpenBackup }: WorkspaceSidebarProps) {
  const view = viewOf(currentRoute);
  const inProjects = view === 'projects' || view === 'project';
  const inMembers = view === 'members';
  const inSettings = view === 'settings';

  const [openProjects, setOpenProjects] = useState(true);
  const [openMembers, setOpenMembers] = useState(true);
  const [openSettings, setOpenSettings] = useState(inSettings);

  const soon = () => showToast('준비 중인 기능입니다.');

  const NavItem = ({
    icon: Icon,
    label,
    active,
    expandable,
    expanded,
    disabled,
    onClick,
  }: {
    icon: ComponentType<{ size?: number }>;
    label: string;
    active?: boolean;
    expandable?: boolean;
    expanded?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      className={`jca-nav-item${active ? ' jca-nav-item--active' : ''}`}
      aria-expanded={expandable ? expanded : undefined}
      aria-disabled={disabled || undefined}
      onClick={disabled ? soon : onClick}
    >
      <Icon size={19} />
      <span className="jca-nav-item__label">{label}</span>
      {expandable && <ChevronDown size={16} className="jca-nav-item__chev" />}
    </button>
  );

  const SubItem = ({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) => (
    <button type="button" className={`jca-nav-subitem${active ? ' jca-nav-subitem--active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <aside className="jca-sidebar jca-shell__sidebar">
      <div className="jca-nav-section">
        <span className="jca-nav-section__label">공통 관리</span>
      </div>

      <NavItem icon={LayoutDashboard} label="대시보드" active={view === 'dashboard'} onClick={() => navigate('#')} />

      <NavItem
        icon={FolderKanban}
        label="프로젝트"
        active={inProjects}
        expandable
        expanded={openProjects}
        onClick={() => setOpenProjects((v) => !v)}
      />
      {openProjects && (
        <div className="jca-nav-sub">
          <SubItem label="프로젝트 목록" active={view === 'projects'} onClick={() => navigate('#projects')} />
        </div>
      )}

      <NavItem
        icon={Users}
        label="멤버 · 권한"
        active={inMembers}
        expandable
        expanded={openMembers}
        onClick={() => setOpenMembers((v) => !v)}
      />
      {openMembers && (
        <div className="jca-nav-sub">
          <SubItem label="구성원" active={inMembers} onClick={() => navigate('#members')} />
          <SubItem label="권한 관리" onClick={() => navigate('#members')} />
        </div>
      )}

      <NavItem
        icon={Settings}
        label="설정"
        active={inSettings}
        expandable
        expanded={openSettings}
        onClick={() => setOpenSettings((v) => !v)}
      />
      {openSettings && (
        <div className="jca-nav-sub">
          <SubItem label="워크스페이스 정보" active={inSettings} onClick={() => navigate('#settings')} />
        </div>
      )}

      <div className="jca-nav-divider" />
      <div className="jca-nav-section">
        <span className="jca-nav-section__label">워크스페이스 관리</span>
      </div>
      <NavItem icon={BarChart3} label="통계" onClick={soon} />
      <NavItem icon={ScrollText} label="감사 로그" onClick={soon} />
      {adminTools && onOpenBackup && <NavItem icon={Database} label="데이터 백업/복원" onClick={onOpenBackup} />}
      <NavItem icon={Trash2} label="휴지통" disabled />
    </aside>
  );
}

export default WorkspaceSidebar;
