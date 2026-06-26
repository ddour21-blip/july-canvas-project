'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { useRole, roleLabel } from '@/lib/auth';
import { deleteProjectCascade } from '@/lib/projects';
import { unlockPrototype } from '@/lib/prototypes';
import { copyToClipboard, getTime, nowMs, showToast } from '@/lib/utils';
import { subscribeProjectSources } from '@/lib/projectSources';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { ShareState } from '@/components/modals/ShareModal';
import ProjectActivationWizard from './ProjectActivationWizard';
import { derivePipelineStatus, deriveNextAction } from '@/lib/pipeline';
import type { DocumentType, PipelineStep, PipelineStepStatus, ProjectSource } from '@/types';
import ProjectDocuments from './ProjectDocuments';
import ProjectReviews from './ProjectReviews';
import {
  ArrowLeft,
  ArrowRight,
  Check,
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
  PlayCircle,
  Plus,
  Settings,
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

// 시작 방식(activation.mode) 사용자 표기.
const MODE_LABEL: Record<string, string> = {
  idea_productization: '아이디어 제품화',
  requirement_planning: '요구사항·RFP 기반',
  legacy: '기존 프로젝트',
};

// 제품 제작 파이프라인 — 사용자 노출 단계명은 July Canvas 핵심 용어를 유지(순화하지 않음).
type StageState = 'done' | 'doing' | 'next' | 'wait' | 'na';
const STAGE_FLOW: {
  key: string; label: string; doing: string; output: string; tab: Tab; steps: PipelineStep[];
}[] = [
  { key: 'plan', label: '기획', doing: '서비스 목적·사용자·문제·제품화 방향을 정리합니다.', output: '프로젝트 브리프, 시장조사, 제품화 전략', tab: 'planning', steps: ['planning'] },
  { key: 'design', label: '디자인/프로토타입', doing: '기획을 바탕으로 화면 흐름과 디자인 기준을 정리합니다.', output: '디자인 컨텍스트, 프로토타입 초안', tab: 'design', steps: ['design'] },
  { key: 'structure', label: '구조 설계', doing: '화면과 기능을 서비스 구조·IA·기능정의서로 연결합니다.', output: 'IA, 기능정의서, 서비스 구조', tab: 'structure', steps: ['structure'] },
  { key: 'build', label: '개발 패키지', doing: '개발자가 바로 참고할 전달 문서와 작업 계획을 묶습니다.', output: 'PRD, 개발 계획, 전달 패키지', tab: 'build_plan', steps: ['build_plan'] },
  { key: 'qa', label: 'QA/배포', doing: '출시 전 확인 기준과 배포 체크리스트를 정리합니다.', output: 'QA 기준, 배포 체크리스트', tab: 'qa_launch', steps: ['qa', 'launch'] },
  { key: 'operate', label: '운영', doing: '출시 후 확인할 지표와 개선 리포트를 정리합니다.', output: '운영 리포트, 개선 기준', tab: 'operate', steps: ['operate'] },
  { key: 'share', label: '공유/피드백', doing: '외부에 공유하고 피드백을 받아 다음 개선으로 연결합니다.', output: '공유 링크, 피드백 기록', tab: 'share_feedback', steps: [] },
];

const STAGE_STATE_LABEL: Record<StageState, string> = {
  done: '완료', doing: '진행 중', next: '다음', wait: '대기', na: '예정',
};

const stageStateOf = (steps: PipelineStep[], byStep: Record<string, PipelineStepStatus>): StageState => {
  if (!steps.length) return 'na';
  const sts = steps.map((s) => byStep[s]);
  if (sts.every((s) => s === 'approved')) return 'done';
  if (sts.some((s) => s === 'in_progress' || s === 'needs_review' || s === 'needs_regen')) return 'doing';
  if (sts.some((s) => s === 'ready')) return 'next';
  return 'wait';
};

// 산출물 그룹 — Overview에선 그룹별 준비 상태만(전체 나열 금지). 펼치면 항목 표시.
type ArtifactItem = { label: string; type?: DocumentType; proto?: boolean; pkg?: boolean };
const ARTIFACT_GROUPS: { label: string; tab: Tab; items: ArtifactItem[] }[] = [
  { label: '기획 산출물', tab: 'planning', items: [{ label: '프로젝트 브리프', type: 'brief' }, { label: '시장조사', type: 'market_research' }, { label: '제품화 전략', type: 'product_strategy' }] },
  { label: '디자인/프로토타입', tab: 'design', items: [{ label: '디자인 컨텍스트', type: 'design_context' }, { label: '프로토타입 초안', proto: true }] },
  { label: '구조 설계', tab: 'structure', items: [{ label: 'IA', type: 'ia' }, { label: '기능정의서', type: 'feature_spec' }, { label: '서비스 구조', type: 'service_structure' }] },
  { label: '개발 패키지', tab: 'build_plan', items: [{ label: 'PRD', type: 'prd' }, { label: '개발 계획', type: 'development_plan' }, { label: '전달 패키지', pkg: true }] },
  { label: 'QA/운영', tab: 'qa_launch', items: [{ label: 'QA 기준', type: 'qa_criteria' }, { label: '배포 체크리스트', type: 'launch_checklist' }, { label: '운영 리포트', type: 'operation_report' }] },
];

// 미완성 표시(placeholder) 토큰 — handoff 준비도 경고용(문서 content 스캔, UI 전용).
const PLACEHOLDER_RE = /_\([^)]*\)_|확인 필요|미입력|추후 정의|적절히 처리|\bTBD\b|\bTODO\b/g;

