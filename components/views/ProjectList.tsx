'use client';

// 프로젝트 목록 (#projects) — wide 리스트 카드 + 우측 요약 rail. 생성은 공용 NewProjectStartModal 사용.
// 삭제/검색/권한 로직은 기존 그대로 (Firestore 스키마·권한 모델 변경 없음).
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { getPermissions } from '@/lib/auth';
import { deleteProjectCascade } from '@/lib/projects';
import { getTime, nowMs, showToast } from '@/lib/utils';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { NewProjectStartModal } from '@/components/common/NewProjectStartModal';
import { ArrowRight, ChevronRight, FileText, FolderOpen, MonitorSmartphone, Plus, Search, Trash2, Users } from 'lucide-react';
import { deriveNextAction } from '@/lib/pipeline';
import type { Project, ProjectDocument, ProjectStatus, Screen } from '@/types';

const STATUS: Record<ProjectStatus, { cls: string; label: string; dot: string }> = {
  draft: { cls: 'jca-status--muted', label: '초안', dot: 'var(--gray-400)' },
  active: { cls: 'jca-status--active', label: '진행 중', dot: 'var(--color-accent)' },
  review: { cls: 'jca-status--warning', label: '검토 중', dot: 'var(--amber-500)' },
  approved: { cls: 'jca-status--success', label: '승인 완료', dot: 'var(--green-500)' },
  archived: { cls: 'jca-status--muted', label: '보관', dot: 'var(--gray-400)' },
  handoff: { cls: '', label: '전달됨', dot: 'var(--gray-400)' },
};

/** 우측 summary rail 의 상태 집계 순서/색. */
const SUMMARY_ORDER: { key: ProjectStatus; label: string }[] = [
  { key: 'active', label: '진행 중' },
  { key: 'review', label: '검토 중' },
  { key: 'approved', label: '승인 완료' },
  { key: 'draft', label: '초안' },
  { key: 'archived', label: '보관' },
];

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
  const [query, setQuery] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });

  const canCreateProject = !!user && !user.isAnonymous;
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);
  const filtered = query.trim() ? myProjects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())) : myProjects;

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
        <div className="jca-ws-split">
          <div className="jca-ws-main">
            <div className="mb-4">
              {/* 모호한 '내보내기'(동작 없음) 버튼 제거. 실제 산출물 내보내기는 프로젝트 상세의 MD/ZIP/공유/패키지에서 제공. */}
              <div className="jca-table-search" style={{ minWidth: 280 }}>
                <Search size={15} />
                <input placeholder="프로젝트 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            <div className="jca-proj-grid">
              {filtered.map((project) => {
                const status = STATUS[project.status ?? 'draft'];
                const perms = getPermissions(project, user?.uid);
                const projScreens = screens.filter((s) => s.projectId === project.id);
                const projDocs = documents.filter((d) => d.projectId === project.id);
                const memberCount = Math.max(project.memberUids?.length ?? 0, project.ownerId ? 1 : 0);
                const roleCls = perms.role === 'owner' ? 'jca-role--owner' : perms.role === 'editor' ? 'jca-role--editor' : 'jca-role--viewer';
                const next = deriveNextAction(project, projDocs, projScreens);
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
                      <span className="jca-meta"><FileText size={15} />문서 {projDocs.length}</span>
                      <span className="jca-meta"><MonitorSmartphone size={15} />화면 {projScreens.length}</span>
                      <span className="jca-meta"><Users size={15} />멤버 {memberCount}</span>
                    </div>

                    {/* 다음 액션 — 카드 하단 보조 링크 (subtle) */}
                    {next && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 self-start text-xs font-semibold text-[var(--color-primary-text)]"
                        onClick={(e) => { e.stopPropagation(); navigate(`#project_${project.id}_${next.tab}`); }}
                      >
                        다음: {next.label} <ArrowRight size={13} />
                      </button>
                    )}

                    <div className="jca-proj-card__foot">
                      <span className={`jca-role ${roleCls}`}>{(perms.role ?? 'viewer').toUpperCase()}</span>
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
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-[var(--admin-text-muted)] py-8">검색 결과가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 우측 summary rail — 단순 상태 집계만 */}
          <aside className="jca-ws-rail">
            <div className="jca-rail-card">
              <div className="jca-rail-card__t">프로젝트 요약</div>
              <div className="flex items-end justify-between mb-3">
                <span className="text-3xl font-extrabold leading-none text-[var(--admin-text-primary)]">
                  {myProjects.length}
                  <span className="text-base font-bold text-[var(--admin-text-secondary)]"> 개</span>
                </span>
                <span className="jca-meta">전체 프로젝트</span>
              </div>
              {SUMMARY_ORDER.filter((o) => o.key === 'active' || o.key === 'approved' || o.key === 'draft').map(({ key, label }) => {
                const count = myProjects.filter((p) => (p.status ?? 'draft') === key).length;
                return (
                  <div key={key} className="jca-sumrow">
                    <span className="inline-flex items-center gap-2 text-[var(--admin-text-secondary)]">
                      <span className="jca-sumrow__dot" style={{ background: STATUS[key].dot }} />
                      {label}
                    </span>
                    <b className="text-[var(--admin-text-primary)]">{count}</b>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      <NewProjectStartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        navigate={navigate}
      />
    </section>
  );
}
