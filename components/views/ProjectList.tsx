'use client';

// 프로젝트 목록 (#projects) — 대시보드 홈과 분리된 별도 화면. admin index 의 proj-card 그리드 / empty state.
// 생성/삭제 로직은 기존 Dashboard 에서 그대로 이관 (Firestore 스키마·권한 모델 변경 없음).
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { getPermissions } from '@/lib/auth';
import { deleteProjectCascade } from '@/lib/projects';
import { getTime, nowMs, showToast } from '@/lib/utils';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { CheckCircle2, ChevronRight, Download, FileText, FolderOpen, Plus, Search, Trash2, X } from 'lucide-react';
import type { Project, ProjectDocument, ProjectStatus, Screen } from '@/types';

const STATUS: Record<ProjectStatus, { cls: string; label: string }> = {
  draft: { cls: 'jca-status--muted', label: '초안' },
  active: { cls: 'jca-status--active', label: '진행 중' },
  review: { cls: 'jca-status--warning', label: '검토 중' },
  approved: { cls: 'jca-status--success', label: '승인 완료' },
  archived: { cls: 'jca-status--muted', label: '보관' },
  handoff: { cls: '', label: '전달됨' },
};

function relative(ts: Project['updatedAt']): string {
  const ms = getTime(ts);
  if (!ms) return '방금 전';
  const min = Math.floor((nowMs() - ms) / 60000);
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

interface ProjectListProps {
  projects: Project[];
  screens: Screen[];
  documents: ProjectDocument[];
  user: User | null;
  navigate: (hash: string) => void;
}

export default function ProjectList({ projects, screens, documents, user, navigate }: ProjectListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [query, setQuery] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });

  const canCreateProject = !!user && !user.isAnonymous;
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);
  const filtered = query.trim() ? myProjects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())) : myProjects;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isAnonymous) {
      setIsModalOpen(false);
      showToast('Google 로그인 후 새 프로젝트를 만들 수 있습니다.', 'error');
      return;
    }
    if (!newProjectName.trim()) return;
    try {
      const uid = user.uid;
      const ref = await addDoc(col('projects'), {
        name: newProjectName,
        organizationId: null,
        ownerId: uid,
        roleByUid: uid ? { [uid]: 'owner' as const } : {},
        memberUids: uid ? [uid] : [],
        status: 'draft' as ProjectStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (uid) {
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

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: '프로젝트를 삭제하시겠습니까?',
      msg: `'${project.name}' 프로젝트와 하위 화면·문서·멤버 정보가 삭제됩니다. 삭제 후 복구할 수 없습니다.`,
      action: async () => {
        await deleteProjectCascade(project.id);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('프로젝트가 삭제되었습니다.');
      },
    });
  };

  return (
    <section>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />

      <nav className="jca-breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('#'); }}>메인</a>
        <ChevronRight size={14} />
        <span>프로젝트</span>
        <ChevronRight size={14} />
        <span className="jca-breadcrumb__current">프로젝트 목록</span>
      </nav>

      <div className="jca-page-head">
        <div>
          <div className="jca-page-head__title">프로젝트 목록</div>
          <p className="jca-page-head__desc">기획 → 문서 → 승인까지, 진행 중인 프로젝트를 한곳에서 관리합니다.</p>
        </div>
        {canCreateProject && (
          <div className="jca-page-head__actions">
            <button type="button" className="jca-btn jca-btn--primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />프로젝트 만들기
            </button>
          </div>
        )}
      </div>

      {myProjects.length === 0 ? (
        <div className="jca-card">
          <div className="jca-empty">
            <span className="jca-empty__icon">
              <FolderOpen size={22} />
            </span>
            <div className="jca-empty__title">등록된 프로젝트가 없습니다</div>
            <p className="jca-empty__desc">첫 프로젝트를 만들어 기획 문서 → 프로토타입 → 산출물을 한 캔버스에서 관리해 보세요.</p>
            {canCreateProject && (
              <button type="button" className="jca-btn jca-btn--primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} />프로젝트 만들기
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="jca-table-search" style={{ minWidth: 280 }}>
              <Search size={15} />
              <input placeholder="프로젝트 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button type="button" className="jca-btn jca-btn--secondary jca-btn--sm">
              <Download size={15} />내보내기
            </button>
          </div>
          <div className="jca-proj-grid">
            {filtered.map((project) => {
              const status = STATUS[project.status ?? 'draft'];
              const perms = getPermissions(project, user?.uid);
              const screenCount = screens.filter((s) => s.projectId === project.id).length;
              const docCount = documents.filter((d) => d.projectId === project.id).length;
              const memberCount = Math.max(project.memberUids?.length ?? 0, project.ownerId ? 1 : 0);
              const roleCls = perms.role === 'owner' ? 'jca-role--owner' : perms.role === 'editor' ? 'jca-role--editor' : 'jca-role--viewer';
              return (
                <div key={project.id} className="jca-proj-card" onClick={() => navigate(`#project_${project.id}`)}>
                  <div className="jca-proj-card__top">
                    <div className="min-w-0">
                      <div className="jca-proj-card__title truncate">{project.name}</div>
                      <div className="jca-proj-card__sub">{relative(project.updatedAt ?? project.createdAt)} · 최근 수정</div>
                    </div>
                    <span className={`jca-status ${status.cls}`}>
                      <span className="jca-status__dot" />
                      {status.label}
                    </span>
                  </div>
                  <div className="jca-meta-group">
                    <span className="jca-meta">
                      <FileText size={15} />문서 {docCount}
                    </span>
                    <span className="jca-meta">
                      <CheckCircle2 size={15} />화면 {screenCount}
                    </span>
                  </div>
                  <div className="jca-proj-card__foot">
                    <span className="jca-meta">멤버 {memberCount}명</span>
                    <div className="flex items-center gap-2">
                      {perms.canDelete && (
                        <button
                          type="button"
                          className="jca-icon-btn jca-icon-btn--sm"
                          onClick={(e) => handleDelete(e, project)}
                          aria-label="프로젝트 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      <span className={`jca-role ${roleCls}`}>{(perms.role ?? 'viewer').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--admin-text-muted)] py-8">검색 결과가 없습니다.</p>
            )}
          </div>
        </>
      )}

      {isModalOpen && canCreateProject && (
        <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="jca-modal jca-modal--sm" role="dialog" aria-modal="true">
            <div className="jca-modal__head">
              <h2 className="jca-modal__title">새 프로젝트</h2>
              <button className="jca-icon-btn" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="jca-modal__body">
                <div className="jca-field" style={{ marginBottom: 0 }}>
                  <label className="jca-field__label">프로젝트 이름<span className="jca-field__req">*</span></label>
                  <input
                    className="jca-input"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="예: 쇼핑몰 앱 리뉴얼"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="jca-modal__foot">
                <button type="button" className="jca-btn jca-btn--secondary" onClick={() => setIsModalOpen(false)}>
                  취소
                </button>
                <button type="submit" className="jca-btn jca-btn--primary" disabled={!newProjectName.trim()}>
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
