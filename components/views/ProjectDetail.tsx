'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { useRole, roleLabel } from '@/lib/auth';
import { deleteProjectCascade } from '@/lib/projects';
import { unlockPrototype } from '@/lib/prototypes';
import { copyToClipboard, getTime, nowMs, showToast } from '@/lib/utils';
import { DOCUMENT_ORDER } from '@/lib/documents';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { ShareState } from '@/components/modals/ShareModal';
import ProjectActivationWizard from './ProjectActivationWizard';
import ProjectDocuments from './ProjectDocuments';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  Layout,
  Link2,
  MessageSquarePlus,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react';
import type { FirestoreTime, Project, ProjectDocument, ProjectMember, ProjectStatus, Screen } from '@/types';

// 상태 배지: green-first 토큰(fg/bg) 직접 소비 (Dashboard와 동일 규칙).
const STATUS_LABEL: Record<ProjectStatus, { label: string; fg: string; bg: string }> = {
  draft: { label: '초안', fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)' },
  active: { label: '활성', fg: 'var(--status-active-fg)', bg: 'var(--status-active-bg)' },
  review: { label: '리뷰', fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)' },
  approved: { label: '승인', fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
  archived: { label: '보관', fg: 'var(--status-archived-fg)', bg: 'var(--status-archived-bg)' },
  handoff: { label: '전달됨', fg: 'var(--status-handoff-fg)', bg: 'var(--status-handoff-bg)' },
};

/** 생성/수정 시간을 가벼운 상대 표현으로. (Dashboard와 동일 톤) */
function formatRelative(ts: FirestoreTime): string {
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

type Tab = 'overview' | 'documents' | 'screens';

interface ProjectDetailProps {
  projectId: string | null;
  projects: Project[];
  screens: Screen[];
  navigate: (hash: string) => void;
  setShareState: (s: ShareState) => void;
  user: User | null;
  /** 딥링크로 진입한 초기 탭 (예: project_{id}_documents) */
  initialTab?: Tab;
  /** 딥링크로 진입한 초기 선택 문서 id (예: project_{id}_document_{docId}) */
  initialDocId?: string | null;
}

export default function ProjectDetail({ projectId, projects, screens, navigate, setShareState, user, initialTab, initialDocId }: ProjectDetailProps) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'overview');
  // 현재 문서 탭에서 선택된 문서 id (공유 '현재 문서 링크'용). ProjectDocuments가 보고.
  const [currentDocId, setCurrentDocId] = useState<string | null>(initialDocId ?? null);
  // 딥링크(해시) 변경 시에만 탭/문서를 동기화. 렌더 중 조정 패턴(effect 미사용 → 사용자 수동 탭 전환 보존).
  const routeKey = `${initialTab ?? ''}|${initialDocId ?? ''}`;
  const [appliedRouteKey, setAppliedRouteKey] = useState(routeKey);
  if (routeKey !== appliedRouteKey) {
    setAppliedRouteKey(routeKey);
    if (initialDocId) {
      setTab('documents');
      setCurrentDocId(initialDocId);
    } else if (initialTab) {
      setTab(initialTab);
    }
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [screenName, setScreenName] = useState('');
  const [screenCode, setScreenCode] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const project = projects.find((p) => p.id === projectId);
  const projectScreens = useMemo(() => screens.filter((s) => s.projectId === projectId), [screens, projectId]);

  // 프로젝트 문서 실시간 구독 (전체 구독 후 클라이언트 필터)
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(col('documents'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectDocument[];
      setDocuments(data.filter((d) => d.projectId === projectId).sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt)));
    });
    return () => unsub();
  }, [projectId]);

  // 프로젝트 멤버 실시간 구독
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(col('projectMembers'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectMember[];
      setMembers(data.filter((m) => m.projectId === projectId && m.status !== 'removed'));
    });
    return () => unsub();
  }, [projectId]);

  // 권한 계산 (훅이므로 early-return 이전에 호출)
  const perms = useRole(project);

  if (!project) return null;
  const { isOwner, canEdit, canDelete, canInvite, role } = perms;
  const status = STATUS_LABEL[project.status ?? 'draft'];
  const isActivated = project.status && project.status !== 'draft';

  const handleAddScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenName.trim() || !screenCode.trim()) return;
    try {
      const ref = await addDoc(col('screens'), {
        projectId,
        name: screenName,
        code: screenCode,
        annotations: [],
        ownerId: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setScreenName('');
      setScreenCode('');
      navigate(`#screen_${ref.id}`);
      showToast('화면이 성공적으로 추가되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteProject = async () => {
    // 프로젝트 + 화면 + 문서 + 멤버 일괄 삭제 (orphan 방지)
    await deleteProjectCascade(project.id);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    navigate('#');
    showToast('프로젝트가 삭제되었습니다.');
  };

  const executeDeleteScreen = async (screenId: string) => {
    // 확정(lock)된 화면을 삭제하면 prototypeLock이 orphan이 되므로 먼저 해제.
    if (project.prototypeLock?.targetType === 'screen' && project.prototypeLock.targetId === screenId) {
      await unlockPrototype(project.id);
    }
    await deleteDoc(docRef('screens', screenId));
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    showToast('화면이 성공적으로 삭제되었습니다.');
  };

  const copyPrototypeUrl = () => {
    const firstScreen = projectScreens[0];
    if (!firstScreen) {
      showToast('등록된 프로토타입 화면이 없습니다.', 'error');
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#screen_${firstScreen.id}`;
    if (copyToClipboard(url)) showToast('프로토타입 URL이 복사되었습니다.');
    else showToast('복사 실패', 'error');
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'documents', label: `문서 (${documents.length})` },
    { key: 'screens', label: `프로토타입 (${projectScreens.length})` },
  ];

  const openAddScreen = () => setIsModalOpen(true);

  return (
    <div className="p-10">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      {showWizard && (
        <ProjectActivationWizard project={project} onClose={() => setShowWizard(false)} onActivated={() => setTab('documents')} />
      )}

      {/* 브레드크럼 + 상태/권한 배지 */}
      <div className="mb-6 flex items-center flex-wrap gap-y-2 text-sm font-medium text-[var(--text-secondary)]">
        <button onClick={() => navigate('#')} className="hover:text-[var(--color-primary-text)] flex items-center gap-1 transition-colors">
          <Folder size={16} /> 프로젝트 목록
        </button>
        <ChevronRight size={16} className="mx-2.5 text-[var(--text-tertiary)]" />
        <span className="text-[var(--text-strong)] bg-[var(--surface-hover)] px-3 py-1 rounded-[var(--radius-pill)]">{project.name}</span>
        <span className="ml-3 text-xs px-2.5 py-1 rounded-[var(--radius-pill)] font-bold" style={{ color: status.fg, backgroundColor: status.bg }}>
          {status.label}
        </span>
        <span className="ml-2 bg-[var(--surface-hover)] text-[var(--text-body)] text-xs px-2.5 py-1 rounded-[var(--radius-md)] font-bold">
          내 권한: {roleLabel(role)}
        </span>
        {!canEdit && (
          <span className="ml-2 inline-flex items-center gap-1 bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded-[var(--radius-md)]">
            <Eye size={12} /> 보기 전용
          </span>
        )}
      </div>

      {/* 헤더: 프로젝트명/설명 + 액션 */}
      <div className="flex flex-col gap-5 mb-8 lg:flex-row lg:flex-wrap lg:justify-between lg:items-end lg:gap-x-6">
        <div className="shrink-0">
          <h1 className="text-4xl font-extrabold text-[var(--text-strong)] tracking-tight">{project.name}</h1>
          <p className="text-[var(--text-secondary)] mt-3 text-lg">
            {project.description?.trim() || '기획 문서와 프로토타입을 한 곳에서 관리합니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {canInvite && (
            <Button
              variant="outline"
              icon={ExternalLink}
              onClick={() =>
                setShareState({
                  isOpen: true,
                  type: 'project',
                  id: project.id,
                  projectId: project.id,
                  // 문서 탭에서 문서가 선택돼 있으면 '현재 문서 링크'도 제공
                  documentId: tab === 'documents' && currentDocId ? currentDocId : undefined,
                })
              }
            >
              공유 및 초대
            </Button>
          )}
          {canEdit && (
            <Button icon={Plus} onClick={openAddScreen}>
              새 화면 추가
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              className="text-[var(--red-600)] border-[var(--red-200)] hover:bg-[var(--red-50)]"
              icon={Trash2}
              onClick={() =>
                setConfirmState({
                  isOpen: true,
                  title: '프로젝트 삭제',
                  msg: `'${project.name}' 프로젝트와 하위 화면·문서·멤버가 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`,
                  action: executeDeleteProject,
                })
              }
            >
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-[var(--border-default)] mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-body)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 개요 탭 */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <ProjectInfoCard
            project={project}
            status={status}
            roleText={roleLabel(role)}
            members={members}
            documents={documents}
            screenCount={projectScreens.length}
          />
          {!isActivated ? (
            <div className="py-16 px-6 text-center border-2 border-dashed border-[var(--brand-200)] rounded-[var(--radius-2xl)] bg-[var(--color-primary-softer)] flex flex-col items-center">
              <div className="w-16 h-16 bg-[var(--color-primary)] rounded-[var(--radius-2xl)] flex items-center justify-center text-[var(--color-on-primary)] mb-5">
                <Rocket size={30} />
              </div>
              <h3 className="text-2xl font-extrabold text-[var(--text-strong)] mb-2">프로젝트를 활성화하세요</h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
                기획 의도·문제·고객·가치·MVP 범위 등을 입력하면 브리프/시장조사/제품화전략 문서가 자동 생성됩니다.
              </p>
              {canEdit && (
                <Button icon={Rocket} onClick={() => setShowWizard(true)} className="mx-auto px-7 py-3">
                  활성화 시작하기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ActivationSummary project={project} />
              <div className="space-y-5">
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
                  <h3 className="font-bold text-[var(--text-strong)] text-lg mb-1">최종 산출물</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-5">코워크 담당자에게 전달할 PRD와 프로토타입 URL입니다.</p>
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" icon={FileText} onClick={() => setTab('documents')} className="justify-start">
                      PRD 문서 관리로 이동
                    </Button>
                    <Button variant="outline" icon={Link2} onClick={copyPrototypeUrl} className="justify-start">
                      프로토타입 URL 복사
                    </Button>
                  </div>
                </div>
                {canEdit && (
                  <Button variant="secondary" icon={Rocket} onClick={() => setShowWizard(true)} className="w-full">
                    활성화 정보 수정
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 문서 탭 */}
      {tab === 'documents' && (
        <>
          {!isActivated ? (
            <div className="py-16 px-6 text-center border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-2xl)] bg-[var(--surface-sunken)] flex flex-col items-center">
              <div className="w-16 h-16 rounded-[var(--radius-2xl)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">먼저 프로젝트를 활성화하세요</h3>
              <p className="text-[var(--text-secondary)] mb-6">활성화하면 기본 기획 문서가 생성됩니다.</p>
              {canEdit && (
                <Button icon={Rocket} onClick={() => setShowWizard(true)} className="mx-auto">
                  활성화 시작하기
                </Button>
              )}
            </div>
          ) : (
            <ProjectDocuments
              project={project}
              documents={documents}
              screens={screens}
              isEditor={canEdit}
              isOwner={isOwner}
              initialDocId={initialDocId}
              onCurrentDocChange={setCurrentDocId}
              navigate={navigate}
            />
          )}
        </>
      )}

      {/* 프로토타입(화면) 탭 */}
      {tab === 'screens' && (
        <>
          <div className="flex justify-end mb-6">
            {canEdit && (
              <Button icon={Plus} onClick={openAddScreen}>
                새 화면 추가
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {projectScreens.map((screen) => (
              <div
                key={screen.id}
                onClick={() => navigate(`#screen_${screen.id}`)}
                className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border-default)] overflow-hidden shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--brand-300)] transition-all cursor-pointer flex flex-col group relative"
              >
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmState({
                        isOpen: true,
                        title: '화면 삭제',
                        msg: `'${screen.name}' 화면과 등록된 데이터가 삭제됩니다. 진행하시겠습니까?`,
                        action: () => executeDeleteScreen(screen.id),
                      });
                    }}
                    className="absolute top-3 right-3 p-2 bg-[var(--surface-card)]/90 backdrop-blur text-[var(--text-tertiary)] hover:text-[var(--red-600)] hover:bg-[var(--red-50)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] opacity-0 group-hover:opacity-100 transition-all z-10 border border-[var(--border-subtle)]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="h-36 bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:bg-[var(--surface-active)] group-hover:text-[var(--color-primary-text)] transition-colors">
                  <FileCode2 size={44} />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-strong)] mb-2 truncate">{screen.name}</h3>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-md)] bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold">
                        <MessageSquarePlus size={12} /> 기획/정책 {(screen.annotations || []).length}개
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <Clock size={12} /> {formatRelative(screen.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 text-[var(--color-primary-text)] font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                    캔버스 열기 <ArrowLeft size={16} className="rotate-180" />
                  </div>
                </div>
              </div>
            ))}
            {projectScreens.length === 0 && (
              <div className="col-span-full py-16 px-6 text-center border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-2xl)] bg-[var(--surface-sunken)] flex flex-col items-center">
                <div className="w-16 h-16 rounded-[var(--radius-2xl)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center mb-5">
                  <Layout size={32} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">등록된 화면이 없습니다</h3>
                <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                  {canEdit ? "'새 화면 추가' 버튼을 눌러 첫 번째 프로토타입을 등록해보세요." : '이 프로젝트에는 아직 등록된 화면이 없습니다.'}
                </p>
                {canEdit && (
                  <Button icon={Plus} onClick={openAddScreen} className="px-6 h-[44px]">
                    새 화면 추가
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[var(--z-modal)] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] p-8 w-full max-w-5xl flex flex-col h-[85vh] animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-[var(--text-strong)] mb-6">새 화면(프로토타입) 추가</h2>
            <form onSubmit={handleAddScreen} className="flex flex-col flex-1 gap-6 overflow-hidden">
              <div>
                <label className="block text-sm font-bold text-[var(--text-body)] mb-2">화면 이름</label>
                <input
                  type="text"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  placeholder="예: 메인 랜딩 페이지, 로그인 모달"
                  className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-lg text-[var(--text-body)]"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <label className="block text-sm font-bold text-[var(--text-body)] mb-2">UI 코드</label>
                <textarea
                  value={screenCode}
                  onChange={(e) => setScreenCode(e.target.value)}
                  className="w-full flex-1 p-5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none font-mono text-sm resize-none bg-[var(--surface-sunken)] text-[var(--text-body)]"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-default)] mt-auto">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit" className="px-8">
                  저장 및 생성
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectInfoCard({
  project,
  status,
  roleText,
  members,
  documents,
  screenCount,
}: {
  project: Project;
  status: { label: string; fg: string; bg: string };
  roleText: string;
  members: ProjectMember[];
  documents: ProjectDocument[];
  screenCount: number;
}) {
  const owner = members.find((m) => m.role === 'owner');
  const ownerLabel = owner?.displayName || owner?.email || (project.ownerId ? '소유자(레거시)' : '—');
  const prd = documents.find((d) => d.type === 'prd');
  const prdStatus = prd ? (prd.status === 'approved' ? '승인 완료' : '작성 중') : '미생성';
  const docProgress = `${documents.length} / ${DOCUMENT_ORDER.length}`;

  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: '프로젝트 상태',
      value: (
        <span className="text-xs font-bold px-2 py-0.5 rounded-[var(--radius-pill)]" style={{ color: status.fg, backgroundColor: status.bg }}>
          {status.label}
        </span>
      ),
    },
    { label: 'Owner', value: ownerLabel },
    { label: '내 권한', value: roleText },
    { label: '참여 멤버', value: `${members.length}명` },
    { label: '문서 진행', value: docProgress },
    { label: '프로토타입 화면', value: `${screenCount}개` },
    { label: 'PRD 승인', value: prdStatus },
  ];

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
      <h3 className="font-bold text-[var(--text-strong)] text-lg mb-4">{project.name}</h3>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-1">
            <dt className="text-xs font-bold text-[var(--text-tertiary)]">{it.label}</dt>
            <dd className="text-sm font-medium text-[var(--text-body)]">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ActivationSummary({ project }: { project: Project }) {
  const a = project.activation;
  if (!a) return null;
  const rows: { label: string; value: string }[] = [
    { label: '기획 의도', value: a.intent },
    { label: '해결하려는 문제', value: a.problem },
    { label: '핵심 고객', value: a.customer },
    { label: '핵심 가치', value: a.value },
    { label: '핵심 차별점', value: a.differentiator },
    { label: '수익 구조', value: a.revenue },
    { label: '최초 진입 시장', value: a.market },
    { label: 'MVP 범위', value: a.mvpScope },
    { label: '나중에 추가할 기능', value: a.laterScope },
    { label: '참고 레퍼런스', value: a.references },
  ];
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
      <h3 className="font-bold text-[var(--text-strong)] text-lg mb-4">활성화 정보</h3>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[120px_1fr] gap-3">
            <dt className="text-xs font-bold text-[var(--text-tertiary)] pt-0.5">{r.label}</dt>
            <dd className="text-sm text-[var(--text-body)] whitespace-pre-wrap">
              {r.value?.trim() || <span className="text-[var(--text-tertiary)]">미입력</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
