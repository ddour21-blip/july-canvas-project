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
import { derivePipelineStatus, deriveNextAction, pipelineStatusLabel } from '@/lib/pipeline';
import type { PipelineStep, PipelineStepStatus } from '@/types';
import ProjectDocuments from './ProjectDocuments';
import ProjectReviews from './ProjectReviews';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
  Package,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  X,
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

// 파이프라인 흐름 탭. 기존 딥링크(documents/screens/handoff)는 normalizeTab으로 매핑해 보존한다.
type Tab = 'overview' | 'planning' | 'design' | 'structure' | 'build_plan' | 'qa_launch' | 'operate' | 'share_feedback';

const ALL_TABS: Tab[] = ['overview', 'planning', 'design', 'structure', 'build_plan', 'qa_launch', 'operate', 'share_feedback'];
// 레거시 탭 키 → 신규 파이프라인 탭(딥링크 하위 호환).
const LEGACY_TAB_MAP: Record<string, Tab> = {
  overview: 'overview',
  documents: 'planning',
  screens: 'design',
  handoff: 'build_plan',
};
const normalizeTab = (t?: string | null): Tab =>
  (t && (LEGACY_TAB_MAP[t] ?? (ALL_TABS.includes(t as Tab) ? (t as Tab) : undefined))) || 'overview';

interface ProjectDetailProps {
  projectId: string | null;
  projects: Project[];
  screens: Screen[];
  navigate: (hash: string) => void;
  setShareState: (s: ShareState) => void;
  user: User | null;
  /** 딥링크로 진입한 초기 탭 (레거시 documents/screens/handoff 포함 — normalizeTab으로 매핑) */
  initialTab?: string;
  /** 딥링크로 진입한 초기 선택 문서 id (예: project_{id}_document_{docId}) */
  initialDocId?: string | null;
  /** project_{id}_screens_new 진입 시 새 화면 추가 모달 자동 오픈 (문서 탭 '프로토타입 추가하기' CTA 연결) */
  initialScreenNew?: boolean;
}

