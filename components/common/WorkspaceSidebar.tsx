'use client';

// Admin 셸 좌측 사이드바. 실제 구현된 화면만 노출(미구현 통계/감사로그/휴지통 제거).
// IA: 대시보드(leaf) · 프로젝트(group▸목록) · 멤버·권한(group▸구성원/권한관리) · 설정(group▸워크스페이스 정보).
// parent 그룹은 펼침 토글만 — active(neutral well + emerald rail)는 현재 라우트의 child에만 적용.
// navigate(해시)만 사용 — Auth/Firestore/권한 로직 없음.
import { useState, type ComponentType } from 'react';
import { ChevronDown, FolderKanban, LayoutDashboard, Settings, Users } from 'lucide-react';

interface WorkspaceSidebarProps {
  navigate: (hash: string) => void;
  currentRoute: string;
  /** 접힘 상태 — true면 그룹 아이콘 클릭 시 펼침 대신 대표 페이지로 이동 */
  collapsed?: boolean;
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

export function WorkspaceSidebar({ navigate, currentRoute, collapsed, adminTools, onOpenBackup }: WorkspaceSidebarProps) {
  const view = viewOf(currentRoute);

  const [openProjects, setOpenProjects] = useState(true);
  const [openMembers, setOpenMembers] = useState(true);
  const [openSettings, setOpenSettings] = useState(view === 'settings');

  // 1depth 그룹 헤더: 펼친 상태에선 토글, 접힌 상태에선 대표 페이지로 이동(접힘 시 하위 메뉴가 숨겨져 클릭 불가하던 문제 해결).
  // 접힘 상태에선 현재 도메인에 해당하는 그룹 아이콘을 active로 강조.
  const NavGroup = ({
    icon: Icon,
    label,
    primary,
    domainActive,
    expanded,
    onToggle,
  }: {
    icon: ComponentType<{ size?: number }>;
    label: string;
    primary: string;
    domainActive: boolean;
    expanded: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`jca-nav-item${collapsed && domainActive ? ' jca-nav-item--active' : ''}`}
      aria-expanded={collapsed ? undefined : expanded}
      onClick={collapsed ? () => navigate(primary) : onToggle}
    >
      <Icon size={18} />
      <span className="jca-nav-item__label">{label}</span>
      <ChevronDown size={16} className="jca-nav-item__chev" />
    </button>
  );

  // 단일 페이지 메뉴(실제 라우트 = active 가능).
  const NavLeaf = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: ComponentType<{ size?: number }>;
    label: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button type="button" title={label} aria-label={label} className={`jca-nav-item${active ? ' jca-nav-item--active' : ''}`} onClick={onClick}>
      <Icon size={18} />
      <span className="jca-nav-item__label">{label}</span>
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

      <NavLeaf icon={LayoutDashboard} label="대시보드" active={view === 'dashboard'} onClick={() => navigate('#')} />

      <NavGroup icon={FolderKanban} label="프로젝트" primary="#projects" domainActive={view === 'projects' || view === 'project'} expanded={openProjects} onToggle={() => setOpenProjects((v) => !v)} />
      {openProjects && (
        <div className="jca-nav-sub">
          <SubItem label="프로젝트 목록" active={view === 'projects'} onClick={() => navigate('#projects')} />
        </div>
      )}

      <NavGroup icon={Users} label="멤버 · 권한" primary="#members" domainActive={view === 'members'} expanded={openMembers} onToggle={() => setOpenMembers((v) => !v)} />
      {openMembers && (
        <div className="jca-nav-sub">
          <SubItem label="구성원" active={view === 'members'} onClick={() => navigate('#members')} />
          <SubItem label="권한 관리" onClick={() => navigate('#members')} />
        </div>
      )}

      <NavGroup icon={Settings} label="설정" primary="#settings" domainActive={view === 'settings'} expanded={openSettings} onToggle={() => setOpenSettings((v) => !v)} />
      {openSettings && (
        <div className="jca-nav-sub">
          <SubItem label="워크스페이스 정보" active={view === 'settings'} onClick={() => navigate('#settings')} />
          {adminTools && onOpenBackup && <SubItem label="데이터 백업/복원" onClick={onOpenBackup} />}
        </div>
      )}
    </aside>
  );
}

export default WorkspaceSidebar;
