'use client';

import { useState, type ComponentType } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { getPermissions, useAuth } from '@/lib/auth';
import { deleteProjectCascade } from '@/lib/projects';
import { getTime, nowMs, showToast } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { Activity, CheckCircle2, ChevronRight, Clock, Database, FileText, Folder, FolderPlus, Globe, Layers, Layout, MoreHorizontal, Plus, Sparkles, Share2, Trash2, User as UserIcon, Users, X } from 'lucide-react';
import type { Member, Project, ProjectDocument, ProjectStatus, Screen } from '@/types';

// 상태 배지: green-first 토큰(fg/bg)을 직접 소비. draft=neutral, active=green,
// review=amber, approved=soft green, archived=muted gray, handoff=neutral.
const STATUS_LABEL: Record<ProjectStatus, { label: string; fg: string; bg: string }> = {
  draft: { label: '초안', fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)' },
  active: { label: '활성', fg: 'var(--status-active-fg)', bg: 'var(--status-active-bg)' },
  review: { label: '리뷰', fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)' },
  approved: { label: '승인', fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
  archived: { label: '보관', fg: 'var(--status-archived-fg)', bg: 'var(--status-archived-bg)' },
  handoff: { label: '전달됨', fg: 'var(--status-handoff-fg)', bg: 'var(--status-handoff-bg)' },
};

/** 최근 수정/방문 시간을 가벼운 상대 표현으로. (시점 생성은 nowMs로 일원화) */
function formatRelative(ts: Project['updatedAt']): string {
  const ms = getTime(ts);
  if (!ms) return '방금 전';
  const diff = nowMs() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 멤버 아바타 스택. memberUids 기반(없으면 owner 1명). 신원 데이터는 추가 조회하지 않음. */
function MemberAvatars({ project }: { project: Project }) {
  const count = Math.max(project.memberUids?.length ?? 0, project.ownerId ? 1 : 0);
  if (count === 0) return <span className="text-xs text-[var(--text-tertiary)]">멤버 없음</span>;
  const shown = Math.min(count, 3);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <span
            key={i}
            className="w-6 h-6 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] ring-2 ring-[var(--surface-card)] flex items-center justify-center"
          >
            <UserIcon size={12} />
          </span>
        ))}
        {count > 3 && (
          <span className="w-6 h-6 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] ring-2 ring-[var(--surface-card)] flex items-center justify-center text-[10px] font-bold">
            +{count - 3}
          </span>
        )}
      </div>
      <span className="text-xs text-[var(--text-secondary)] font-medium">{count}명</span>
    </div>
  );
}

type ActivityTint = 'brand' | 'neutral' | 'green' | 'amber';
const TINT_CLS: Record<ActivityTint, string> = {
  brand: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-text)]',
  neutral: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  green: 'bg-[var(--green-50)] text-[var(--green-700)]',
  amber: 'bg-[var(--amber-50)] text-[var(--amber-700)]',
};

/**
 * 최근 활동 패널 (UI-4-3).
 * activity 컬렉션을 새로 만들지 않고, 이미 구독 중인 projects/screens/documents에서
 * 표시 가능한 범위만 파생해 시간순으로 보여준다. (Firestore schema/구독 추가 없음)
 * 보이는 프로젝트(visible)로 한정하고, 데이터가 없으면 fallback 문구를 표시한다.
 */