// '다음 할 일' Hero 문구 — deriveNextAction의 step에 매핑(없으면 next.label/reason/cta 폴백).
// why = '왜 이 단계가 필요한지' 3가지. 사용자 노출 단계명은 유지하되 보조 설명을 쉽게.
type HeroCopy = { title: string; desc: string; cta: string; why: string[] };
const HERO_COPY: Partial<Record<PipelineStep, HeroCopy>> = {
  planning: { title: '기획을 마무리할 차례입니다', desc: '생성된 기획 문서를 검토하고 부족한 부분을 보완하면 다음 단계로 이어집니다.', cta: '기획 문서 보기', why: ['무엇을·왜 만들지 기준 확립', '시장·사용자 근거 정리', '이후 디자인·개발의 출발점'] },
  design: { title: '디자인/프로토타입을 정리하세요', desc: '기획을 바탕으로 주요 화면 흐름과 디자인 기준을 정리하면 구조 설계가 수월해집니다.', cta: '디자인/프로토타입 정리하기', why: ['사용자 흐름 정렬', '개발 리스크 사전 제거', '구조 설계 속도 향상'] },
  structure: { title: '구조 설계를 확인하세요', desc: '화면과 기능을 서비스 구조·IA·기능정의서로 연결하면 개발 전달 준비가 갖춰집니다.', cta: '구조 설계 확인하기', why: ['화면-기능 연결 명확화', '누락 없는 범위 정의', '개발 패키지 기반 마련'] },
  build_plan: { title: '개발 패키지를 준비하세요', desc: '개발자가 바로 참고할 PRD·개발 계획·전달 패키지를 묶어 정리합니다.', cta: '개발 패키지 준비하기', why: ['개발 착수 즉시 가능', '의사결정 근거 동봉', '재작업·누락 최소화'] },
  qa: { title: 'QA/배포를 점검하세요', desc: '출시 전 확인 기준과 배포 체크리스트를 정리해 안정적으로 출시하세요.', cta: 'QA/배포 점검하기', why: ['출시 전 결함 예방', '배포 절차 표준화', '운영 인계 준비'] },
  launch: { title: 'QA/배포를 점검하세요', desc: '배포 전 점검 항목과 체크리스트를 확인해 안정적으로 출시하세요.', cta: 'QA/배포 점검하기', why: ['출시 전 결함 예방', '배포 절차 표준화', '운영 인계 준비'] },
  operate: { title: '운영 기준을 정리하세요', desc: '출시 후 확인할 지표와 개선 리포트를 정리해 다음 개선으로 이어가세요.', cta: '운영 기준 정리하기', why: ['지표 기반 개선', '운영 이슈 추적', '다음 버전 근거 축적'] },
};
// 초안(미시작) 상태 Hero — July Canvas가 무엇을 해주는지 + 첫 단계 안내.
const HERO_START: HeroCopy = {
  title: '아이디어를 제품 제작 파이프라인으로 정리합니다',
  desc: '한 줄 아이디어나 요구사항을 바탕으로 기획 · 디자인/프로토타입 · 구조 설계 · 개발 패키지 · QA/배포 · 운영까지 하나의 흐름으로 이어드립니다.',
  cta: 'AI 기획 시작하기',
  why: ['웹에서 한 줄로 바로 시작', '기획부터 운영까지 한 흐름', '단계마다 다음 할 일 안내'],
};

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
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [showAllArtifacts, setShowAllArtifacts] = useState(false);

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

  // 참고자료(projectSources) 실시간 구독 — 우측 context rail '참고자료 수' / handoff 맥락용.
  useEffect(() => {
    if (!projectId) {
      setSources([]);
      return;
    }
    const unsub = subscribeProjectSources(projectId, setSources);
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
            {project.description?.trim() || 'AI 서비스 제작 작업 공간 — 기획부터 개발 전달까지 한 곳에서 진행합니다.'}
            <span className="text-[var(--admin-text-muted)]"> · {formatRelative(project.updatedAt ?? project.createdAt)} 수정 · 내 권한 {roleLabel(role)}{!canEdit && ' · 보기 전용'}</span>
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
          {canEdit && isActivated && (
            <button type="button" className="jca-btn jca-btn--secondary" onClick={() => setShowWizard(true)} title="기획 정보 수정">
              <Settings size={16} />설정
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

      {/* 개요 탭 — AI 서비스 제작 작업 공간 (파생만 사용, 저장/더미 없음) */}
      {tab === 'overview' && (() => {
        const pipe = derivePipelineStatus(project, documents, screens);
        const byStep = Object.fromEntries(pipe.map((s) => [s.step, s.status])) as Record<string, PipelineStepStatus>;
        const next = isActivated ? deriveNextAction(project, documents, screens) : null;
        const intent = project.activation?.intent?.trim() || project.description?.trim() || '';
        const modeLabel = MODE_LABEL[project.activation?.mode ?? 'legacy'] ?? '아이디어 제품화';
        const memberCount = Math.max(members.length, project.memberUids?.length ?? 0, project.ownerId ? 1 : 0);

        // 단계 상태 + 현재 단계
        const stageStates = STAGE_FLOW.map((stg) => ({ ...stg, state: stageStateOf(stg.steps, byStep) }));
        const currentStage =
          stageStates.find((s) => s.state === 'doing') ??
          stageStates.find((s) => s.state === 'next') ??
          stageStates.find((s) => s.state !== 'done') ??
          stageStates[stageStates.length - 1];

        // Hero: 초안 → 제품 소개 + 첫 단계 / 진행 중 → 다음 할 일 / 완료 → 전달·공유
        const hero: HeroCopy = !isActivated
          ? HERO_START
          : next
            ? (HERO_COPY[next.step] ?? { title: next.label, desc: next.reason, cta: next.cta, why: [] })
            : { title: '필수 단계를 모두 마쳤어요', desc: '개발 전달 패키지를 생성하거나 결과물을 공유해 피드백을 받아보세요.', cta: '개발 전달 패키지 생성', why: ['핵심 산출물 준비 완료', '개발 착수 가능 상태', '공유·피드백으로 개선'] };
        const onHero = () => { if (!isActivated) setShowWizard(true); else if (next) goTab(next.tab as Tab); else goTab('build_plan'); };

        // 산출물 그룹 준비 현황(그룹별 N/M — 전체 나열 금지, 펼치면 항목 표시)
        const itemPrepared = (it: ArtifactItem): boolean => {
          if (it.proto) return !!project.prototypeLock || projectScreens.length > 0;
          const has = (t?: DocumentType) => !!t && !!documents.find((x) => x.type === t)?.content?.trim();
          if (it.pkg) return has('prd') && has('development_plan') && (!!project.prototypeLock || projectScreens.length > 0);
          return has(it.type);
        };
        const groupStats = ARTIFACT_GROUPS.map((g) => ({ ...g, ready: g.items.filter(itemPrepared).length, total: g.items.length }));
        const buildState = stageStateOf(['build_plan'], byStep);
        const placeholderCount = documents.reduce((n, d) => n + ((d.content || '').match(PLACEHOLDER_RE)?.length || 0), 0);
        const recentDocs = [...documents].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)).slice(0, 3);

        return (
          <div className="jca-ws-split">
            <div className="jca-ws-main space-y-5">
              {/* ── 1) Workspace Hero — July Canvas가 무엇을 해주는지 + 지금 할 일 ── */}
              <div className="jca-wsx-hero">
                <div>
                  <span className="jca-wsx-hero__eyebrow"><ArrowRight size={13} /> NEXT ACTION · 지금 할 일</span>
                  <h2 className="jca-wsx-hero__title">{hero.title}</h2>
                  <p className="jca-wsx-hero__desc">{hero.desc}</p>
                  {canEdit && (
                    <div className="jca-wsx-hero__cta">
                      <button type="button" className="jca-btn jca-btn--primary jca-btn--lg" onClick={onHero}>
                        {!isActivated ? <PlayCircle size={16} /> : null}{hero.cta}<ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {hero.why.length > 0 && (
                  <div className="jca-wsx-hero__why">
                    <span className="jca-wsx-hero__why-t">이 단계가 중요한 이유</span>
                    <ul style={{ display: 'contents' }}>
                      {hero.why.map((w) => (
                        <li key={w}><CheckCircle2 size={15} /> {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 2) 제품 제작 파이프라인 — 화면 중심의 큰 가로형 흐름 ── */}
              <div className="jca-card" style={{ padding: 'var(--space-8)' }}>
                <h3 className="font-bold text-[var(--text-strong)] text-lg mb-1">제품 제작 파이프라인</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-2">한 줄 아이디어가 기획부터 운영까지 하나의 흐름으로 이어집니다. 단계를 눌러 이동하세요.</p>
                <div className="jca-wsx-pipe">
                  {stageStates.map((s, i) => {
                    const isCurrent = s.state !== 'done' && s.key === currentStage.key;
                    const cls = s.state === 'done' ? ' jca-wsx-node--done' : isCurrent ? ' jca-wsx-node--current' : '';
                    return (
                      <button key={s.key} type="button" className={`jca-wsx-node${cls}`} onClick={() => goTab(s.tab)} aria-label={`${s.label} · ${STAGE_STATE_LABEL[s.state]}`}>
                        <span className="jca-wsx-node__circle">
                          {s.state === 'done' ? <Check size={26} /> : isCurrent ? i + 1 : <span className="jca-wsx-node__dot" />}
                        </span>
                        <span className="jca-wsx-node__label">{s.label}</span>
                        <span className="jca-wsx-node__state">{STAGE_STATE_LABEL[s.state]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 3) 현재 단계 상세 ── */}
              <div className="jca-card jca-card--pad">
                <span className="jca-wsx-hero__eyebrow"><ArrowRight size={13} /> 현재 단계</span>
                <h3 className="text-xl font-extrabold text-[var(--text-strong)] mt-1.5">{currentStage.label}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{currentStage.doing}</p>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <p className="text-sm text-[var(--text-body)]">
                    <span className="font-bold text-[var(--color-primary-text)]">만들어질 산출물</span> · {currentStage.output}
                  </p>
                  {canEdit && (
                    <button type="button" className="jca-btn jca-btn--secondary shrink-0" onClick={() => (isActivated ? goTab(currentStage.tab) : setShowWizard(true))}>
                      {isActivated ? `${currentStage.label}(으)로 이동` : 'AI 기획 시작하기'}<ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── 4) 산출물 요약 — 그룹별 준비 상태(전체는 펼쳐서) ── */}
              <div className="jca-card jca-card--pad">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-bold text-[var(--text-strong)] text-lg">산출물 준비 현황</h3>
                  <button type="button" className="jca-ws-h__a" onClick={() => setShowAllArtifacts((v) => !v)}>
                    {showAllArtifacts ? '간단히 보기' : '전체 산출물 보기'}
                  </button>
                </div>
                {groupStats.map((g) => (
                  <div key={g.label}>
                    <div className={`jca-wsx-group${g.ready === g.total ? ' jca-wsx-group--done' : ''}`} onClick={() => goTab(g.tab)} role="button" tabIndex={0}>
                      <span className="jca-wsx-group__name">{g.label}</span>
                      <span className="jca-wsx-group__bar"><span style={{ width: `${Math.round((g.ready / g.total) * 100)}%` }} /></span>
                      <span className="jca-wsx-group__count">{g.ready}/{g.total} 준비</span>
                    </div>
                    {showAllArtifacts && (
                      <div className="jca-wsx-group__items">
                        {g.items.map((it) => {
                          const ok = itemPrepared(it);
                          return (
                            <div key={it.label} className="jca-wsx-item">
                              <span className="inline-flex items-center gap-2"><span className="jca-wsx-item__dot" style={{ background: ok ? 'var(--green-500)' : 'var(--gray-300)' }} />{it.label}</span>
                              <span className="jca-meta">{ok ? '준비' : '없음'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── 5) 우측 Context Rail — 맥락 중심 ── */}
            <aside className="jca-ws-rail space-y-4">
              {/* 프로젝트 맥락 */}
              <div className="jca-rail-card">
                <div className="jca-rail-card__t">프로젝트 맥락</div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">시작 방식</span><b className="text-[var(--admin-text-primary)]">{modeLabel}</b></div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">참고자료</span><b className="text-[var(--admin-text-primary)]">{sources.length}개</b></div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">멤버</span><b className="text-[var(--admin-text-primary)]">{memberCount}명</b></div>
                {intent ? (
                  <p className="mt-3 pt-3 border-t border-[var(--admin-border-subtle)] text-sm text-[var(--text-body)] leading-relaxed line-clamp-4">
                    <span className="block text-xs font-bold text-[var(--color-primary-text)] mb-1">입력한 아이디어</span>{intent}
                  </p>
                ) : (
                  <p className="mt-3 pt-3 border-t border-[var(--admin-border-subtle)] text-xs text-[var(--admin-text-muted)]">아직 입력한 아이디어가 없습니다. AI 기획 시작에서 추가하세요.</p>
                )}
              </div>

              {/* AI가 이어서 정리하는 것 */}
              <div className="jca-rail-card">
                <div className="jca-rail-card__t">AI가 이어서 정리하는 것</div>
                <ul className="flex flex-col gap-2.5">
                  {stageStates.map((s) => (
                    <li key={s.key} className="flex items-center gap-2.5 text-sm text-[var(--text-body)]">
                      <span className="jca-sumrow__dot" style={{ background: s.state === 'done' ? 'var(--green-500)' : s.key === currentStage.key ? 'var(--color-accent)' : 'var(--gray-300)' }} />
                      <span className="flex-1">{s.label}</span>
                      <span className="jca-meta">{STAGE_STATE_LABEL[s.state]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 현재 진행 상태 */}
              <div className="jca-rail-card">
                <div className="jca-rail-card__t">현재 진행 상태</div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">현재 단계</span><b className="text-[var(--color-primary-text)]">{currentStage.label}</b></div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">다음 할 일</span><b className="text-[var(--admin-text-primary)]">{isActivated ? (next ? next.label : '전달/공유') : 'AI 기획 시작'}</b></div>
                <div className="jca-sumrow">
                  <span className="text-[var(--admin-text-secondary)]">개발 패키지 준비도</span>
                  <b style={{ color: buildState === 'done' ? 'var(--green-700)' : buildState === 'wait' || buildState === 'na' ? 'var(--text-tertiary)' : 'var(--color-blue-700)' }}>{STAGE_STATE_LABEL[buildState]}</b>
                </div>
                {placeholderCount > 0 && (
                  <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">미완성 표시</span><b className="text-[var(--amber-700)]">{placeholderCount}곳</b></div>
                )}
              </div>

              {/* 최근 활동 (보조) */}
              <div className="jca-rail-card">
                <div className="jca-rail-card__t">최근 활동</div>
                <div className="jca-sumrow"><span className="text-[var(--admin-text-secondary)]">최근 수정</span><b className="text-[var(--admin-text-primary)]">{formatRelative(project.updatedAt ?? project.createdAt)}</b></div>
                {recentDocs.length > 0 ? (
                  <ul className="mt-2 pt-2 border-t border-[var(--admin-border-subtle)] flex flex-col gap-2">
                    {recentDocs.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                        <FileText size={14} className="text-[var(--admin-text-muted)] shrink-0" />
                        <span className="truncate flex-1">{d.title?.trim() || d.type}</span>
                        <span className="jca-meta shrink-0">{formatRelative(d.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 pt-2 border-t border-[var(--admin-border-subtle)] text-xs text-[var(--admin-text-muted)]">아직 생성된 문서가 없습니다.</p>
                )}
              </div>
            </aside>
          </div>
        );
      })()}

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