// 파이프라인 단계 상태 → 배지 색상(파생, 저장 안 함).
const PIPELINE_BADGE: Record<PipelineStepStatus, { fg: string; bg: string }> = {
  not_started: { fg: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
  ready: { fg: 'var(--color-primary-text)', bg: 'var(--surface-active)' },
  in_progress: { fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)' },
  needs_review: { fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)' },
  approved: { fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
  needs_regen: { fg: 'var(--amber-700)', bg: 'var(--amber-50)' },
};

/** 개요 탭의 8단계 파이프라인 진행 카드. 단계 클릭 시 해당 탭으로 이동. */
function PipelineProgressCard({
  project,
  documents,
  screens,
  onGo,
}: {
  project: Project;
  documents: ProjectDocument[];
  screens: Screen[];
  onGo: (tab: string) => void;
}) {
  const steps = derivePipelineStatus(project, documents, screens);
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
      <h3 className="font-bold text-[var(--text-strong)] text-lg mb-1">파이프라인 진행 상황</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">아이디어부터 운영까지 단계별 산출물 상태입니다. 각 단계를 눌러 이동하세요.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((s, i) => {
          const c = PIPELINE_BADGE[s.status];
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => onGo(s.tab)}
              className="text-left rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div className="text-[11px] font-bold text-[var(--text-strong)] truncate">
                <span className="font-mono text-[var(--text-tertiary)]">{i + 1}.</span> {s.label}
              </div>
              <span
                className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-pill)]"
                style={{ color: c.fg, backgroundColor: c.bg }}
              >
                {pipelineStatusLabel(s.status)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 개요 탭 상단 '다음 할 일' 카드. 파이프라인 상태에서 가장 먼저 할 작업을 추천(파생, 저장 안 함).
function NextActionCard({
  project,
  documents,
  screens,
  onGo,
}: {
  project: Project;
  documents: ProjectDocument[];
  screens: Screen[];
  onGo: (tab: string) => void;
}) {
  const next = deriveNextAction(project, documents, screens);
  if (!next) {
    return (
      <div className="bg-[var(--green-50)] border border-[var(--green-100)] rounded-[var(--radius-xl)] p-6 shadow-[var(--admin-shadow-sm)]">
        <div className="flex items-center gap-2 text-[var(--green-700)] font-bold">
          <CheckCircle2 size={18} /> 모든 필수 단계를 완료했습니다
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">필요하면 QA/배포·운영 단계를 이어서 진행하세요.</p>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-primary-softer)] border border-[var(--color-blue-200)] rounded-[var(--radius-xl)] p-6 shadow-[var(--admin-shadow-sm)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[var(--color-primary-text)] font-bold">
            <ArrowRight size={16} /> 다음 할 일
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
            현재 프로젝트 상태 기준으로 가장 먼저 확인할 작업입니다.
          </p>
          <div className="mt-2 text-[var(--text-strong)] font-bold">
            {next.label} <span className="text-xs font-medium text-[var(--text-tertiary)]">· {pipelineStatusLabel(next.status)}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{next.reason}</p>
        </div>
        <Button onClick={() => onGo(next.tab)} className="shrink-0">
          {next.cta}
        </Button>
      </div>
    </div>
  );
}

// 디자인/프로토타입 탭의 단계 헤더(번호 배지 + 제목 + 설명). 단계 흐름이 보이도록 정리.
function StepHeader({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold text-sm">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-bold text-[var(--text-strong)] text-lg leading-tight">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function ProjectDetail({ projectId, projects, screens, navigate, setShareState, user, initialTab, initialDocId, initialScreenNew }: ProjectDetailProps) {
  const [tab, setTab] = useState<Tab>(initialDocId ? 'planning' : normalizeTab(initialTab));
  // 현재 문서 탭에서 선택된 문서 id (공유 '현재 문서 링크'용). ProjectDocuments가 보고.
  const [currentDocId, setCurrentDocId] = useState<string | null>(initialDocId ?? null);
  // 해시(딥링크/뒤로가기/새로고침)로 들어온 탭을 단일 소스로 동기화. 렌더 중 조정 패턴(effect 미사용).
  const tabFromRoute: Tab = initialDocId ? 'planning' : normalizeTab(initialTab);
  const routeKey = `${tabFromRoute}|${initialDocId ?? ''}`;
  const [appliedRouteKey, setAppliedRouteKey] = useState(routeKey);
  if (routeKey !== appliedRouteKey) {
    setAppliedRouteKey(routeKey);
    setTab(tabFromRoute);
    if (initialDocId) setCurrentDocId(initialDocId);
  }
  // 탭 전환: UI는 즉시 갱신(낙관적) + 해시를 통해 history에 기록 → 브라우저 뒤로가기/새로고침 복원.
  const goTab = (t: Tab) => {
    setTab(t);
    if (projectId) navigate(`#project_${projectId}_${t}`);
  };
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

  // project_{id}_screens_new 진입 시 새 화면 추가 모달 자동 오픈(편집 권한 한정). 1회 처리 후 URL의 _new 플래그 정리.
  useEffect(() => {
    if (initialScreenNew && perms.canEdit && projectId) {
      setIsModalOpen(true);
      if (typeof window !== 'undefined') window.history.replaceState(null, '', `#project_${projectId}_screens`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScreenNew, perms.canEdit, projectId]);

  // Dashboard "AI로 시작하기"로 방금 생성된 프로젝트면 AI 기획 위저드를 1회 자동 오픈(중복 입력 제거).
  // 신호는 sessionStorage(생성 직후 set). 아직 비활성(draft)이고 편집 권한일 때만, 한 번 처리 후 신호 제거.
  useEffect(() => {
    if (!projectId || !project || !perms.canEdit) return;
    if (project.status && project.status !== 'draft') return;
    let signaled = false;
    try {
      if (sessionStorage.getItem('jc:autostart-planning') === projectId) {
        sessionStorage.removeItem('jc:autostart-planning');
        signaled = true;
      }
    } catch { /* sessionStorage 접근 불가 시 무시 */ }
    if (signaled) setShowWizard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project?.status, perms.canEdit]);

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
    { key: 'planning', label: '기획' },
    { key: 'design', label: `디자인/프로토타입 (${projectScreens.length})` },
    { key: 'structure', label: '구조 설계' },
    { key: 'build_plan', label: '개발 패키지' },
    { key: 'qa_launch', label: 'QA/배포' },
    { key: 'operate', label: '운영' },
    { key: 'share_feedback', label: '공유/피드백' },
  ];

  // 단계 문서 워크스페이스 / 활성화 게이트 (구조설계·QA/배포·운영 탭 공통 렌더).
  const activationGate = (desc: string) => (
    <div className="jca-card">
      <div className="jca-empty">
        <span className="jca-empty__icon"><FileText size={22} /></span>
        <div className="jca-empty__title">먼저 AI 기획을 시작하세요</div>
        <p className="jca-empty__desc">{desc}</p>
        {canEdit && (
          <button type="button" className="jca-btn jca-btn--primary" onClick={() => setShowWizard(true)}>
            <PlayCircle size={16} />AI 기획 시작하기
          </button>
        )}
      </div>
    </div>
  );
  const stageDocs = (stage: PipelineStep) => (
    <ProjectDocuments
      project={project}
      documents={documents}
      screens={screens}
      isEditor={canEdit}
      isOwner={isOwner}
      section="documents"
      stage={stage}
      onCurrentDocChange={setCurrentDocId}
      navigate={navigate}
    />
  );

  const STATUS_DOT: Record<ProjectStatus, string> = {
    draft: 'jca-status--muted',
    active: 'jca-status--active',
    review: 'jca-status--warning',
    approved: 'jca-status--success',
    archived: 'jca-status--muted',
    handoff: '',
  };

  return (
    <div className="p-10 max-w-[1280px]">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      {showWizard && (
        <ProjectActivationWizard project={project} onClose={() => setShowWizard(false)} onActivated={() => goTab('planning')} />
      )}

      {/* 브레드크럼 (admin) */}
      <nav className="jca-breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('#projects'); }}>프로젝트</a>
        <ChevronRight size={14} />
        <span className="jca-breadcrumb__current">{project.name}</span>
      </nav>

      {/* 페이지 헤더 (admin page-head) */}
      <div className="jca-page-head">
        <div>
          <div className="jca-page-head__title">
            {project.name}
            <span className={`jca-status ${STATUS_DOT[project.status ?? 'draft']}`} style={{ marginLeft: 'var(--space-2)' }}>
              <span className="jca-status__dot" />
              {status.label}
            </span>
          </div>
          <p className="jca-page-head__desc">
            {project.description?.trim() || '기획 문서와 프로토타입을 한 곳에서 관리합니다.'}
            <span className="text-[var(--admin-text-muted)]"> · 내 권한 {roleLabel(role)}{!canEdit && ' · 보기 전용'}</span>
          </p>
        </div>
        <div className="jca-page-head__actions">
          {canInvite && (
            <button
              type="button"
              className="jca-btn jca-btn--secondary"
              onClick={() =>
                setShareState({
                  isOpen: true,
                  type: 'project',
                  id: project.id,
                  projectId: project.id,
                  documentId: tab === 'planning' && currentDocId ? currentDocId : undefined,
                })
              }
            >
              <ExternalLink size={16} />공유
            </button>
          )}
          {/* primary CTA: 비활성→활성화 시작하기. (프로토타입 탭의 '새 화면 추가'는 AI 생성이 기본 플로우가 되어 */}
          {/*  상단 공통 액션에서 제거 — 수동 코드 추가는 프로토타입 탭의 '수동 생성 옵션' 아코디언에서 진입한다.) */}
          {canEdit && !isActivated && (
            <button type="button" className="jca-btn jca-btn--primary" onClick={() => setShowWizard(true)}>
              <PlayCircle size={16} />AI 기획 시작하기
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="jca-btn jca-btn--ghost"
              style={{ color: 'var(--admin-danger)' }}
              onClick={() =>
                setConfirmState({
                  isOpen: true,
                  title: '프로젝트를 삭제하시겠습니까?',
                  msg: `'${project.name}' 프로젝트와 하위 화면·문서·멤버 정보가 삭제됩니다. 삭제 후 복구할 수 없습니다.`,
                  action: executeDeleteProject,
                })
              }
            >
              <Trash2 size={16} />삭제
            </button>
          )}
        </div>
      </div>

      {/* 탭 (admin) */}
      <div className="jca-tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`jca-tab${tab === t.key ? ' jca-tab--active' : ''}`} onClick={() => goTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 개요 탭 — 비활성: 시작 안내 / 활성: 상태 대시보드 */}
      {tab === 'overview' && (!isActivated ? (
        <div className="space-y-5">
          {/* 1) 활성화 유도 카드 (가장 중요한 행동) */}
          <div className="jca-card jca-card--pad flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="shrink-0 w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <PlayCircle size={24} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[var(--text-strong)]">첫 기획을 시작해볼까요?</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                서비스의 목적·사용자·참고 자료를 정리하면 July Canvas가 기획 문서 초안을 만들어드립니다. 시작 방식 → 아이디어 입력 → AI 정리 확인 → 기획 문서 생성 순서로 진행됩니다.
              </p>
              {project.activation?.intent?.trim() && (
                <p className="mt-3 text-sm text-[var(--text-body)] bg-[var(--surface-active)] border border-[var(--color-blue-100)] rounded-[var(--radius-md)] px-3 py-2 leading-relaxed line-clamp-2">
                  <span className="font-bold text-[var(--color-primary-text)]">입력한 아이디어</span> · {project.activation.intent.trim()}
                </p>
              )}
            </div>
            {canEdit && (
              <button type="button" className="jca-btn jca-btn--primary shrink-0" onClick={() => setShowWizard(true)}>
                <PlayCircle size={16} />AI 기획 시작하기
              </button>
            )}
          </div>
          {/* 2) 프로젝트 정보 (참고, 2순위) */}
          <ProjectInfoCard
            project={project}
            status={status}
            roleText={roleLabel(role)}
            members={members}
            documents={documents}
            screenCount={projectScreens.length}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* 다음 할 일(파생, 저장 안 함) — 가장 먼저 확인할 작업: hero 위치 */}
          <NextActionCard project={project} documents={documents} screens={screens} onGo={(t) => goTab(normalizeTab(t))} />
          <ProjectInfoCard
            project={project}
            status={status}
            roleText={roleLabel(role)}
            members={members}
            documents={documents}
            screenCount={projectScreens.length}
          />
          {/* 파이프라인 8단계 진행 상황(파생, 저장 안 함) */}
          <PipelineProgressCard project={project} documents={documents} screens={screens} onGo={(t) => goTab(normalizeTab(t))} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ActivationSummary project={project} />
            <div className="space-y-5">
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
                <h3 className="font-bold text-[var(--text-strong)] text-lg mb-1">최종 산출물</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-5">개발 전달에 사용할 PRD·프로토타입 URL과 개발 전달 패키지입니다.</p>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" icon={FileText} onClick={() => goTab('build_plan')} className="justify-start">
                    PRD 문서 관리로 이동
                  </Button>
                  <Button variant="outline" icon={Link2} onClick={copyPrototypeUrl} className="justify-start">
                    프로토타입 URL 복사
                  </Button>
                  <Button variant="outline" icon={Package} onClick={() => goTab('build_plan')} className="justify-start">
                    개발 전달 패키지로 이동
                  </Button>
                </div>
              </div>
              {canEdit && (
                <Button variant="secondary" icon={Pencil} onClick={() => setShowWizard(true)} className="w-full">
                  기획 정보 수정
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 기획 탭 (구 documents) — 기획 단계 문서(브리프/시장조사/제품화전략) */}
      {tab === 'planning' && (
        <>
          {!isActivated ? (
            <div className="jca-card">
              <div className="jca-empty">
                <span className="jca-empty__icon">
                  <FileText size={22} />
                </span>
                <div className="jca-empty__title">먼저 AI 기획을 시작하세요</div>
                <p className="jca-empty__desc">AI 기획을 시작하면 기본 기획 문서(브리프·시장조사·제품화 전략)가 만들어집니다.</p>
                {canEdit && (
                  <button type="button" className="jca-btn jca-btn--primary" onClick={() => setShowWizard(true)}>
                    <PlayCircle size={16} />AI 기획 시작하기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ProjectDocuments
              project={project}
              documents={documents}
              screens={screens}
              isEditor={canEdit}
              isOwner={isOwner}
              section="documents"
              stage="planning"
              initialDocId={initialDocId}
              onCurrentDocChange={setCurrentDocId}
              navigate={navigate}
            />
          )}
        </>
      )}

      {/* 디자인/프로토타입 탭 — 하나의 그룹 카드 안에 1·2·3 단계 흐름 */}
      {tab === 'design' && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
          {/* 상단 안내 */}
          <div>
            <h2 className="font-bold text-[var(--text-strong)] text-xl">디자인/프로토타입</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              디자인 기준을 정리한 뒤, 클릭 가능한 HTML 프로토타입을 생성하고 화면을 관리합니다.
            </p>
          </div>

          {/* 1. 디자인 기준 정리 — 디자인 컨텍스트 compact card */}
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <StepHeader
              n={1}
              title="디자인 기준 정리"
              desc="참고 URL, 이미지, 디자인 메모를 바탕으로 프로토타입에 반영할 디자인 기준을 정리합니다."
            />
            {isActivated ? (
              <ProjectDocuments
                project={project}
                documents={documents}
                screens={screens}
                isEditor={canEdit}
                isOwner={isOwner}
                section="documents"
                stage="design"
                variant="compact"
                embedded
                navigate={navigate}
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-lg)] px-4 py-3">
                AI 기획을 시작하면 디자인 기준(디자인 컨텍스트)을 정리할 수 있습니다.
              </p>
            )}
          </div>

          {/* 2. 프로토타입 생성 — AI 프로토타입 생성 compact card */}
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <StepHeader
              n={2}
              title="프로토타입 생성"
              desc="클릭 가능한 HTML 프로토타입을 생성합니다. 생성된 화면은 아래 ‘프로토타입 화면’에 추가됩니다."
            />
            <ProjectDocuments
              project={project}
              documents={documents}
              screens={screens}
              isEditor={canEdit}
              isOwner={isOwner}
              section="prototype"
              prototypePart="generate"
              embedded
              navigate={navigate}
            />
          </div>

          {/* 3. 프로토타입 화면 — 등록 화면 목록(먼저) + 보조 액션 toolbar */}
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <StepHeader
              n={3}
              title="프로토타입 화면"
              desc="AI로 생성되었거나 직접 추가한 프로토타입 화면을 확인하고 보완합니다."
            />
            <div className="mb-3">
              <h4 className="font-bold text-[var(--text-strong)]">
                등록된 프로토타입 화면{projectScreens.length > 0 ? ` (${projectScreens.length})` : ''}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {projectScreens.length > 0
                  ? '생성되었거나 직접 추가한 화면 목록입니다.'
                  : '등록된 프로토타입 화면이 없습니다. 2단계에서 AI 프로토타입을 생성하거나 아래에서 새 화면을 직접 추가하세요.'}
              </p>
            </div>
            {/* 화면 목록(있을 때만 그리드 노출). 카드가 과하게 넓어지지 않도록 auto-fill + 최소폭. */}
            {projectScreens.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {projectScreens.map((screen) => (
              <div
                key={screen.id}
                onClick={() => navigate(`#screen_${screen.id}`)}
                className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden hover:border-[var(--border-strong)] transition-colors cursor-pointer flex flex-col group relative"
              >
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmState({
                        isOpen: true,
                        title: '화면을 삭제하시겠습니까?',
                        msg: `'${screen.name}' 화면과 등록된 주석·데이터가 삭제됩니다. 삭제 후 복구할 수 없습니다.`,
                        action: () => executeDeleteScreen(screen.id),
                      });
                    }}
                    className="absolute top-3 right-3 p-2 bg-[var(--surface-card)]/90 backdrop-blur text-[var(--text-tertiary)] hover:text-[var(--red-600)] hover:bg-[var(--red-50)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] opacity-0 group-hover:opacity-100 transition-all z-10 border border-[var(--border-subtle)]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {/* 미니 레이아웃 미리보기 placeholder: 코드 기반 화면이 '정상 등록됨'으로 보이도록 와이어프레임으로 표현. */}
                <div className="h-36 relative bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] p-3 group-hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="h-full w-full rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-xs)] p-2 flex flex-col gap-1.5 overflow-hidden">
                    {/* header bar */}
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" />
                      <span className="ml-auto h-1.5 w-10 rounded-full bg-[var(--surface-hover)]" />
                    </div>
                    {/* body: sidebar + content blocks */}
                    <div className="flex-1 flex gap-1.5 min-h-0">
                      <div className="w-1/4 rounded bg-[var(--surface-hover)]" />
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="h-2 w-2/3 rounded bg-[var(--surface-hover)]" />
                        <div className="h-1.5 w-full rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]" />
                        <div className="h-1.5 w-5/6 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]" />
                        {/* CTA block */}
                        <div className="mt-auto h-2.5 w-12 rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)]" />
                      </div>
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <FileCode2 size={10} /> 코드 기반 화면
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-strong)] mb-2 truncate">{screen.name}</h3>
                    <div className="flex items-center flex-wrap gap-2">
                      {/* 기획/정책 주석(annotations) 개수 — 0개일 땐 의미 없는 노이즈라 숨기고, 있을 때만 표시 */}
                      {(screen.annotations || []).length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-md)] bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold">
                          <MessageSquarePlus size={12} /> 기획/정책 {(screen.annotations || []).length}개
                        </span>
                      )}
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
              </div>
            )}
            {/* 보조 액션: 새 화면 직접 추가 / 프로토타입 프롬프트 생성 (목록 아래 toolbar) */}
            <div className="mt-4">
              <ProjectDocuments
                project={project}
                documents={documents}
                screens={screens}
                isEditor={canEdit}
                isOwner={isOwner}
                section="prototype"
                prototypePart="manual"
                embedded
                navigate={navigate}
              />
            </div>
          </div>
        </div>
      )}

      {/* 구조 설계 탭 — IA·기능정의서·서비스 구조 설계 (역작성 영역 포함) */}
      {tab === 'structure' && (
        isActivated ? stageDocs('structure') : activationGate('AI 기획을 시작하고 프로토타입을 확정하면 IA·기능정의서·서비스 구조 설계를 작성할 수 있습니다.')
      )}

      {/* 개발 패키지 탭 (구 handoff) — PRD·개발 계획 + 개발 전달 패키지 */}
      {tab === 'build_plan' && (
        isActivated ? (
          <div className="space-y-6">
            {stageDocs('build_plan')}
            <ProjectDocuments
              project={project}
              documents={documents}
              screens={screens}
              isEditor={canEdit}
              isOwner={isOwner}
              section="handoff"
              navigate={navigate}
            />
          </div>
        ) : activationGate('AI 기획을 시작하고 문서·프로토타입이 준비되면 PRD·개발 계획과 개발 전달 패키지를 생성할 수 있습니다.')
      )}

      {/* QA/배포 탭 — QA 기준·배포 준비 체크리스트 */}
      {tab === 'qa_launch' && (
        isActivated ? stageDocs('qa') : activationGate('AI 기획을 시작하고 개발 계획이 준비되면 QA 기준·배포 준비 체크리스트를 작성할 수 있습니다.')
      )}

      {/* 운영 탭 — 운영 개선 리포트 */}
      {tab === 'operate' && (
        isActivated ? stageDocs('operate') : activationGate('출시 후 운영 개선 리포트를 작성할 수 있습니다. 먼저 AI 기획을 시작하세요.')
      )}

      {/* 공유/피드백 탭 — 외부 공개 리뷰(public_review). owner/editor만. */}
      {tab === 'share_feedback' && (
        canEdit ? (
          <ProjectReviews projectId={project.id} user={user} />
        ) : (
          <div className="jca-card">
            <div className="jca-empty">
              <span className="jca-empty__icon"><FileText size={22} /></span>
              <div className="jca-empty__title">공유/피드백</div>
              <p className="jca-empty__desc">외부 공개 리뷰 관리는 Owner 또는 Editor 권한이 필요합니다.</p>
            </div>
          </div>
        )
      )}

      {isModalOpen && canEdit && (
        <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <form onSubmit={handleAddScreen} className="jca-modal jca-modal--lg" style={{ maxHeight: '85vh' }}>
            <div className="jca-modal__head">
              <h2 className="jca-modal__title">새 화면(프로토타입) 추가</h2>
              <button type="button" className="jca-icon-btn" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="jca-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="jca-field" style={{ marginBottom: 0 }}>
                <label className="jca-field__label">화면 이름</label>
                <input
                  className="jca-input"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  placeholder="예: 메인 랜딩 페이지, 로그인 모달"
                  required
                  autoFocus
                />
              </div>
              <div className="jca-field" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <label className="jca-field__label">UI 코드</label>
                <textarea
                  className="jca-textarea"
                  style={{ flex: 1, minHeight: 240, fontFamily: 'var(--font-mono)' }}
                  value={screenCode}
                  onChange={(e) => setScreenCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="jca-modal__foot">
              <button type="button" className="jca-btn jca-btn--secondary" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button type="submit" className="jca-btn jca-btn--primary">
                저장 및 생성
              </button>
            </div>
          </form>
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
      <h3 className="font-bold text-[var(--text-strong)] text-lg mb-4">기획 정보</h3>
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