function RecentActivityPanel({
  projects,
  screens,
  documents,
}: {
  projects: Project[];
  screens: Screen[];
  documents: ProjectDocument[];
}) {
  const visible = new Set(projects.map((p) => p.id));
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? '프로젝트';

  type Item = { key: string; icon: ComponentType<{ size?: number }>; tint: ActivityTint; text: string; time: number };
  const items: Item[] = [];
  projects.forEach((p) =>
    items.push({ key: `p_${p.id}`, icon: FolderPlus, tint: 'brand', text: `'${p.name}' 프로젝트 생성`, time: getTime(p.createdAt) }),
  );
  screens
    .filter((s) => visible.has(s.projectId))
    .forEach((s) =>
      items.push({ key: `s_${s.id}`, icon: Layers, tint: 'neutral', text: `${projName(s.projectId)} · 화면 '${s.name}' 추가`, time: getTime(s.createdAt) }),
    );
  documents
    .filter((d) => visible.has(d.projectId))
    .forEach((d) => {
      const meta =
        d.status === 'approved'
          ? { icon: CheckCircle2, tint: 'green' as ActivityTint, label: '승인' }
          : d.status === 'review'
            ? { icon: Clock, tint: 'amber' as ActivityTint, label: '리뷰 요청' }
            : { icon: FileText, tint: 'neutral' as ActivityTint, label: '작성' };
      items.push({ key: `d_${d.id}`, icon: meta.icon, tint: meta.tint, text: `${projName(d.projectId)} · ${d.title} ${meta.label}`, time: getTime(d.updatedAt ?? d.createdAt) });
    });
  items.sort((a, b) => b.time - a.time);
  const recent = items.slice(0, 8);

  return (
    <aside className="w-full xl:w-[340px] shrink-0 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-subtle)]">
        <Activity size={17} className="text-[var(--color-primary-text)]" />
        <h2 className="text-sm font-bold text-[var(--text-strong)]">최근 활동</h2>
      </div>
      {recent.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">최근 활동이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {recent.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.key} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center ${TINT_CLS[it.tint]}`}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-body)] leading-snug break-words">{it.text}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatRelative(it.time)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

interface DashboardProps {
  projects: Project[];
  screens: Screen[];
  documents: ProjectDocument[];
  navigate: (hash: string) => void;
  user: User | null;
  globalMembers: Member[];
  setBackupOpen: (v: boolean) => void;
  setExportModalOpen: (v: boolean) => void;
}

export default function Dashboard({
  projects,
  screens,
  documents,
  navigate,
  user,
  globalMembers,
  setBackupOpen,
  setExportModalOpen,
}: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const { signInWithGoogle } = useAuth();
  const isGlobalEditor = projects.length === 0 || projects.some((p) => !p.ownerId || p.ownerId === user?.uid);
  // 새 프로젝트 생성은 **Google 로그인 사용자만** 가능. 익명 폴백 사용자는 생성 불가
  // (익명은 uid가 불안정해 만든 값이 계정에 안정적으로 유지되지 않으므로).
  const isGoogleUser = !!user && !user.isAnonymous;
  const canCreateProject = isGoogleUser;
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);

  const promptGoogleSignIn = () => {
    signInWithGoogle().catch((e) => {
      console.error('Google 로그인 실패:', e);
      showToast('Google 로그인에 실패했습니다.', 'error');
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    // 생성 로직 레벨 차단: 익명/비로그인 사용자는 프로젝트를 만들 수 없다(UI 게이트와 별개로 강제).
    if (!user || user.isAnonymous) {
      setIsModalOpen(false);
      showToast('Google 로그인 후 새 프로젝트를 만들 수 있습니다.', 'error');
      return;
    }
    if (!newProjectName.trim()) return;
    try {
      const uid = user.uid;
      // 신규 프로젝트: 생성자를 owner로 등록 (roleByUid + memberUids + projectMembers)
      const ref = await addDoc(col('projects'), {
        name: newProjectName,
        organizationId: null, // 조직 단위 확장 대비 (현재 개인 프로젝트)
        ownerId: uid,
        roleByUid: uid ? { [uid]: 'owner' as const } : {},
        // memberUids: Firestore Rules의 멤버십 기반 read(list) 쿼리 대비 (where array-contains)
        memberUids: uid ? [uid] : [],
        status: 'draft' as ProjectStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (uid) {
        // projectMembers 문서 ID를 결정적(`{projectId}_{uid}`)으로 지정 → Rules에서 get()으로 권한 판정 가능
        await setDoc(docRef('projectMembers', `${ref.id}_${uid}`), {
          projectId: ref.id,
          uid,
          email: user?.email || null,
          displayName: user?.displayName || null,
          photoURL: user?.photoURL || null,
          role: 'owner' as const,
          status: 'active' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setNewProjectName('');
      navigate(`#project_${ref.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    navigate(`#${accessCode.trim().replace(/^#/, '')}`);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await addDoc(col('members'), {
        nickname: newMemberName.trim(),
        email: newMemberEmail.trim() || null,
        createdAt: serverTimestamp(),
      });
      setNewMemberName('');
      setNewMemberEmail('');
      showToast('팀원이 추가되었습니다. 이제 모든 프로젝트에서 멘션할 수 있습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setConfirmState({
      isOpen: true,
      title: '팀원 삭제',
      msg: '이 팀원을 삭제하시겠습니까?',
      action: async () => {
        await deleteDoc(docRef('members', memberId));
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('팀원이 삭제되었습니다.');
      },
    });
  };

  const handleDeleteProjectClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: '프로젝트 삭제',
      msg: `'${project.name}' 프로젝트와 하위 화면·문서·멤버가 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`,
      action: async () => {
        await deleteProjectCascade(project.id);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('프로젝트가 삭제되었습니다.');
      },
    });
  };

  // 비로그인(익명) 사용자: 대시보드 전체 기능 대신 제품 설명/핵심 가치 + 단일 로그인 CTA를 먼저 노출.
  // (익명 폴백 전제는 유지 — 접속 코드가 있는 팀원은 하단 보조 폼으로 계속 입장 가능)
  if (!canCreateProject) {
    const VALUES: { icon: ComponentType<{ size?: number }>; title: string; desc: string }[] = [
      { icon: Folder, title: '조직·프로젝트 단위 관리', desc: '기획 문서와 프로토타입을 하나의 워크스페이스에서 정리합니다.' },
      { icon: Sparkles, title: '단계별 문서 자동화', desc: '브리프부터 PRD까지 기획 산출물을 단계별로 만들어 나갑니다.' },
      { icon: Share2, title: '역할 기반 협업', desc: '권한과 공유 링크로 팀원과 안전하게 함께 검토합니다.' },
    ];
    return (
      <div className="p-6 sm:p-10 max-w-5xl mx-auto">
        <section className="text-center pt-10 sm:pt-16 pb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] text-xs font-bold mb-6">
            <Sparkles size={13} /> 제품화 기획 워크스페이스
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-strong)] tracking-tight leading-tight">
            기획 문서와 프로토타입을
            <br className="hidden sm:block" /> 한 곳에서 제품으로
          </h1>
          <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto leading-relaxed">
            조직과 프로젝트 단위로 기획 문서와 프로토타입을 관리하는 워크스페이스입니다. Google 계정으로 로그인하면 바로 프로젝트를 만들 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <GoogleSignInButton onClick={promptGoogleSignIn} />
            <p className="text-xs text-[var(--text-tertiary)]">익명 상태로 둘러볼 수 있지만, 프로젝트 생성·저장은 로그인 후 가능합니다.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
                <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-strong)] mb-1.5">{v.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-10 flex flex-col items-center gap-3 border-t border-[var(--border-subtle)] pt-8">
          <p className="text-sm font-medium text-[var(--text-secondary)]">이미 접속 코드를 받으셨나요?</p>
          <form
            onSubmit={handleJoinByCode}
            className="flex bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] shadow-[var(--shadow-sm)] h-[44px] transition-shadow"
          >
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="접속 코드 (예: project_123)"
              className="px-4 py-2 outline-none w-56 text-sm font-medium text-[var(--text-body)] bg-transparent"
            />
            <button
              type="submit"
              className="bg-[var(--surface-sunken)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] border-l border-[var(--border-default)] transition-colors whitespace-nowrap"
            >
              바로 입장
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="p-10">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      <div className="flex flex-col gap-5 mb-10 xl:flex-row xl:flex-wrap xl:justify-between xl:items-end xl:gap-x-6">
        <div className="shrink-0">
          <h1 className="text-3xl font-extrabold text-[var(--text-strong)] tracking-tight">내 프로젝트</h1>
          <p className="text-[var(--text-secondary)] mt-2">기획 문서와 프로토타입을 관리할 프로젝트를 선택하거나 접속 코드로 입장하세요.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <form
            onSubmit={handleJoinByCode}
            className="flex bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] shadow-[var(--shadow-sm)] h-[44px] transition-shadow"
          >
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="접속 코드 (예: project_123)"
              className="px-4 py-2 outline-none w-56 text-sm font-medium text-[var(--text-body)] bg-transparent"
            />
            <button
              type="submit"
              className="bg-[var(--surface-sunken)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] border-l border-[var(--border-default)] transition-colors whitespace-nowrap"
            >
              바로 입장
            </button>
          </form>
          {isGlobalEditor && (
            <div className="relative">
              <Button variant="secondary" icon={MoreHorizontal} onClick={() => setIsMoreOpen((v) => !v)} className="h-[44px] px-5">
                더보기
              </Button>
              {isMoreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} aria-hidden="true" />
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 z-50 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] py-1.5"
                  >
                    {[
                      { icon: Globe, label: '배포 안내', onClick: () => setExportModalOpen(true) },
                      { icon: Database, label: '데이터 백업/복원', onClick: () => setBackupOpen(true) },
                      { icon: Users, label: `팀원 관리 (${globalMembers.length})`, onClick: () => setIsMemberModalOpen(true) },
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.label}
                          role="menuitem"
                          onClick={() => {
                            setIsMoreOpen(false);
                            m.onClick();
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-text)] transition-colors text-left"
                        >
                          <Icon size={16} className="shrink-0 text-[var(--text-tertiary)]" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="h-[44px] px-6">
            새 프로젝트
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6">
        {myProjects.map((project) => {
          const status = STATUS_LABEL[project.status ?? 'draft'];
          const canDelete = getPermissions(project, user?.uid).canDelete; // owner만 삭제 노출
          const screenCount = screens.filter((s) => s.projectId === project.id).length;
          const docCount = documents.filter((d) => d.projectId === project.id).length;
          return (
            <div
              key={project.id}
              onClick={() => navigate(`#project_${project.id}`)}
              className="group relative flex flex-col bg-[var(--surface-card)] p-5 rounded-[var(--radius-2xl)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--brand-300)] cursor-pointer transition-all"
            >
              {canDelete && (
                <button
                  onClick={(e) => handleDeleteProjectClick(e, project)}
                  className="absolute top-4 right-4 p-2 bg-[var(--surface-card)]/90 backdrop-blur text-[var(--text-tertiary)] hover:text-[var(--red-600)] hover:bg-[var(--red-50)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] opacity-0 group-hover:opacity-100 transition-all z-10 border border-[var(--border-subtle)]"
                  title="프로젝트 삭제"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* 헤더: 폴더 타일 + 이름/상태 */}
              <div className="flex items-start gap-3 pr-8">
                <div className="p-2.5 bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] rounded-[var(--radius-lg)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] transition-colors shrink-0">
                  <Folder size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[var(--text-strong)] truncate">{project.name}</h2>
                  <span
                    className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-[var(--radius-pill)]"
                    style={{ color: status.fg, backgroundColor: status.bg }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              {/* 설명 */}
              <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 min-h-[2.6em]">
                {project.description?.trim() || '기획 문서와 프로토타입을 한 곳에서 관리합니다.'}
              </p>

              {/* 메타: 화면 수 · 문서 수 · 최근 시간 */}
              <div className="mt-4 flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Layers size={14} className="text-[var(--text-tertiary)]" />
                  화면 {screenCount}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-[var(--text-tertiary)]" />
                  문서 {docCount}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--text-tertiary)]" />
                  {formatRelative(project.updatedAt ?? project.createdAt)}
                </span>
              </div>

              {/* 푸터: 멤버 아바타 + 입장 */}
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <MemberAvatars project={project} />
                <span className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1 group-hover:text-[var(--color-primary-text)] transition-colors">
                  입장 <ChevronRight size={16} />
                </span>
              </div>
            </div>
          );
        })}
        {myProjects.length === 0 && (
          <div className="col-span-full py-16 px-6 text-center border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-2xl)] bg-[var(--surface-sunken)] flex flex-col items-center">
            <div className="w-16 h-16 rounded-[var(--radius-2xl)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center mb-5">
              <Layout size={32} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">등록된 프로젝트가 없습니다</h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md">
              위 입력창에 접속 코드를 입력하거나, 새 프로젝트를 생성해 기획 문서와 프로토타입 관리를 시작하세요.
            </p>
            <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="px-6 h-[44px]">
              새 프로젝트
            </Button>
          </div>
        )}
          </div>
        </div>
        <RecentActivityPanel projects={myProjects} screens={screens} documents={documents} />
      </div>

      {isModalOpen && canCreateProject && (
        <div className="fixed inset-0 bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-6">새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름 (예: 쇼핑몰 앱 리뉴얼)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none mb-8 text-lg"
                autoFocus
                required
              />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={!newProjectName.trim()}>
                  생성하기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && isGlobalEditor && (
        <div className="fixed inset-0 bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-[var(--color-primary-text)]" /> 전체 팀원 관리 (멘션 대상)
              </h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              댓글에서 <b>@닉네임</b>으로 멘션할 팀원을 등록하세요. 이메일을 입력하면 추후 이메일 알림 대상으로 사용됩니다.
            </p>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-2 mb-6">
              {globalMembers.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-sm font-medium">등록된 팀원이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {globalMembers.map((m) => (
                    <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] font-bold rounded-full flex items-center justify-center text-xs uppercase">
                          {m.nickname.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{m.nickname}</div>
                          {m.email && <div className="text-[11px] text-gray-400">{m.email}</div>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMember(m.id)} className="text-gray-300 hover:text-red-500 p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={handleAddMember} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1">
                <Plus size={16} /> 팀원 추가하기
              </h4>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="닉네임 (예: 김기획)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="이메일 (선택)"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                  />
                  <Button type="submit" className="shrink-0 px-6 py-2 text-sm" disabled={!newMemberName}>
                    추가
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
