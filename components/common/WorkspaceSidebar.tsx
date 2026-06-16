'use client';

import type { User } from 'firebase/auth';
import { Home, Folder } from 'lucide-react';
import type { Project } from '@/types';

interface WorkspaceSidebarProps {
  projects: Project[];
  user: User | null;
  navigate: (hash: string) => void;
  currentRoute: string;
}

/**
 * 드라이브형 좌측 워크스페이스 내비게이션 (UI-4).
 * - green-first 디자인 토큰 직접 소비, sidebar.svg 브랜드 심볼 배치.
 * - 현재 단계에서는 대시보드 뷰에서만 렌더(프로젝트/화면 뷰 레이아웃은 UI-5/UI-6).
 * - navigate/해시 라우팅만 사용. Firestore/Auth/권한 로직은 건드리지 않음.
 */
export function WorkspaceSidebar({ projects, user, navigate, currentRoute }: WorkspaceSidebarProps) {
  // Dashboard와 동일한 필터(내가 볼 수 있는 프로젝트)
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);
  const route = currentRoute.replace('#', '');
  const isHome = route === '' || route === 'dashboard';

  const itemBase =
    'flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors text-left';
  const itemIdle = 'text-[var(--text-body)] hover:bg-[var(--surface-hover)]';
  const itemActive = 'bg-[var(--surface-active)] text-[var(--color-primary-text)] font-semibold';

  return (
    <aside
      className="sticky top-[var(--header-height)] self-start h-[calc(100vh-var(--header-height))] w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border-default)] bg-[var(--surface-card)] overflow-y-auto flex flex-col"
    >
      {/* 워크스페이스 식별 영역 */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-subtle)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo/sidebar.svg" alt="" className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-strong)] truncate">내 워크스페이스</div>
          <div className="text-xs text-[var(--text-secondary)] truncate">main</div>
        </div>
      </div>

      {/* 기본 내비 */}
      <nav className="px-2 py-3">
        <button onClick={() => navigate('#')} className={`${itemBase} ${isHome ? itemActive : itemIdle}`}>
          <Home size={17} className="shrink-0" />홈
        </button>
      </nav>

      {/* 프로젝트(드라이브 폴더) */}
      <div className="px-2 flex-1">
        <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">프로젝트</div>
        {myProjects.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">프로젝트가 없습니다.</p>
        ) : (
          <div className="space-y-0.5 pb-3">
            {myProjects.map((p) => {
              const active = route === `project_${p.id}`;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`#project_${p.id}`)}
                  className={`${itemBase} ${active ? itemActive : itemIdle}`}
                  title={p.name}
                >
                  <Folder size={17} className="shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

export default WorkspaceSidebar;
