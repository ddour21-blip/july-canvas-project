'use client';

import { useEffect, useRef, useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { copyToClipboard, formatDateTime, getTime, nowMs, showToast } from '@/lib/utils';
import { DOCUMENT_META, DOCUMENT_ORDER, REQUIRED_DOCUMENT_TYPES, generatePRD, injectPrototypeUrl } from '@/lib/documents';
import { buildDesignContext } from '@/lib/designContext';
import { buildServiceStructure } from '@/lib/serviceStructure';
import { buildDevelopmentPlan } from '@/lib/developmentPlan';
import { buildQaCriteria } from '@/lib/qaCriteria';
import { buildLaunchChecklist } from '@/lib/launchChecklist';
import { buildOperationReport } from '@/lib/operationReport';
import { buildPrototypePackage } from '@/lib/prototypePrompt';
import { buildInformationArchitecture, type IaTarget } from '@/lib/informationArchitecture';
import { buildFeatureSpec } from '@/lib/featureSpec';
import { buildHandoffPackage, type HandoffPackage, type HandoffPrototype } from '@/lib/handoffPackage';
import { downloadHandoffFile, downloadHandoffZip } from '@/lib/exportHandoffPackage';
import { deletePrototypeUrl, lockPrototype, registerPrototypeScreen, subscribePrototypeUrls, unlockPrototype } from '@/lib/prototypes';
import { generateHtmlBoilerplate } from '@/lib/htmlRenderer';
import type { PrototypeMode } from '@/lib/ai/prompts/prototype';
import { shareHash, toShareUrl } from '@/lib/shareLinks';
import { useAuth } from '@/lib/auth';
import { downloadTextFile } from '@/lib/export/exportMarkdown';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { Copy, CheckCircle2, ChevronRight, Circle, Clock, Download, ExternalLink, Eye, FileText, Link2, Lock, MonitorPlay, Package, Plus, RefreshCw, Save, Trash2, Wand2, X } from 'lucide-react';
import { EMPTY_ACTIVATION } from '@/types';
import type {
  DocumentStatus,
  DocumentType,
  FirestoreTime,
  PipelineStep,
  Project,
  ProjectDocument,
  ProjectSource,
  ProjectStatus,
  Screen,
} from '@/types';

// 문서 목록 시각 그룹: 기초 기획 / 프로토타입 기반 산출. (DocumentType/순서/데이터는 그대로, UI 표시용)
// 파이프라인 흐름에 맞춘 문서 그룹. 각 그룹은 한 단계(stage)에 대응한다.
const DOC_GROUPS: { label: string; types: DocumentType[] }[] = [
  { label: '기획', types: ['brief', 'market_research', 'product_strategy'] },
  { label: '디자인', types: ['design_context'] },
  { label: '구조 설계', types: ['ia', 'feature_spec', 'service_structure'] },
  { label: '개발 패키지', types: ['prd', 'development_plan'] },
  { label: 'QA/배포', types: ['qa_criteria', 'launch_checklist'] },
  { label: '운영', types: ['operation_report'] },
];

// stage(파이프라인 단계) → 해당 단계에서 다루는 문서 타입. 탭별 워크스페이스 필터/기본 선택에 사용.
const STAGE_TYPES: Partial<Record<PipelineStep, DocumentType[]>> = {
  planning: ['brief', 'market_research', 'product_strategy'],
  design: ['design_context'],
  structure: ['ia', 'feature_spec', 'service_structure'],
  build_plan: ['prd', 'development_plan'],
  qa: ['qa_criteria', 'launch_checklist'],
  operate: ['operation_report'],
};

// 템플릿 기반 신규 문서 생성기 디스패치(동일 시그니처). prd/ia/feature_spec은 별도 흐름 사용.
const PIPELINE_DOC_BUILDERS: Partial<
  Record<DocumentType, (project: Project, docs: ProjectDocument[], generatedAt: string) => string>
> = {
  design_context: buildDesignContext,
  service_structure: buildServiceStructure,
  development_plan: buildDevelopmentPlan,
  qa_criteria: buildQaCriteria,
  launch_checklist: buildLaunchChecklist,
  operation_report: buildOperationReport,
};

// 확정 프로토타입 변경 시 '재생성 필요' 판정 대상(역작성 산출물).
const REGEN_TYPES: DocumentType[] = ['ia', 'feature_spec', 'prd'];

// UI 표시용 파생 상태(저장 status는 변경하지 않음). 미작성/초안/검토중/승인됨/재생성 필요.
type DerivedDocStatus = 'missing' | 'draft' | 'review' | 'approved' | 'needs_regen';

const DERIVED_STATUS: Record<DerivedDocStatus, { label: string; fg: string; bg: string }> = {
  missing: { label: '미작성', fg: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
  draft: { label: '초안', fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)' },
  review: { label: '검토중', fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)' },
  approved: { label: '승인됨', fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
  needs_regen: { label: '재생성 필요', fg: 'var(--amber-700)', bg: 'var(--amber-50)' },
};

/**
 * 저장 status + 문서 의존성 기준으로 UI 표시 상태를 파생한다(저장값 변경 없음).
 * 우선순위: 미작성 → 재생성 필요 → 승인됨 → 검토중 → 초안.
 * stale(재생성 필요) 의존성:
 *  - IA: prototypeLock.lockedAt > ia.updatedAt
 *  - 기능정의서: prototypeLock.lockedAt > fs.updatedAt  또는  ia.updatedAt > fs.updatedAt
 *  - PRD: prototypeLock.lockedAt > prd.updatedAt  또는  feature_spec.updatedAt > prd.updatedAt
 * 타임스탬프가 없거나 비교 불가하면 needs_regen 으로 표시하지 않는다(오탐 방지).
 * docs를 넘기면 상위 문서(IA/기능정의서) 변경까지 반영한다.
 */
function deriveDocStatus(
  doc: ProjectDocument | undefined,
  project: Project,
  docs?: ProjectDocument[],
): DerivedDocStatus {
  if (!doc) return 'missing';
  if (REGEN_TYPES.includes(doc.type)) {
    const updatedMs = getTime(doc.updatedAt);
    if (updatedMs) {
      const lockedMs = project.prototypeLock ? getTime(project.prototypeLock.lockedAt) : 0;
      const iaMs = getTime(docs?.find((d) => d.type === 'ia')?.updatedAt);
      const fsMs = getTime(docs?.find((d) => d.type === 'feature_spec')?.updatedAt);
      let threshold = lockedMs || 0;
      if (doc.type === 'feature_spec' && iaMs) threshold = Math.max(threshold, iaMs);
      if (doc.type === 'prd' && fsMs) threshold = Math.max(threshold, fsMs);
      if (threshold && updatedMs < threshold) return 'needs_regen';
    }
  }
  if (doc.status === 'approved') return 'approved';
  if (doc.status === 'review') return 'review';
  return 'draft';
}

/** 마지막 수정일을 가벼운 상대 표현으로. (워크스페이스 톤 일관) */
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

function StatusBadge({ status }: { status: DerivedDocStatus }) {
  const s = DERIVED_STATUS[status];
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-[var(--radius-pill)]" style={{ color: s.fg, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

interface Props {
  project: Project;
  documents: ProjectDocument[];
  screens: Screen[];
  isEditor: boolean;
  isOwner: boolean;
  /** 렌더할 섹션 — 프로젝트 상세 탭별로 기능을 분리(문서/프로토타입/개발 전달). 기본 'documents'. */
  section?: 'documents' | 'prototype' | 'handoff';
  /** prototype 섹션 세분화 — 'generate'=AI 생성 카드만, 'manual'=화면 직접 추가만. 미지정 시 둘 다(하위 호환). */
  prototypePart?: 'generate' | 'manual';
  /** documents 섹션 렌더 방식 — 'compact'면 무거운 워크스페이스 대신 stage 문서를 상태 카드로 노출(디자인 탭용). */
  variant?: 'full' | 'compact';
  /** 상위 그룹 카드 안에 끼워 넣는 모드 — 자체 카드 chrome를 낮추고(인셋) 보조 액션처럼 렌더. 디자인 탭 단계용. */
  embedded?: boolean;
  /** 문서 워크스페이스를 특정 파이프라인 단계로 한정(좌측 그룹/기본 선택/보조 패널 노출). 미지정 시 전체. */
  stage?: PipelineStep;
  /** 딥링크로 진입한 초기 선택 문서 id (해당 문서 타입을 선택 상태로) */
  initialDocId?: string | null;
  /** 현재 선택된 문서 id를 상위로 보고 (공유 '현재 문서 링크'용) */
  onCurrentDocChange?: (docId: string | null) => void;
  /** 프로토타입 화면 딥링크 이동용 */
  navigate?: (hash: string) => void;
}

// AI 실행 노출 스위치(클라이언트). Vercel=false(로컬 전용 베타), 로컬=true. provider도 서버에서 disabled 기본.
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';

// /api/generate/prototype 실패 reason → 사용자 안내 메시지.
const PROTOTYPE_FAIL_MESSAGES: Record<string, string> = {
  AI_DISABLED: '로컬 AI 실행이 꺼져 있습니다. AI_PROVIDER=local-cli, NEXT_PUBLIC_AI_ENABLED=true로 dev 서버를 다시 실행해야 합니다.',
  TIMEOUT: '프로토타입 생성 시간이 초과되었습니다. 다시 시도하거나 수동 생성 옵션을 사용해주세요.',
  CLI_ERROR: 'Claude CLI 실행 중 문제가 발생했습니다. 터미널에서 Claude 로그인 상태 또는 실행 시간을 확인해주세요.',
  PARSE_ERROR: 'AI가 프로토타입 HTML을 올바른 JSON 형식으로 반환하지 못했습니다. 다시 생성하거나 수동 생성 옵션을 사용해주세요.',
  BAD_REQUEST: '프로토타입 생성에 필요한 입력값이 부족합니다. AI 기획 시작 또는 문서 생성을 먼저 확인해주세요.',
  JOB_NOT_FOUND: '진행 중이던 프로토타입 생성 작업을 찾을 수 없습니다(서버 재시작 등). 다시 생성해주세요.',
  UNKNOWN: '프로토타입 생성 중 알 수 없는 오류가 발생했습니다.',
};
const prototypeFailMessage = (reason?: string): string =>
  PROTOTYPE_FAIL_MESSAGES[reason ?? 'UNKNOWN'] ?? PROTOTYPE_FAIL_MESSAGES.UNKNOWN;

export default function ProjectDocuments({ project, documents, screens, isEditor, isOwner, section = 'documents', stage, prototypePart, variant = 'full', embedded = false, initialDocId, onCurrentDocChange, navigate }: Props) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // stage가 지정되면 그 단계의 첫 문서를 기본 선택(탭별 워크스페이스). 아니면 기존처럼 첫 문서.
  const stageTypes = stage ? STAGE_TYPES[stage] ?? null : null;
  const [selectedType, setSelectedType] = useState<DocumentType>(stageTypes?.[0] ?? DOCUMENT_ORDER[0]);
  // 좌측 네비에 노출할 그룹: stage 지정 시 해당 단계 그룹만, 아니면 전체.
  const visibleGroups = stageTypes ? DOC_GROUPS.filter((g) => g.types.some((t) => stageTypes.includes(t))) : DOC_GROUPS;
  // 프로토타입 제작 패키지 (로컬 생성 → 복사. Firestore 저장 안 함)
  const [prototypePkg, setPrototypePkg] = useState<string | null>(null);
  // AI 클릭형 HTML 프로토타입 (로컬 Claude CLI 생성 → 미리보기 후 확정 시 screen 저장)
  const [aiProto, setAiProto] = useState<{ title: string; description: string; html: string } | null>(null);
  const [aiProtoLoading, setAiProtoLoading] = useState(false);
  const [savingProto, setSavingProto] = useState(false);
  // AI 프로토타입 디자인 입력: 유형(mode) · 참고 URL/이미지 링크 · 디자인 메모. (생성 payload에 전달)
  const [protoMode, setProtoMode] = useState<PrototypeMode>('auto');
  const [protoRefs, setProtoRefs] = useState('');
  const [protoNotes, setProtoNotes] = useState('');
  // AI 프로토타입 생성 실패 안내(카드에 잔류 표시). reason 매핑 메시지.
  const [aiProtoError, setAiProtoError] = useState<string | null>(null);
  // background job polling 타이머. 페이지 이동 후 복귀 시 localStorage jobId로 재개.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 개발 전달 패키지 (B7/B8): 로컬 생성 → 복사. Firestore 저장 안 함.
  const [handoffPkg, setHandoffPkg] = useState<HandoffPackage | null>(null);
  const [handoffTab, setHandoffTab] = useState(0);
  // 프로젝트 전환 시 이전 프로젝트의 패키지가 남지 않도록 초기화 (렌더 중 조정 패턴).
  const [pkgProjectId, setPkgProjectId] = useState(project.id);
  if (project.id !== pkgProjectId) {
    setPkgProjectId(project.id);
    setPrototypePkg(null);
    setHandoffPkg(null);
    setHandoffTab(0);
  }

  // 앱 스타일 확인 모달(브라우저 confirm 대체). 기준 변경/덮어쓰기 같은 주의 액션에 사용.
  const [confirm, setConfirm] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });
  const closeConfirm = () => setConfirm((c) => ({ ...c, isOpen: false }));

  // 확정 프로토타입(lock) 관리용 — 화면(screens)/URL(projectSources) 목록 구독.
  const [prototypeUrls, setPrototypeUrls] = useState<ProjectSource[]>([]);

  useEffect(() => {
    const unsub = subscribePrototypeUrls(project.id, setPrototypeUrls);
    return () => unsub();
  }, [project.id]);

  const projectScreens = screens.filter((s) => s.projectId === project.id);

  // 확정 프로토타입 (Project.prototypeLock)
  const lock = project.prototypeLock ?? null;
  const isLockTarget = (targetType: 'screen' | 'source', id: string) =>
    !!lock && lock.targetType === targetType && lock.targetId === id;

  const doLock = async (input: { targetType: 'screen' | 'source'; targetId: string; title?: string; url?: string }) => {
    try {
      await lockPrototype(project.id, { ...input, lockedBy: user?.uid ?? 'anonymous' });
      showToast('기준 프로토타입으로 확정되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('확정 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleLock = (input: { targetType: 'screen' | 'source'; targetId: string; title?: string; url?: string }) => {
    // 이미 다른 항목이 확정돼 있으면 앱 스타일 모달로 기준 변경을 확인(기존 문서는 자동 삭제하지 않음).
    if (lock && !(lock.targetType === input.targetType && lock.targetId === input.targetId)) {
      setConfirm({
        isOpen: true,
        title: '확정 기준을 변경할까요?',
        msg: '선택한 프로토타입 화면이 이후 IA와 기능정의서 생성 기준으로 사용됩니다. 기존에 작성된 문서는 삭제되지 않지만, 새로 생성하는 초안의 기준은 변경됩니다.',
        confirmLabel: '기준 변경',
        tone: 'warning',
        action: () => {
          closeConfirm();
          doLock(input);
        },
      });
      return;
    }
    doLock(input);
  };

  const handleUnlock = async () => {
    try {
      await unlockPrototype(project.id);
      showToast('확정이 해제되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('해제 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteUrl = async (id: string) => {
    try {
      // 확정된 프로토타입이면 lock orphan 방지를 위해 먼저 확정 해제 후 삭제.
      if (isLockTarget('source', id)) await unlockPrototype(project.id);
      await deletePrototypeUrl(id);
      showToast('프로토타입 URL이 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // 확정(lock) 대상(screen/source) 해석. 못 찾으면 null.
  const resolveLockTarget = (): IaTarget | null => {
    if (!lock) return null;
    if (lock.targetType === 'screen') {
      const sc = screens.find((s) => s.id === lock.targetId);
      if (!sc) { showToast('확정된 화면을 찾을 수 없습니다.', 'error'); return null; }
      return { kind: 'screen', screen: sc };
    }
    const src = prototypeUrls.find((p) => p.id === lock.targetId);
    if (!src) { showToast('확정된 URL 프로토타입을 찾을 수 없습니다.', 'error'); return null; }
    return { kind: 'source', source: src };
  };

  // B5: 확정 프로토타입(lock) 기준 IA 초안 생성 → 기존 ia 문서 생성/업데이트. (IA만, FEATURE_SPEC/PRD 미변경)
  const handleGenerateIA = () => {
    if (!lock) return;
    const existing = byType('ia');
    if (existing) {
      const stale = deriveDocStatus(existing, project, documents) === 'needs_regen';
      setConfirm({
        isOpen: true,
        title: 'IA 초안을 다시 생성할까요?',
        msg: stale
          ? '최신 기준(확정 프로토타입)으로 IA를 재생성하면 현재 IA 문서 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)'
          : '현재 IA 문서를 다시 생성하면 기존 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)',
        confirmLabel: '다시 생성',
        tone: 'warning',
        action: () => {
          closeConfirm();
          runGenerateIA();
        },
      });
      return;
    }
    runGenerateIA();
  };

  const runGenerateIA = async () => {
    if (!lock) return;
    const target = resolveLockTarget();
    if (!target) return;
    const existing = byType('ia');
    const content = buildInformationArchitecture(project, lock, target, formatDateTime(nowMs()));
    try {
      if (existing) {
        const cur = parseFloat(existing.version);
        const nextV = isNaN(cur) ? existing.version : (cur + 0.1).toFixed(1);
        await updateDoc(docRef('documents', existing.id), { content, status: 'draft' as DocumentStatus, version: nextV, updatedAt: serverTimestamp() });
      } else {
        await addDoc(col('documents'), {
          projectId: project.id,
          type: 'ia' as DocumentType,
          title: DOCUMENT_META.ia.title,
          content,
          version: '1.0',
          status: 'draft' as DocumentStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setSelectedType('ia');
      showToast('확정 프로토타입 기반 IA 초안이 생성되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('IA 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  // B6: 확정 프로토타입 + IA 기준 기능정의서(feature_spec) 초안 역작성. (IA/PRD content 미변경)
  const handleGenerateFeatureSpec = () => {
    if (!lock) return;
    const iaDoc = byType('ia');
    if (!iaDoc) { showToast('먼저 IA를 생성해주세요.', 'error'); return; }
    const existing = byType('feature_spec');
    if (existing) {
      const stale = deriveDocStatus(existing, project, documents) === 'needs_regen';
      setConfirm({
        isOpen: true,
        title: '기능정의서를 다시 생성할까요?',
        msg: stale
          ? '최신 기준(확정 프로토타입·IA)으로 기능정의서를 재생성하면 현재 기능정의서 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)'
          : '현재 기능정의서를 다시 생성하면 기존 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)',
        confirmLabel: '다시 생성',
        tone: 'warning',
        action: () => {
          closeConfirm();
          runGenerateFeatureSpec();
        },
      });
      return;
    }
    runGenerateFeatureSpec();
  };

  const runGenerateFeatureSpec = async () => {
    if (!lock) return;
    const iaDoc = byType('ia');
    if (!iaDoc) { showToast('먼저 IA를 생성해주세요.', 'error'); return; }
    const target = resolveLockTarget();
    if (!target) return;
    const existing = byType('feature_spec');
    const iaRef = `${iaDoc.title} (v${iaDoc.version})`;
    const content = buildFeatureSpec(project, lock, target, iaRef, formatDateTime(nowMs()));
    try {
      if (existing) {
        const cur = parseFloat(existing.version);
        const nextV = isNaN(cur) ? existing.version : (cur + 0.1).toFixed(1);
        await updateDoc(docRef('documents', existing.id), { content, status: 'draft' as DocumentStatus, version: nextV, updatedAt: serverTimestamp() });
      } else {
        await addDoc(col('documents'), {
          projectId: project.id,
          type: 'feature_spec' as DocumentType,
          title: DOCUMENT_META.feature_spec.title,
          content,
          version: '1.0',
          status: 'draft' as DocumentStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setSelectedType('feature_spec');
      showToast('확정 프로토타입 기반 기능정의서 초안이 생성되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('기능정의서 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  // B7/B8: 개발 전달용 MD 패키지(4종) 로컬 생성 → 복사. (Firestore 저장 없음, PRD 조립/문서 content 미변경)
  const handleBuildHandoff = () => {
    let proto: HandoffPrototype | undefined;
    if (lock) {
      if (lock.targetType === 'screen') {
        const sc = screens.find((s) => s.id === lock.targetId);
        proto = { name: lock.title || sc?.name || '확정 화면', type: 'screen', link: toShareUrl(shareHash.screen(lock.targetId)) };
      } else {
        const src = prototypeUrls.find((p) => p.id === lock.targetId);
        proto = { name: lock.title || src?.title || '외부 프로토타입', type: 'source', url: lock.url || src?.url, link: lock.url || src?.url };
      }
    }
    setHandoffPkg(buildHandoffPackage(project, documents, { prototype: proto, generatedAt: formatDateTime(nowMs()) }));
    setHandoffTab(0);
  };

  const handleCopyHandoffFile = () => {
    const file = handoffPkg?.files[handoffTab];
    if (!file) return;
    if (copyToClipboard(file.content)) showToast(`${file.name}을(를) 복사했습니다.`);
    else showToast('복사 실패', 'error');
  };

  const handleCopyHandoffAll = () => {
    if (!handoffPkg) return;
    const all = handoffPkg.files.map((file) => `===== ${file.name} =====\n\n${file.content}`).join('\n\n\n');
    if (copyToClipboard(all)) showToast('개발 전달 패키지 전체를 복사했습니다.');
    else showToast('복사 실패', 'error');
  };

  const handleDownloadHandoffFile = () => {
    const file = handoffPkg?.files[handoffTab];
    if (file) downloadHandoffFile(file);
  };

  const handleDownloadHandoffZip = async () => {
    if (!handoffPkg) return;
    try {
      await downloadHandoffZip(project.name, handoffPkg.files);
      showToast('개발 전달 패키지 ZIP을 다운로드했습니다.');
    } catch (err) {
      console.error(err);
      showToast('ZIP 다운로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const copyLink = (link: string) => {
    if (copyToClipboard(link)) showToast('링크를 복사했습니다.');
    else showToast('복사 실패', 'error');
  };

  const byType = (t: DocumentType) => documents.find((d) => d.type === t);

  // 딥링크 초기 문서 → 해당 문서 타입 선택 (렌더 중 조정 패턴, effect 미사용).
  // 문서 구독이 늦게 도착할 수 있어, 해당 문서를 찾은 시점에만 1회 적용한다.
  const [appliedDocId, setAppliedDocId] = useState<string | null>(null);
  if (initialDocId && initialDocId !== appliedDocId) {
    // initialDocId 는 문서 타입(document_ia 등) 또는 Firestore 문서 id(document_{id}, 하위 호환) 둘 다 허용.
    if (Object.prototype.hasOwnProperty.call(DOCUMENT_META, initialDocId)) {
      // 타입 기반: 문서가 아직 없어도 해당 타입을 선택(빈 상태 복원).
      setAppliedDocId(initialDocId);
      setSelectedType(initialDocId as DocumentType);
    } else {
      const doc = documents.find((d) => d.id === initialDocId);
      if (doc) {
        setAppliedDocId(initialDocId);
        setSelectedType(doc.type);
      }
    }
  }

  // 현재 선택 타입의 문서 id를 상위로 보고 (없으면 null). 프롭 콜백이라 effect 사용 가능.
  useEffect(() => {
    onCurrentDocChange?.(documents.find((d) => d.type === selectedType)?.id ?? null);
  }, [selectedType, documents, onCurrentDocChange]);

  const prototypeUrl = () => {
    const firstScreen = screens.find((s) => s.projectId === project.id);
    if (!firstScreen) return undefined;
    return `${window.location.origin}${window.location.pathname}#screen_${firstScreen.id}`;
  };

  const handleCreate = async (type: DocumentType) => {
    const meta = DOCUMENT_META[type];
    // prd는 종합 조립, 신규 파이프라인 문서는 전용 템플릿 생성기, 그 외는 빈 초안.
    const builder = PIPELINE_DOC_BUILDERS[type];
    const content =
      type === 'prd'
        ? generatePRD(project, documents, prototypeUrl())
        : builder
          ? builder(project, documents, formatDateTime(nowMs()))
          : `# ${meta.title}\n\n_(내용을 입력하세요)_\n`;
    await addDoc(col('documents'), {
      projectId: project.id,
      type,
      title: meta.title,
      content,
      version: '1.0',
      status: 'draft' as DocumentStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSelectedType(type);
    showToast(`${meta.title} 문서가 생성되었습니다.`);
  };

  // 신규 파이프라인 문서 재생성(기존 문서 덮어쓰기, 버전 업). prd/ia/feature_spec은 기존 전용 흐름 사용.
  const handleRegeneratePipelineDoc = async (docu: ProjectDocument) => {
    const builder = PIPELINE_DOC_BUILDERS[docu.type];
    if (!builder) return;
    const cur = parseFloat(docu.version);
    const nextV = isNaN(cur) ? docu.version : (cur + 0.1).toFixed(1);
    await updateDoc(docRef('documents', docu.id), {
      content: builder(project, documents, formatDateTime(nowMs())),
      status: 'draft' as DocumentStatus,
      version: nextV,
      updatedAt: serverTimestamp(),
    });
    showToast(`${DOCUMENT_META[docu.type].title}를(을) 다시 생성했습니다.`);
  };

  // 단계 승인: 사람이 단계 산출물을 승인하며 다음 단계로 넘어가는 파이프라인 원칙용(Owner 전용, PRD 제외).
  // PRD는 프로토타입 URL 주입 + 잠금이 필요한 별도 승인(handleApprovePRD)을 사용한다.
  const handleApproveDoc = async (docu: ProjectDocument) => {
    await updateDoc(docRef('documents', docu.id), { status: 'approved' as DocumentStatus, updatedAt: serverTimestamp() });
    showToast(`${DOCUMENT_META[docu.type].title}를(을) 승인했습니다.`);
  };
  const handleUnapproveDoc = async (docu: ProjectDocument) => {
    await updateDoc(docRef('documents', docu.id), { status: 'draft' as DocumentStatus, updatedAt: serverTimestamp() });
    showToast(`${DOCUMENT_META[docu.type].title} 승인을 해제했습니다.`);
  };

  const handleSave = async (docu: ProjectDocument) => {
    const cur = parseFloat(docu.version);
    const nextV = isNaN(cur) ? docu.version : (cur + 0.1).toFixed(1);
    // 일반 수정 저장은 문서를 다시 '초안'으로 되돌린다(검토중/승인됨 문서를 수정한 경우 포함).
    // locked(승인된 PRD)는 편집 버튼이 가려져 이 경로에 도달하지 않으므로 PRD 승인/잠금 로직과 무관.
    await updateDoc(docRef('documents', docu.id), {
      content: draft,
      version: nextV,
      status: 'draft' as DocumentStatus,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
    showToast('문서가 저장되었습니다.');
  };

  // PRD 재생성 공통 로직. fromLocked=true면 승인 잠금을 해제하고 draft로 되돌린다(명시적 Owner 동작에서만 호출).
  const runRegeneratePRD = async (docu: ProjectDocument, fromLocked: boolean) => {
    const cur = parseFloat(docu.version);
    const nextV = isNaN(cur) ? docu.version : (cur + 0.1).toFixed(1);
    await updateDoc(docRef('documents', docu.id), {
      content: generatePRD(project, documents, prototypeUrl()),
      status: 'draft' as DocumentStatus,
      locked: false,
      version: nextV,
      updatedAt: serverTimestamp(),
    });
    // 승인 잠금을 푸는 재생성이면 프로젝트도 최종 승인 상태에서 승인 전(active)으로 되돌린다(상태 불일치 방지).
    // 활성화 시 사용하는 기존 값 'active'만 사용하고, approved일 때만 변경(archived/handoff 등은 보존).
    if (fromLocked && project.status === 'approved') {
      await updateDoc(docRef('projects', project.id), {
        status: 'active' as ProjectStatus,
        updatedAt: serverTimestamp(),
      });
    }
    showToast(
      fromLocked
        ? '승인을 해제하고 최신 프로토타입 기준으로 PRD를 재생성했습니다. 검토 후 다시 승인하세요.'
        : 'PRD가 최신 데이터로 재생성되었습니다.',
    );
  };

  // 일반(미잠금) PRD 재생성.
  const handleRegeneratePRD = (docu: ProjectDocument) => {
    void runRegeneratePRD(docu, false);
  };

  // 확정 프로토타입 변경으로 needs_regen 된 '승인·잠금' PRD를 Owner가 명시적으로 재생성(잠금 해제).
  // 일반 locked 보호는 유지하고, 이 경로(needs_regen + Owner + 확인)에서만 unlock을 허용한다.
  const handleRegenerateLockedPRD = (docu: ProjectDocument) => {
    setConfirm({
      isOpen: true,
      title: '승인을 해제하고 PRD를 재생성할까요?',
      msg: '확정 프로토타입 기준이 바뀌어 현재 PRD가 오래되었습니다. 재생성하면 승인·잠금이 해제되고 초안(draft)으로 되돌아갑니다. 검토 후 다시 승인할 수 있습니다.',
      confirmLabel: '재생성',
      tone: 'warning',
      action: () => {
        closeConfirm();
        void runRegeneratePRD(docu, true);
      },
    });
  };

  const handleApprovePRD = async (docu: ProjectDocument) => {
    // 승인된 PRD에는 클릭 가능한 프로토타입 URL이 반드시 포함되어야 한다.
    // 프로토타입 화면이 없으면 승인을 막고 경고한다.
    const url = prototypeUrl();
    if (!url) {
      showToast('프로토타입 화면이 없어 승인할 수 없습니다. 먼저 프로토타입을 등록한 뒤 승인하세요.', 'error');
      return;
    }
    // 승인 시점에 최신 프로토타입 URL을 PRD 본문(섹션 14)에 자동 주입한 뒤 잠금.
    const finalContent = injectPrototypeUrl(docu.content, url);
    await updateDoc(docRef('documents', docu.id), {
      content: finalContent,
      status: 'approved',
      locked: true,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(docRef('projects', project.id), { status: 'approved', updatedAt: serverTimestamp() });
    showToast('PRD가 승인·잠금되었습니다. 최신 프로토타입 URL이 포함되었습니다.');
  };

  // 필수 진행률은 기존 핵심 문서(REQUIRED_DOCUMENT_TYPES)만 기준 — 신규 파이프라인 문서는 제외(오염 방지).
  const missingRequired = REQUIRED_DOCUMENT_TYPES.filter((t) => t !== 'prd').filter((t) => !byType(t));
  const createdCount = REQUIRED_DOCUMENT_TYPES.filter((t) => byType(t)).length;

  const selectedMeta = DOCUMENT_META[selectedType];
  const selectedDoc = byType(selectedType);
  const isEditing = selectedDoc && editingId === selectedDoc.id;
  const url = prototypeUrl();

  // 확정 프로토타입 변경 후 재생성 안내/잠금 교착 처리용 파생값.
  const selectedDocStatus = deriveDocStatus(selectedDoc, project, documents);
  const prdNeedsRegen = selectedType === 'prd' && selectedDocStatus === 'needs_regen';
  // 역작성 산출물(IA/기능정의서/PRD) 중 하나라도 재생성 필요 → 순차 재생성 안내 노출.
  const anyDocNeedsRegen = REGEN_TYPES.some((t) => deriveDocStatus(byType(t), project, documents) === 'needs_regen');
  // 재생성 필요가 '확정 프로토타입 변경' 때문인지(IA/기능정의서 수정 등 상위 문서 변경과 구분).
  const prototypeStale =
    !!project.prototypeLock &&
    REGEN_TYPES.some((t) => {
      const u = getTime(byType(t)?.updatedAt);
      const l = getTime(project.prototypeLock?.lockedAt);
      return !!(u && l && u < l);
    });

  const selectDoc = (type: DocumentType) => {
    setSelectedType(type);
    setEditingId(null);
    // 새로고침 복원용: 선택 문서를 해시에 replace로 반영(history 누적 방지 — 탭 전환만 push로 남긴다).
    // 형식: #project_{id}_document_{type}. 라우터(hashchange)를 트리거하지 않으므로 탭/렌더와 충돌 없음.
    if (section === 'documents' && typeof window !== 'undefined') {
      const hash = `#project_${project.id}_document_${type}`;
      if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
    }
  };

  // 프로토타입 제작 패키지: 초기 문서 3종이 모두 생성된 뒤 활성화.
  const initialDocsReady = (['brief', 'market_research', 'product_strategy'] as const).every((t) => byType(t));

  // AI 프로토타입 생성 입력 컨텍스트: 문서 3종 중 하나라도 content가 있거나 activationAnalysis가 있으면 생성 가능.
  const hasPrototypeSourceContext =
    (['brief', 'market_research', 'product_strategy'] as const).some((t) => byType(t)?.content?.trim()) ||
    !!project.activationAnalysis;

  const handleBuildPrototypePackage = () => {
    setPrototypePkg(buildPrototypePackage(project, project.activation ?? EMPTY_ACTIVATION));
  };

  const handleCopyPrototypePackage = () => {
    if (!prototypePkg) return;
    if (copyToClipboard(prototypePkg)) showToast('프로토타입 제작 프롬프트를 복사했습니다.');
    else showToast('복사 실패', 'error');
  };

  // --- AI 프로토타입 생성 background job + polling ---
  // 서버가 job을 만들어 백그라운드로 진행하고, 클라는 jobId(localStorage)로 폴링한다.
  // 페이지 이동/언마운트 후 복귀해도 jobId가 있으면 진행/완료/실패를 다시 확인한다.
  const protoJobKey = `july_canvas_proto_job_${project.id}`;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollPrototypeJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/generate/prototype?jobId=${encodeURIComponent(jobId)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        status?: 'running' | 'done' | 'error';
        prototype?: { title: string; description: string; html: string };
        reason?: string;
      };
      if (json?.status === 'done' && json.prototype?.html) {
        stopPolling();
        if (typeof window !== 'undefined') window.localStorage.removeItem(protoJobKey);
        setAiProto(json.prototype);
        setAiProtoError(null);
        setAiProtoLoading(false);
        showToast('프로토타입 생성이 완료되었습니다. 미리보기를 확인한 뒤 기준 프로토타입으로 확정할 수 있습니다.');
      } else if (json?.status === 'running') {
        setAiProtoLoading(true);
      } else {
        // error / JOB_NOT_FOUND / ok:false → 폴링 중단 + 안내.
        stopPolling();
        if (typeof window !== 'undefined') window.localStorage.removeItem(protoJobKey);
        setAiProtoLoading(false);
        const msg = prototypeFailMessage(json?.reason);
        setAiProtoError(msg);
        showToast(msg, 'error');
      }
    } catch {
      // 일시적 네트워크 오류 → 다음 tick에 재시도(중단하지 않음).
    }
  };

  const startPolling = (jobId: string) => {
    stopPolling();
    setAiProtoLoading(true);
    void pollPrototypeJob(jobId);
    pollRef.current = setInterval(() => {
      void pollPrototypeJob(jobId);
    }, 2500);
  };

  // 마운트/프로젝트 전환 시: 상태 초기화 후 localStorage에 진행 중 jobId가 있으면 폴링 재개.
  useEffect(() => {
    stopPolling();
    setAiProto(null);
    setAiProtoError(null);
    setAiProtoLoading(false);
    if (AI_ENABLED && typeof window !== 'undefined') {
      const jid = window.localStorage.getItem(protoJobKey);
      if (jid) startPolling(jid);
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // 'AI 프로토타입 생성' — job 생성(즉시 반환) 후 폴링 시작. 결과는 폴링이 채운다.
  const handleGenerateAiPrototype = async () => {
    if (!AI_ENABLED || aiProtoLoading) return;
    setAiProtoLoading(true);
    setAiProtoError(null);
    try {
      const res = await fetch('/api/generate/prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          activationAnalysis: project.activationAnalysis ?? null,
          documents: {
            brief: byType('brief')?.content ?? '',
            marketResearch: byType('market_research')?.content ?? '',
            productStrategy: byType('product_strategy')?.content ?? '',
          },
          prototypeMode: protoMode,
          // 줄바꿈/쉼표로 구분된 참고 링크를 배열로 정리.
          referenceUrls: protoRefs
            .split(/[\n,]/)
            .map((u) => u.trim())
            .filter(Boolean)
            .slice(0, 8),
          designNotes: protoNotes.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; jobId?: string; reason?: string };
      if (json?.ok && json.jobId) {
        if (typeof window !== 'undefined') window.localStorage.setItem(protoJobKey, json.jobId);
        startPolling(json.jobId);
        showToast('AI 프로토타입을 생성하고 있습니다. 다른 페이지로 이동해도 작업은 계속 진행됩니다.');
      } else {
        setAiProtoLoading(false);
        const msg = prototypeFailMessage(json?.reason);
        setAiProtoError(msg);
        showToast(msg, 'error');
      }
    } catch {
      setAiProtoLoading(false);
      const msg = prototypeFailMessage('UNKNOWN');
      setAiProtoError(msg);
      showToast(msg, 'error');
    }
  };

  // 생성된 AI 프로토타입을 screen으로 저장하고 기준 프로토타입으로 확정.
  const handleConfirmAiPrototype = async () => {
    if (!aiProto || savingProto) return;
    setSavingProto(true);
    try {
      const screenId = await registerPrototypeScreen({
        projectId: project.id,
        name: aiProto.title || 'AI 프로토타입',
        code: aiProto.html,
        ownerId: user?.uid ?? null,
      });
      await lockPrototype(project.id, {
        targetType: 'screen',
        targetId: screenId,
        title: aiProto.title || 'AI 프로토타입',
        lockedBy: user?.uid ?? 'anonymous',
      });
      showToast('AI 프로토타입을 화면으로 저장하고 기준으로 확정했습니다.');
      setAiProto(null);
    } catch (err) {
      console.error(err);
      showToast('프로토타입 확정 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingProto(false);
    }
  };

  // 순차 흐름 게이팅 기준: 확정 → IA → 기능정의서 → PRD → 개발 전달 패키지.
  const hasIA = !!byType('ia');
  const hasFeatureSpec = !!byType('feature_spec');
  const hasPRD = !!byType('prd');
  const flowSteps: { label: string; done: boolean }[] = [
    { label: '프로토타입 확정', done: !!lock },
    { label: 'IA 생성', done: hasIA },
    { label: '기능정의서 생성', done: hasFeatureSpec },
    { label: 'PRD 생성', done: hasPRD },
    { label: '개발 전달 패키지', done: false },
  ];

  return (
    <div className="space-y-5">
      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.msg}
        confirmLabel={confirm.confirmLabel}
        tone={confirm.tone}
        onConfirm={confirm.action}
        onCancel={closeConfirm}
      />
      {!isEditor && (
        <div className="flex items-center gap-2 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-lg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Eye size={16} className="shrink-0" />
          현재 권한에서는 문서를 편집할 수 없습니다. <span className="font-bold text-[var(--text-body)]">Owner 또는 Editor</span> 권한이 필요합니다. (조회·다운로드는 가능)
        </div>
      )}

      {section === 'documents' && (stage === undefined || stage === 'planning') && (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-[var(--text-strong)] text-lg">문서 파이프라인</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              프로젝트 브리프(시장조사·레퍼런스 포함) → 제품화 전략 → PRD(IA·기능정의서)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{createdCount} / {REQUIRED_DOCUMENT_TYPES.length} 작성</span>
            {missingRequired.length === 0 ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--green-700)] bg-[var(--green-50)] px-3 py-1.5 rounded-[var(--radius-pill)]">
                <CheckCircle2 size={16} /> 필수 문서 완료
              </span>
            ) : (
              <span className="text-sm font-bold text-[var(--amber-700)] bg-[var(--amber-50)] px-3 py-1.5 rounded-[var(--radius-pill)]">
                미작성 {missingRequired.length}건
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 확정 프로토타입 기준 변경 시 순차 재생성 안내(IA → 기능정의서 → PRD). */}
      {section === 'documents' && anyDocNeedsRegen && (stage === undefined || stage === 'structure' || stage === 'build_plan') && (
        <div className="bg-[var(--amber-50)] border border-[var(--amber-100)] rounded-[var(--radius-xl)] px-4 py-3">
          <div className="flex items-start gap-2">
            <RefreshCw size={15} className="text-[var(--amber-700)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--amber-700)]">
                {prototypeStale ? '확정 프로토타입 기준이 변경되었습니다' : '상위 문서(IA·기능정의서)가 변경되었습니다'}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                <b>IA → 기능정의서 → PRD</b> 순서로 재생성하면 최신 기준의 개발 전달 문서를 만들 수 있습니다.
                {isOwner ? ' 승인된 PRD는 재생성 시 잠금이 해제되고 초안으로 돌아갑니다(재승인 필요).' : ' 재생성은 가능하며, PRD 승인은 Owner 권한이 필요합니다.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI 클릭형 HTML 프로토타입 생성 (로컬 전용). 미리보기 후 확정 시 screen 저장 + prototypeLock. */}
      {section === 'prototype' && prototypePart !== 'manual' && (
      <div className={embedded ? 'bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-5' : 'bg-[var(--surface-card)] border border-[var(--brand-200)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]'}>
        {/* 설명 영역(좌측 정렬, 버튼은 입력 아래로 이동). embedded면 단계 헤더가 제목을 대신하므로 아이콘/제목 생략. */}
        <div className="flex items-start gap-3 min-w-0">
          {!embedded && (
            <span className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <MonitorPlay size={20} />
            </span>
          )}
          <div className="min-w-0">
            {!embedded && <h3 className="font-bold text-[var(--text-strong)] text-lg">AI 프로토타입 생성 (클릭형 HTML)</h3>}
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              {initialDocsReady
                ? '기초 문서와 분석 결과를 기반으로 화면 구조를 설계하고, 클릭 가능한 HTML 프로토타입으로 변환합니다. 미리보기를 확인하고 기준 프로토타입으로 확정할 수 있습니다.'
                : hasPrototypeSourceContext
                  ? '일부 기초 문서 또는 분석 결과를 기반으로 화면 구조를 설계해 클릭형 HTML 프로토타입으로 변환합니다. 부족한 정보는 AI가 합리적으로 보완합니다.'
                  : '기초 문서와 분석 결과를 기반으로 화면 구조를 설계하고, 클릭 가능한 HTML 프로토타입으로 변환합니다.'}
            </p>
            {/* embedded에서는 비활성 사유를 버튼 아래에서 한 번만 노출(중복 방지). */}
            {!embedded && !hasPrototypeSourceContext && (
              <p className="text-xs text-[var(--amber-700)] mt-1.5">프로토타입 생성을 위해 먼저 AI 기획 시작 또는 기초 문서 생성이 필요합니다.</p>
            )}
            {!embedded && !AI_ENABLED && (
              <p className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 mt-2">
                AI 프로토타입 생성은 <b>로컬 전용(베타)</b>입니다. 배포 환경에서는 사용할 수 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 디자인 입력: 프로토타입 유형(단독 1줄) → 참고 링크 + 디자인 메모(2열) → 안내. 로컬 AI 전용. */}
        {AI_ENABLED && (
          <div className="mt-5 space-y-3">
            {/* 1) 프로토타입 유형: 단독 1줄 (max-width 420px) */}
            <label className="flex flex-col gap-1.5 w-full max-w-[420px]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">프로토타입 유형</span>
              <select
                value={protoMode}
                onChange={(e) => setProtoMode(e.target.value as PrototypeMode)}
                disabled={!isEditor || aiProtoLoading}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-body)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-60"
              >
                <option value="auto">자동 추천</option>
                <option value="mobile-app">모바일 앱</option>
                <option value="web-landing">웹 랜딩</option>
                <option value="saas-dashboard">SaaS 대시보드</option>
                <option value="admin-console">관리자 콘솔</option>
              </select>
            </label>
            {/* 2) 참고 링크 + 디자인 메모: 데스크톱 2열(좁으면 1열), 두 textarea 높이 동일 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-xs font-bold text-[var(--text-secondary)]">참고 URL / 이미지 링크 <span className="font-medium text-[var(--text-tertiary)]">(선택 · 줄바꿈·쉼표로 여러 개)</span></span>
                <textarea
                  value={protoRefs}
                  onChange={(e) => setProtoRefs(e.target.value)}
                  disabled={!isEditor || aiProtoLoading}
                  placeholder="https://example.com/reference"
                  className="w-full min-h-[112px] resize-y rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-body)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-60"
                />
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-xs font-bold text-[var(--text-secondary)]">디자인 메모 <span className="font-medium text-[var(--text-tertiary)]">(선택 · 톤·레이아웃·색감 등)</span></span>
                <textarea
                  value={protoNotes}
                  onChange={(e) => setProtoNotes(e.target.value)}
                  disabled={!isEditor || aiProtoLoading}
                  placeholder="예: 미니멀한 느낌, 보라색 포인트, 카드 위주 구성"
                  className="w-full min-h-[112px] resize-y rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-body)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-60"
                />
              </label>
            </div>
            {/* 3) 안내 문구 */}
            <p className="text-[11px] text-[var(--text-tertiary)]">
              참고 링크는 AI가 직접 열람하지 않고 디자인 힌트로만 사용합니다. 유형을 “자동 추천”으로 두면 문서 내용에 맞는 유형을 AI가 선택합니다.
            </p>
          </div>
        )}

        {/* 4) 생성 버튼: 입력 영역 아래에 배치(입력 → 생성 흐름) + 비활성 사유 명시 */}
        <div className="mt-5">
          <Button
            variant={aiProto ? 'outline' : 'primary'}
            icon={aiProtoLoading ? undefined : aiProto ? RefreshCw : Wand2}
            onClick={handleGenerateAiPrototype}
            disabled={!AI_ENABLED || !isEditor || !hasPrototypeSourceContext || aiProtoLoading}
            className="w-full sm:w-auto"
          >
            {aiProtoLoading ? '생성 중…' : aiProto ? '다시 생성' : 'AI 프로토타입 생성'}
          </Button>
          {/* 버튼 비활성 사유를 버튼 바로 아래에 명확히 안내(우선순위: 권한 → 소스 → AI 비활성). */}
          {!aiProtoLoading && (!AI_ENABLED || !isEditor || !hasPrototypeSourceContext) && (
            <p className="mt-2 text-xs text-[var(--amber-700)]">
              {!isEditor
                ? '프로토타입 생성에는 Owner 또는 Editor 권한이 필요합니다.'
                : !hasPrototypeSourceContext
                  ? '프로토타입 생성을 위해 AI 기획 시작 또는 기초 문서 생성이 필요합니다.'
                  : 'AI 프로토타입 생성은 로컬 전용(베타)입니다. 배포 환경에서는 사용할 수 없습니다.'}
            </p>
          )}
        </div>

        {/* 생성 중 안내: 페이지 이동해도 백그라운드로 계속 진행됨. */}
        {aiProtoLoading && !aiProto && (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--brand-200)] bg-[var(--color-primary-softer)] px-4 py-3 flex items-start gap-2">
            <RefreshCw size={15} className="text-[var(--color-primary-text)] shrink-0 mt-0.5 animate-spin" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              AI 프로토타입을 생성하고 있습니다. <b className="text-[var(--text-body)]">다른 페이지로 이동해도 작업은 계속 진행</b>되며, 프로토타입 탭으로 돌아오면 결과를 확인할 수 있습니다.
            </p>
          </div>
        )}

        {aiProto && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] overflow-hidden">
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-card)]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text-strong)] truncate">{aiProto.title}</div>
                {aiProto.description && <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{aiProto.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => setAiProto(null)}
                aria-label="닫기"
                className="shrink-0 p-1.5 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            {/* 미리보기: ScreenEditor와 동일한 iframe sandbox 정책(이번 작업에서 변경하지 않음). */}
            <iframe
              title="프로토타입 미리보기"
              srcDoc={generateHtmlBoilerplate(aiProto.html)}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-[480px] border-0 bg-white"
            />
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--surface-card)]">
              <span className="text-[11px] text-[var(--text-tertiary)] mr-auto">확정하면 화면(screen)으로 저장되고 IA·기능정의서 역작성의 기준이 됩니다.</span>
              <Button variant="primary" icon={Lock} onClick={handleConfirmAiPrototype} disabled={!isEditor || savingProto}>
                {savingProto ? '확정 중…' : '확정 프로토타입으로 지정'}
              </Button>
            </div>
          </div>
        )}

        {aiProtoError && !aiProto && (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--red-100)] bg-[var(--red-50)] px-4 py-3">
            <div className="text-sm font-bold text-[var(--red-600)]">생성 실패</div>
            <p className="text-xs text-[var(--red-600)] mt-1 leading-relaxed">{aiProtoError}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">다시 시도하거나, ‘화면 관리’ 단계의 “화면 직접 추가”로 진행할 수 있습니다.</p>
          </div>
        )}
      </div>
      )}

      {/* 화면 직접 추가(보조): 프롬프트 패키지 + 수동 코드 화면 추가.
          embedded면 '프로토타입 화면' 영역의 보조 toolbar로, 아니면 접이식 카드로 렌더. */}
      {section === 'prototype' && prototypePart !== 'generate' && (() => {
        const manualBody = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {isEditor && navigate && (
                <Button
                  variant="outline"
                  icon={Plus}
                  onClick={() => navigate(`#project_${project.id}_screens_new`)}
                >
                  새 화면 직접 추가
                </Button>
              )}
              <Button
                variant={prototypePkg ? 'outline' : 'secondary'}
                icon={prototypePkg ? RefreshCw : Wand2}
                onClick={handleBuildPrototypePackage}
                disabled={!initialDocsReady}
              >
                {prototypePkg ? '프롬프트 다시 생성' : '프로토타입 프롬프트 생성'}
              </Button>
            </div>
            <div className="flex flex-col items-start gap-1 mt-2">
              {!initialDocsReady && (
                <span className="text-[11px] text-[var(--amber-700)]">‘프로토타입 프롬프트 생성’은 브리프·시장조사·제품화전략 문서가 모두 생성되면 사용할 수 있습니다.</span>
              )}
              {prototypePkg && <span className="text-[11px] text-[var(--text-tertiary)]">다시 생성하면 현재 패키지가 갱신됩니다</span>}
            </div>
            {prototypePkg && (
              <div className="mt-4 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--surface-card)]">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">생성된 프로토타입 제작 패키지 (초안)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPrototypePackage}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    >
                      <Copy size={13} /> 프롬프트 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrototypePkg(null)}
                      aria-label="닫기"
                      className="p-1.5 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={prototypePkg}
                  rows={16}
                  className="w-full px-4 py-3 text-xs font-mono leading-relaxed resize-y bg-transparent text-[var(--text-body)] outline-none"
                />
              </div>
            )}
          </>
        );
        // embedded: 큰 카드/아코디언 없이 보조 액션 toolbar로 렌더.
        if (embedded) return <div>{manualBody}</div>;
        return (
          <details className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xs)] group">
            <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 p-5">
              <span className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] flex items-center justify-center">
                  <Wand2 size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-[var(--text-strong)]">화면 직접 추가 <span className="text-[11px] font-medium text-[var(--text-tertiary)]">AI 생성 대신 수동으로</span></span>
                  <span className="block text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">프로토타입 제작 프롬프트를 만들거나, 코드를 직접 붙여넣어 화면을 추가할 수 있습니다.</span>
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-5 pb-5">{manualBody}</div>
          </details>
        );
      })()}

      {section === 'documents' && (stage === undefined || stage === 'structure') && (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--color-primary-text)] flex items-center justify-center">
            <Wand2 size={20} />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--text-strong)] text-lg">확정 프로토타입 · 문서 역작성</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              아래 화면 중 하나를 기준으로 확정한 뒤, 그 화면 구조를 바탕으로 IA·기능정의서를 순서대로 생성합니다.
            </p>
          </div>
        </div>

        {/* 진행 단계: 확정 → IA → 기능정의서 → PRD → 개발 전달 패키지 (현재 위치를 한눈에) */}
        <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
          {flowSteps.map((s, i) => {
            const isCurrent = !s.done && flowSteps.slice(0, i).every((p) => p.done);
            return (
              <span key={s.label} className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-[11px] font-semibold ${
                    s.done
                      ? 'bg-[var(--green-50)] text-[var(--green-700)]'
                      : isCurrent
                        ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)] border border-[var(--color-primary)]'
                        : 'bg-[var(--surface-sunken)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {s.done ? <CheckCircle2 size={12} /> : <span className="font-mono">{i + 1}</span>}
                  {s.label}
                </span>
                {i < flowSteps.length - 1 && <span className="text-[var(--text-tertiary)] text-xs">›</span>}
              </span>
            );
          })}
        </div>

        {/* 확정 대상 목록: 화면(screens) + 기존 URL(projectSources) */}
        {(projectScreens.length > 0 || prototypeUrls.length > 0) && (
          <ul className="mt-5 space-y-2">
            {projectScreens.map((s) => {
              const link = toShareUrl(shareHash.screen(s.id));
              return (
                <li key={`screen-${s.id}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border ${isLockTarget('screen', s.id) ? 'border-[var(--color-primary)] bg-[var(--surface-active)]' : 'border-[var(--border-default)] bg-[var(--surface-sunken)]'}`}>
                  <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--border-default)]"><MonitorPlay size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">화면(코드)</span>
                      <span className="text-sm font-medium text-[var(--text-body)] truncate">{s.name}</span>
                      {isLockTarget('screen', s.id) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-on-primary)] bg-[var(--color-primary)] px-1.5 py-0.5 rounded"><Lock size={10} /> 확정 프로토타입</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {isLockTarget('screen', s.id) ? '이 프로토타입은 이후 IA와 기능정의서 역작성의 기준으로 사용됩니다.' : formatRelative(s.createdAt)}
                    </div>
                  </div>
                  {isEditor && (isLockTarget('screen', s.id) ? (
                    <button type="button" onClick={handleUnlock} className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] transition-colors">확정 해제</button>
                  ) : (
                    <button type="button" onClick={() => handleLock({ targetType: 'screen', targetId: s.id, title: s.name })} className="shrink-0 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors">기준으로 확정</button>
                  ))}
                  <button type="button" onClick={() => navigate?.(`#screen_${s.id}`)} aria-label="화면 열기" className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-text)] transition-colors"><ExternalLink size={15} /></button>
                  <button type="button" onClick={() => copyLink(link)} aria-label="링크 복사" className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={15} /></button>
                </li>
              );
            })}
            {prototypeUrls.map((p) => (
              <li key={`url-${p.id}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border ${isLockTarget('source', p.id) ? 'border-[var(--color-primary)] bg-[var(--surface-active)]' : 'border-[var(--border-default)] bg-[var(--surface-sunken)]'}`}>
                <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--border-default)]"><Link2 size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">{p.prototypeKind || '프로토타입 URL'}</span>
                    <span className="text-sm font-medium text-[var(--text-body)] truncate" title={p.url}>{p.title || p.url}</span>
                    {isLockTarget('source', p.id) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-on-primary)] bg-[var(--color-primary)] px-1.5 py-0.5 rounded"><Lock size={10} /> 확정 프로토타입</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                    {isLockTarget('source', p.id) ? '이 프로토타입은 이후 IA와 기능정의서 역작성의 기준으로 사용됩니다.' : `${p.description ? `${p.description} · ` : ''}${formatRelative(p.createdAt)}`}
                  </div>
                </div>
                {isEditor && (isLockTarget('source', p.id) ? (
                  <button type="button" onClick={handleUnlock} className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] transition-colors">확정 해제</button>
                ) : (
                  <button type="button" onClick={() => handleLock({ targetType: 'source', targetId: p.id, title: p.title, url: p.url })} className="shrink-0 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors">기준으로 확정</button>
                ))}
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><ExternalLink size={13} /> 열기</a>
                <button type="button" onClick={() => copyLink(p.url || '')} aria-label="URL 복사" className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={15} /></button>
                {isEditor && (
                  <button type="button" onClick={() => handleDeleteUrl(p.id)} aria-label="삭제" className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--red-600)] transition-colors"><Trash2 size={15} /></button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* IA / 기능정의서 생성 액션 (단일 흐름): IA primary 1개 + 기능정의서 outline. 조건 미충족 시 비활성 + 사유. */}
        {lock ? (
          isEditor && (
            <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
              {/* 현재 단계의 '다음 액션' 1개만 primary. 병렬 경쟁 금지. 비활성 사유는 버튼이 아닌 helper text로 분리. */}
              {!hasIA ? (
                <>
                  <Button icon={Wand2} onClick={handleGenerateIA}>IA 생성</Button>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">IA를 생성한 뒤 기능정의서를 작성할 수 있습니다.</p>
                </>
              ) : !hasFeatureSpec ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button icon={Wand2} onClick={handleGenerateFeatureSpec}>기능정의서 생성</Button>
                    <Button variant="outline" icon={RefreshCw} onClick={handleGenerateIA}>IA 다시 생성</Button>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">기능정의서까지 작성하면 아래 문서 목록의 PRD에서 PRD를 생성할 수 있습니다.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" icon={RefreshCw} onClick={handleGenerateIA}>IA 다시 생성</Button>
                    <Button variant="outline" icon={RefreshCw} onClick={handleGenerateFeatureSpec}>기능정의서 다시 생성</Button>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">다음 단계는 PRD입니다. 아래 문서 목록의 PRD에서 생성하세요.</p>
                </>
              )}
            </div>
          )
        ) : (projectScreens.length > 0 || prototypeUrls.length > 0) ? (
          <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-tertiary)]">
            위 목록에서 프로토타입을 <b className="text-[var(--text-secondary)]">기준으로 확정</b>하면 그 화면 구조를 기준으로 IA를 생성할 수 있습니다. (기능정의서는 IA 생성 후, PRD는 기능정의서 작성 후)
          </p>
        ) : (
          // 프로토타입이 0개: 단계만 보여주지 않고, 먼저 화면을 추가하도록 유도.
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
            <p className="text-xs text-[var(--text-secondary)]">먼저 프로토타입 화면을 추가해야 IA를 생성할 수 있습니다.</p>
            {isEditor && navigate && (
              <Button variant="outline" icon={Plus} onClick={() => navigate(`#project_${project.id}_screens_new`)} className="mt-3">
                프로토타입 추가하기
              </Button>
            )}
          </div>
        )}
      </div>
      )}

      {section === 'handoff' && (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--color-primary-text)] flex items-center justify-center"><Package size={20} /></span>
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--text-strong)] text-lg">개발 전달 패키지</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                브리프, 시장조사/레퍼런스, 제품화/구현 전략, IA, 기능정의서, 확정 프로토타입 정보를 묶어 개발 전달용 MD 문서 패키지를 생성합니다.
              </p>
              {/* 준비 상태 칩 */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {([
                  ['브리프', !!byType('brief')],
                  ['시장조사/레퍼런스', !!byType('market_research')],
                  ['제품화/구현 전략', !!byType('product_strategy')],
                  ['IA', !!byType('ia')],
                  ['기능정의서', !!byType('feature_spec')],
                  ['확정 프로토타입', !!lock],
                ] as [string, boolean][]).map(([label, ready]) => (
                  <span key={label} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${ready ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--text-tertiary)] bg-[var(--surface-sunken)]'}`}>
                    {ready ? <CheckCircle2 size={11} /> : <Circle size={11} />} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {isEditor && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Button
                variant={handoffPkg ? 'outline' : 'primary'}
                icon={handoffPkg ? RefreshCw : Wand2}
                onClick={handleBuildHandoff}
              >
                {handoffPkg ? '다시 생성' : '개발 전달 패키지 생성'}
              </Button>
              {handoffPkg && <span className="text-[11px] text-[var(--text-tertiary)]">다시 생성하면 현재 패키지가 갱신됩니다</span>}
            </div>
          )}
        </div>

        {/* 미완성 표시 경고(warning-only). export는 막지 않음 — 전달 전 보완 안내만. */}
        {handoffPkg && handoffPkg.warnings && handoffPkg.warnings.length > 0 && (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--amber-100)] bg-[var(--amber-50)] px-4 py-3">
            <div className="flex items-start gap-2">
              <RefreshCw size={15} className="text-[var(--amber-700)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--amber-700)]">전달 패키지에 미완성 표시가 남아 있습니다</div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  개발 전달 전 아래 문서를 확인하세요. (오탐일 수 있어 안내만 하며, 복사·다운로드는 그대로 가능합니다)
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {handoffPkg.warnings.map((w) => (
                    <li key={w.name} className="text-[11px] font-semibold text-[var(--amber-700)] bg-[var(--surface-card)] border border-[var(--amber-100)] px-2 py-0.5 rounded">
                      {w.name} · {w.count}건
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {handoffPkg && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] overflow-hidden">
            {/* 파일 탭 */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-card)] flex-wrap">
              <div className="flex flex-wrap gap-1">
                {handoffPkg.files.map((file, i) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => setHandoffTab(i)}
                    className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] transition-colors ${
                      i === handoffTab ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)] border border-[var(--color-primary)]' : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <FileText size={12} /> {file.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={handleCopyHandoffFile} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={13} /> 현재 MD 복사</button>
                <button type="button" onClick={handleDownloadHandoffFile} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Download size={13} /> 이 문서 .md</button>
                <button type="button" onClick={handleCopyHandoffAll} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={13} /> 전체 MD 패키지 복사</button>
                <button type="button" onClick={handleDownloadHandoffZip} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors"><Download size={13} /> ZIP 다운로드</button>
                <button type="button" onClick={() => setHandoffPkg(null)} aria-label="닫기" className="p-1.5 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><X size={15} /></button>
              </div>
            </div>
            <textarea readOnly value={handoffPkg.files[handoffTab]?.content ?? ''} rows={18} className="w-full px-4 py-3 text-xs font-mono leading-relaxed resize-y bg-transparent text-[var(--text-body)] outline-none" />
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--text-tertiary)]">
          선행 문서가 일부 없어도 생성됩니다(없는 부분은 안내 문구로 표시). 이 패키지는 저장하지 않으며, 복사하거나 .md·ZIP으로 내려받아 전달합니다.
        </p>
      </div>
      )}

      {/* 디자인 탭 등 compact 모드: 무거운 워크스페이스 대신 stage 문서를 상태 카드로 노출(전역 문서 번호 숨김). */}
      {section === 'documents' && variant === 'compact' && (
        <div className="space-y-4">
          {(stageTypes ?? [selectedType]).map((type) => {
            const docu = byType(type);
            const meta = DOCUMENT_META[type];
            const ds = deriveDocStatus(docu, project, documents);
            const editing = !!docu && editingId === docu.id;
            // 본문 미리보기: 제목(첫 # 줄) 제외 후 비어있지 않은 3~5줄만.
            const preview = (docu?.content ?? '')
              .split('\n')
              .filter((l, i) => !(i === 0 && l.trim().startsWith('#')))
              .map((l) => l.trim())
              .filter(Boolean)
              .slice(0, 5)
              .join('\n');
            return (
              <div key={type} className={embedded ? 'bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-5' : 'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-xs)]'}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    {/* 디자인 탭에서는 전역 문서 번호(order)를 노출하지 않는다. */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[var(--text-strong)]">{meta.title}</h4>
                      {docu && <StatusBadge status={ds} />}
                      {docu && <span className="text-[11px] text-[var(--text-tertiary)]">· {formatRelative(docu.updatedAt ?? docu.createdAt)}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {docu
                        ? '프로토타입에 반영할 디자인 기준 문서입니다.'
                        : '참고 URL, 이미지, 디자인 메모를 바탕으로 디자인 기준을 정리합니다.'}
                    </p>
                  </div>
                  {isEditor && !docu && (
                    <Button icon={Plus} onClick={() => handleCreate(type)} className="shrink-0">
                      {`${meta.title} 생성`}
                    </Button>
                  )}
                </div>

                {docu && !editing && (
                  <>
                    {preview && (
                      <pre className="mt-3 whitespace-pre-wrap text-[12px] text-[var(--text-secondary)] leading-relaxed font-sans bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 max-h-32 overflow-hidden">
                        {preview}
                      </pre>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      {isEditor && (
                        <Button variant="outline" icon={FileText} onClick={() => { setEditingId(docu.id); setDraft(docu.content); }} className="text-sm py-1.5">편집</Button>
                      )}
                      {isEditor && PIPELINE_DOC_BUILDERS[type] && (
                        <Button variant="outline" icon={RefreshCw} onClick={() => handleRegeneratePipelineDoc(docu)} className="text-sm py-1.5">템플릿 다시 생성</Button>
                      )}
                      <Button variant="outline" icon={Download} onClick={() => downloadTextFile(docu.content, meta.filename)} className="text-sm py-1.5">MD 다운로드</Button>
                      {isOwner && (docu.status === 'approved'
                        ? <Button variant="outline" icon={RefreshCw} onClick={() => handleUnapproveDoc(docu)} className="text-sm py-1.5">승인 해제</Button>
                        : <Button icon={CheckCircle2} onClick={() => handleApproveDoc(docu)} className="text-sm py-1.5">승인</Button>
                      )}
                    </div>
                  </>
                )}

                {docu && editing && (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={14}
                      className="w-full p-4 border border-[var(--border-strong)] rounded-[var(--radius-lg)] outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] font-mono text-[13px] leading-relaxed bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] text-[var(--text-body)]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditingId(null)}>취소</Button>
                      <Button icon={Save} onClick={() => handleSave(docu)}>저장 (버전 업)</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 문서 워크스페이스: 좌측 목록 + 중앙 에디터 */}
      {section === 'documents' && variant !== 'compact' && (
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* 문서 목록 */}
        <nav className="w-full lg:w-[300px] shrink-0 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* 문서 성격/생성 흐름을 구분하는 시각 그룹 헤더 (데이터·순서 무변경) */}
              <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{group.label}</div>
              {group.types.map((type) => {
                const meta = DOCUMENT_META[type];
                const docu = byType(type);
                const active = type === selectedType;
                const ds = deriveDocStatus(docu, project, documents);
                return (
                  <button
                    key={type}
                    onClick={() => selectDoc(type)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] border transition-all ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--surface-active)] shadow-[var(--shadow-xs)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--brand-300)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-xs ${
                        active ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {meta.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${active ? 'text-[var(--color-primary-text)]' : 'text-[var(--text-strong)]'}`}>
                          {meta.title}
                        </span>
                        {docu?.locked && <Lock size={11} className="text-[var(--text-tertiary)] shrink-0" />}
                      </span>
                      <span className="flex items-center gap-2 mt-1">
                        <StatusBadge status={ds} />
                        {docu && <span className="text-[10px] font-mono text-[var(--text-tertiary)]">v{docu.version}</span>}
                      </span>
                      {docu && (
                        <span className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-tertiary)]">
                          <Clock size={10} /> {formatRelative(docu.updatedAt ?? docu.createdAt)}
                        </span>
                      )}
                    </span>
                    {docu && (
                      <CheckCircle2
                        size={16}
                        className={`mt-0.5 shrink-0 ${docu.status === 'approved' ? 'text-[var(--green-600)]' : 'text-[var(--text-tertiary)]'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 문서 에디터 */}
        <section className="flex-1 min-w-0 w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xs)] overflow-hidden">
          {/* 에디터 헤더 */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center font-bold text-sm shrink-0">
                {selectedMeta.order}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-[var(--text-strong)] truncate">{selectedMeta.title}</h4>
                  {selectedDoc && <span className="text-[10px] font-mono text-[var(--text-tertiary)]">v{selectedDoc.version}</span>}
                  {selectedDoc?.locked && <Lock size={12} className="text-[var(--text-tertiary)]" />}
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{selectedMeta.filename}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedDoc && <StatusBadge status={deriveDocStatus(selectedDoc, project, documents)} />}
              {/* 빈 문서 생성 CTA는 아래 중앙 빈 상태 한 곳으로 통일(상단 중복 버튼 제거). */}
              {selectedDoc && (
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={() => downloadTextFile(selectedDoc.content, selectedMeta.filename)}
                  className="text-sm py-1.5"
                >
                  MD 다운로드
                </Button>
              )}
            </div>
          </div>

          {/* 재생성 필요 안내: 확정 프로토타입 기준이 문서보다 최신일 때만(자동 삭제/재생성 없음) */}
          {selectedDoc && deriveDocStatus(selectedDoc, project, documents) === 'needs_regen' && (
            <div className="mx-5 mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--amber-100)] bg-[var(--amber-50)] px-3 py-2 text-[12px] text-[var(--amber-700)]">
              <RefreshCw size={14} className="mt-0.5 shrink-0" />
              <span>{prototypeStale ? '확정 프로토타입 기준이 변경되어' : '상위 문서(IA·기능정의서)가 변경되어'} 재생성을 권장합니다. {selectedType === 'prd' ? 'IA·기능정의서를 갱신한 뒤 PRD를 재생성하세요.' : '위 ‘확정 프로토타입 · 문서 역작성’ 영역에서 다시 생성할 수 있습니다.'}</span>
            </div>
          )}

          {/* 에디터 본문 */}
          {!selectedDoc ? (
            <div className="py-16 px-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--surface-hover)] text-[var(--text-tertiary)] flex items-center justify-center mb-4">
                <FileText size={26} />
              </div>
              <h5 className="text-base font-bold text-[var(--text-strong)] mb-1">아직 생성되지 않은 문서입니다</h5>
              <p className="text-sm text-[var(--text-secondary)] mb-5 max-w-sm">
                {!isEditor
                  ? '문서가 생성되면 여기에서 조회할 수 있습니다.'
                  : selectedType === 'ia'
                    ? '확정한 프로토타입 화면을 기준으로 IA 초안을 생성하세요.'
                    : selectedType === 'feature_spec'
                      ? 'IA가 생성된 뒤 기능정의서를 작성할 수 있습니다.'
                      : selectedType === 'prd'
                        ? '기능정의서까지 작성된 뒤 PRD를 생성할 수 있습니다.'
                        : `'${selectedMeta.title}' 문서를 생성해 작성을 시작하세요.`}
              </p>
              {/* IA·기능정의서는 위 '확정 프로토타입 · 문서 역작성' 영역에서 단일 생성(중복 CTA 방지). */}
              {isEditor && (selectedType === 'ia' || selectedType === 'feature_spec') && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  위 ‘확정 프로토타입 · 문서 역작성’ 영역에서 생성합니다.
                </span>
              )}
              {/* PRD는 기능정의서가 있어야 생성 가능. 사유를 함께 표시. */}
              {isEditor && selectedType === 'prd' && (
                <div className="flex flex-col items-center gap-1">
                  <Button icon={Plus} onClick={() => handleCreate('prd')} disabled={!hasFeatureSpec}>
                    PRD 생성
                  </Button>
                  {!hasFeatureSpec && <span className="text-[11px] text-[var(--text-tertiary)]">기능정의서를 먼저 작성하세요</span>}
                </div>
              )}
              {/* 브리프·시장조사·제품화전략은 직접 생성 가능. */}
              {isEditor && selectedType !== 'ia' && selectedType !== 'feature_spec' && selectedType !== 'prd' && (
                <Button icon={Plus} onClick={() => handleCreate(selectedType)}>
                  {`${selectedMeta.title} 생성`}
                </Button>
              )}
            </div>
          ) : isEditing ? (
            <div className="p-5 space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={16}
                className="w-full p-4 border border-[var(--border-strong)] rounded-[var(--radius-lg)] outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] font-mono text-[13px] leading-relaxed bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] text-[var(--text-body)]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditingId(null)}>
                  취소
                </Button>
                <Button icon={Save} onClick={() => handleSave(selectedDoc)}>
                  저장 (버전 업)
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <pre className="whitespace-pre-wrap text-[13px] text-[var(--text-body)] leading-relaxed font-sans max-h-[28rem] overflow-y-auto bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
                {selectedDoc.content}
              </pre>
              <div className="flex justify-end gap-2 mt-3 flex-wrap items-center">
                {selectedType === 'prd' && url && (
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 size={13} className="text-[var(--green-600)]" /> 프로토타입 URL 연결됨
                  </span>
                )}
                {selectedType === 'prd' && !url && (
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-[var(--amber-700)]">
                    프로토타입 화면 없음 (승인 전 등록 필요)
                  </span>
                )}
                {selectedType === 'prd' && isEditor && !selectedDoc.locked && (
                  <Button variant="outline" icon={RefreshCw} onClick={() => handleRegeneratePRD(selectedDoc)} className="text-sm py-1.5">
                    최신 데이터로 재생성
                  </Button>
                )}
                {/* 신규 파이프라인 문서: 템플릿 기반 재생성(현재 프로젝트/상위 문서 반영). */}
                {PIPELINE_DOC_BUILDERS[selectedType] && isEditor && (
                  <Button variant="outline" icon={RefreshCw} onClick={() => handleRegeneratePipelineDoc(selectedDoc)} className="text-sm py-1.5">
                    템플릿 다시 생성
                  </Button>
                )}
                {isEditor && !selectedDoc.locked && (
                  <Button
                    variant="outline"
                    icon={FileText}
                    onClick={() => {
                      setEditingId(selectedDoc.id);
                      setDraft(selectedDoc.content);
                    }}
                    className="text-sm py-1.5"
                  >
                    편집
                  </Button>
                )}
                {selectedType === 'prd' && isOwner && !selectedDoc.locked && (
                  <Button icon={CheckCircle2} onClick={() => handleApprovePRD(selectedDoc)} className="text-sm py-1.5">
                    승인 및 잠금
                  </Button>
                )}
                {/* 승인은 Owner 권한 — Editor에게는 안내만(미잠금 PRD 한정). */}
                {selectedType === 'prd' && isEditor && !isOwner && !selectedDoc.locked && (
                  <span className="text-xs text-[var(--text-tertiary)]">승인은 Owner 권한이 필요합니다.</span>
                )}
                {/* 단계 승인(PRD 외 문서): 사람이 산출물을 승인하며 다음 단계로 — Owner 전용 토글. */}
                {selectedType !== 'prd' && isOwner && (
                  selectedDoc.status === 'approved' ? (
                    <Button variant="outline" icon={RefreshCw} onClick={() => handleUnapproveDoc(selectedDoc)} className="text-sm py-1.5">
                      승인 해제
                    </Button>
                  ) : (
                    <Button icon={CheckCircle2} onClick={() => handleApproveDoc(selectedDoc)} className="text-sm py-1.5">
                      승인
                    </Button>
                  )
                )}
                {selectedType !== 'prd' && isEditor && !isOwner && selectedDoc.status !== 'approved' && (
                  <span className="text-xs text-[var(--text-tertiary)]">승인은 Owner 권한이 필요합니다.</span>
                )}
                {/* locked PRD: 평소엔 보호 유지. 단 확정 프로토타입 변경으로 needs_regen 이면 Owner가 잠금 해제·재생성 가능. */}
                {selectedType === 'prd' && selectedDoc.locked && prdNeedsRegen && isOwner && (
                  <Button variant="outline" icon={RefreshCw} onClick={() => handleRegenerateLockedPRD(selectedDoc)} className="text-sm py-1.5">
                    최신 프로토타입 기준으로 재생성
                  </Button>
                )}
                {selectedType === 'prd' && selectedDoc.locked && prdNeedsRegen && !isOwner && (
                  <span className="text-xs text-[var(--amber-700)]">확정 프로토타입이 변경됨 · 재승인/재생성은 Owner 권한이 필요합니다.</span>
                )}
                {selectedDoc.locked && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-hover)] px-3 py-1.5 rounded-[var(--radius-pill)]">
                    <Lock size={14} /> {prdNeedsRegen ? '승인 완료(기준 변경됨)' : '승인 완료 · 잠금됨'}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
