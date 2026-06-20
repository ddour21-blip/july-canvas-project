'use client';

import { useEffect, useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { copyToClipboard, formatDateTime, getTime, nowMs, showToast } from '@/lib/utils';
import { DOCUMENT_META, DOCUMENT_ORDER, generatePRD, injectPrototypeUrl } from '@/lib/documents';
import { buildPrototypePackage } from '@/lib/prototypePrompt';
import { buildInformationArchitecture, type IaTarget } from '@/lib/informationArchitecture';
import { buildFeatureSpec } from '@/lib/featureSpec';
import { buildHandoffPackage, type HandoffPackage, type HandoffPrototype } from '@/lib/handoffPackage';
import { downloadHandoffFile, downloadHandoffZip } from '@/lib/exportHandoffPackage';
import { deletePrototypeUrl, lockPrototype, subscribePrototypeUrls, unlockPrototype } from '@/lib/prototypes';
import { shareHash, toShareUrl } from '@/lib/shareLinks';
import { useAuth } from '@/lib/auth';
import { downloadTextFile } from '@/lib/export/exportMarkdown';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { Copy, CheckCircle2, Circle, Clock, Download, ExternalLink, Eye, FileText, Link2, Lock, MonitorPlay, Package, Plus, RefreshCw, Save, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { EMPTY_ACTIVATION } from '@/types';
import type {
  DocumentStatus,
  DocumentType,
  FirestoreTime,
  Project,
  ProjectDocument,
  ProjectSource,
  Screen,
} from '@/types';

// 문서 상태 배지: semantic 토큰(fg/bg) 직접 소비.
const DOC_STATUS: Record<DocumentStatus, { label: string; fg: string; bg: string }> = {
  draft: { label: '초안', fg: 'var(--status-draft-fg)', bg: 'var(--status-draft-bg)' },
  review: { label: '리뷰', fg: 'var(--status-review-fg)', bg: 'var(--status-review-bg)' },
  approved: { label: '승인', fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
};

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

function StatusBadge({ status }: { status: DocumentStatus }) {
  const s = DOC_STATUS[status];
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
  /** 딥링크로 진입한 초기 선택 문서 id (해당 문서 타입을 선택 상태로) */
  initialDocId?: string | null;
  /** 현재 선택된 문서 id를 상위로 보고 (공유 '현재 문서 링크'용) */
  onCurrentDocChange?: (docId: string | null) => void;
  /** 프로토타입 화면 딥링크 이동용 */
  navigate?: (hash: string) => void;
}

export default function ProjectDocuments({ project, documents, screens, isEditor, isOwner, section = 'documents', initialDocId, onCurrentDocChange, navigate }: Props) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType>(DOCUMENT_ORDER[0]);
  // 프로토타입 제작 패키지 (로컬 생성 → 복사. Firestore 저장 안 함)
  const [prototypePkg, setPrototypePkg] = useState<string | null>(null);
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
      setConfirm({
        isOpen: true,
        title: 'IA 초안을 다시 생성할까요?',
        msg: '확정 프로토타입 기준으로 IA를 다시 생성하면 현재 IA 문서 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)',
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
      setConfirm({
        isOpen: true,
        title: '기능정의서를 다시 생성할까요?',
        msg: '확정 프로토타입과 IA 기준으로 기능정의서를 다시 생성하면 현재 기능정의서 내용이 새 초안으로 덮어써집니다. (버전은 올라가며 기존 문서가 삭제되는 것은 아닙니다.)',
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
    const content =
      type === 'prd'
        ? generatePRD(project, documents, prototypeUrl())
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
    showToast(`${meta.title} 문서가 생성되었습니다.`);
  };

  const handleSave = async (docu: ProjectDocument) => {
    const cur = parseFloat(docu.version);
    const nextV = isNaN(cur) ? docu.version : (cur + 0.1).toFixed(1);
    await updateDoc(docRef('documents', docu.id), {
      content: draft,
      version: nextV,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
    showToast('문서가 저장되었습니다.');
  };

  const handleRegeneratePRD = async (docu: ProjectDocument) => {
    await updateDoc(docRef('documents', docu.id), {
      content: generatePRD(project, documents, prototypeUrl()),
      updatedAt: serverTimestamp(),
    });
    showToast('PRD가 최신 데이터로 재생성되었습니다.');
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

  const missingRequired = DOCUMENT_ORDER.filter((t) => t !== 'prd').filter((t) => !byType(t));
  const createdCount = DOCUMENT_ORDER.filter((t) => byType(t)).length;

  const selectedMeta = DOCUMENT_META[selectedType];
  const selectedDoc = byType(selectedType);
  const isEditing = selectedDoc && editingId === selectedDoc.id;
  const url = prototypeUrl();

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

  const handleBuildPrototypePackage = () => {
    setPrototypePkg(buildPrototypePackage(project, project.activation ?? EMPTY_ACTIVATION));
  };

  const handleCopyPrototypePackage = () => {
    if (!prototypePkg) return;
    if (copyToClipboard(prototypePkg)) showToast('프로토타입 제작 프롬프트를 복사했습니다.');
    else showToast('복사 실패', 'error');
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

      {section === 'documents' && (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-[var(--text-strong)] text-lg">문서 파이프라인</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              프로젝트 브리프(시장조사·레퍼런스 포함) → 제품화 전략 → PRD(IA·기능정의서)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{createdCount} / {DOCUMENT_ORDER.length} 작성</span>
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

      {section === 'prototype' && (
      <div className="bg-[var(--surface-card)] border border-[var(--brand-200)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <Wand2 size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--text-strong)] text-lg">프로토타입 제작 패키지</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                초기 문서 3종을 기반으로 Gemini Canvas 등에 붙여넣을 수 있는 최소 IA, 핵심 기능, 프로토타입 생성 프롬프트를 만듭니다.
              </p>
              {!initialDocsReady && (
                <p className="text-xs text-[var(--amber-700)] mt-1.5">브리프·시장조사·제품화전략 문서가 모두 생성되면 사용할 수 있습니다.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              variant={prototypePkg ? 'outline' : 'primary'}
              icon={prototypePkg ? RefreshCw : Sparkles}
              onClick={handleBuildPrototypePackage}
              disabled={!initialDocsReady}
            >
              {prototypePkg ? '다시 생성' : '프로토타입 프롬프트 생성'}
            </Button>
            {prototypePkg && <span className="text-[11px] text-[var(--text-tertiary)]">다시 생성하면 현재 패키지가 갱신됩니다</span>}
          </div>
        </div>

        {prototypePkg && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] overflow-hidden">
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
      </div>
      )}

      {section === 'documents' && (
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
                  <Button icon={Sparkles} onClick={handleGenerateIA}>IA 생성</Button>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">IA를 생성한 뒤 기능정의서를 작성할 수 있습니다.</p>
                </>
              ) : !hasFeatureSpec ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button icon={Sparkles} onClick={handleGenerateFeatureSpec}>기능정의서 생성</Button>
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
                icon={handoffPkg ? RefreshCw : Sparkles}
                onClick={handleBuildHandoff}
              >
                {handoffPkg ? '다시 생성' : '개발 전달 패키지 생성'}
              </Button>
              {handoffPkg && <span className="text-[11px] text-[var(--text-tertiary)]">다시 생성하면 현재 패키지가 갱신됩니다</span>}
            </div>
          )}
        </div>

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
                <button type="button" onClick={handleCopyHandoffFile} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={13} /> 이 문서 복사</button>
                <button type="button" onClick={handleDownloadHandoffFile} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Download size={13} /> 이 문서 .md</button>
                <button type="button" onClick={handleCopyHandoffAll} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={13} /> 전체 복사</button>
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

      {/* 문서 워크스페이스: 좌측 목록 + 중앙 에디터 */}
      {section === 'documents' && (
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* 문서 목록 */}
        <nav className="w-full lg:w-[300px] shrink-0 space-y-2">
          {DOCUMENT_ORDER.map((type) => {
            const meta = DOCUMENT_META[type];
            const docu = byType(type);
            const active = type === selectedType;
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
                    {docu ? (
                      <>
                        <StatusBadge status={docu.status} />
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">v{docu.version}</span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                        <Circle size={11} /> 미작성
                      </span>
                    )}
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
              {selectedDoc && <StatusBadge status={selectedDoc.status} />}
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
                {selectedDoc.locked && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-hover)] px-3 py-1.5 rounded-[var(--radius-pill)]">
                    <Lock size={14} /> 승인 완료 · 잠금됨
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
