'use client';

import { useEffect, useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { copyToClipboard, formatDateTime, getTime, nowMs, showToast } from '@/lib/utils';
import { DOCUMENT_META, DOCUMENT_ORDER, generatePRD, injectPrototypeUrl } from '@/lib/documents';
import { buildPrototypePackage } from '@/lib/prototypePrompt';
import { buildInformationArchitecture, type IaTarget } from '@/lib/informationArchitecture';
import { buildFeatureSpec } from '@/lib/featureSpec';
import { PROTOTYPE_KINDS, deletePrototypeUrl, lockPrototype, registerPrototypeScreen, registerPrototypeUrl, subscribePrototypeUrls, unlockPrototype } from '@/lib/prototypes';
import { shareHash, toShareUrl } from '@/lib/shareLinks';
import { useAuth } from '@/lib/auth';
import { downloadTextFile } from '@/lib/export/exportMarkdown';
import { Button } from '@/components/common/Button';
import { Code2, Copy, CheckCircle2, Circle, Clock, Download, ExternalLink, Eye, FileText, Link2, Lock, MonitorPlay, Plus, RefreshCw, Save, Sparkles, Trash2, Wand2, X } from 'lucide-react';
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
  /** 딥링크로 진입한 초기 선택 문서 id (해당 문서 타입을 선택 상태로) */
  initialDocId?: string | null;
  /** 현재 선택된 문서 id를 상위로 보고 (공유 '현재 문서 링크'용) */
  onCurrentDocChange?: (docId: string | null) => void;
  /** 프로토타입 화면 딥링크 이동용 */
  navigate?: (hash: string) => void;
}

export default function ProjectDocuments({ project, documents, screens, isEditor, isOwner, initialDocId, onCurrentDocChange, navigate }: Props) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType>(DOCUMENT_ORDER[0]);
  // 프로토타입 제작 패키지 (로컬 생성 → 복사. Firestore 저장 안 함)
  const [prototypePkg, setPrototypePkg] = useState<string | null>(null);
  // 프로젝트 전환 시 이전 프로젝트의 패키지가 남지 않도록 초기화 (렌더 중 조정 패턴).
  const [pkgProjectId, setPkgProjectId] = useState(project.id);
  if (project.id !== pkgProjectId) {
    setPkgProjectId(project.id);
    setPrototypePkg(null);
  }

  // 프로토타입 등록 (B3): URL은 projectSources(prototype_url), 코드는 screens 재사용.
  const [prototypeUrls, setPrototypeUrls] = useState<ProjectSource[]>([]);
  const [protoForm, setProtoForm] = useState<'none' | 'url' | 'code'>('none');
  const [pName, setPName] = useState('');
  const [pUrl, setPUrl] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pKind, setPKind] = useState<string>(PROTOTYPE_KINDS[0]);
  const [pCode, setPCode] = useState('');

  useEffect(() => {
    const unsub = subscribePrototypeUrls(project.id, setPrototypeUrls);
    return () => unsub();
  }, [project.id]);

  const projectScreens = screens.filter((s) => s.projectId === project.id);

  const resetProtoForm = () => {
    setProtoForm('none');
    setPName('');
    setPUrl('');
    setPDesc('');
    setPKind(PROTOTYPE_KINDS[0]);
    setPCode('');
  };

  const handleRegisterUrl = async () => {
    if (!pUrl.trim()) return;
    try {
      await registerPrototypeUrl({
        projectId: project.id,
        name: pName,
        url: pUrl,
        description: pDesc,
        kind: pKind,
        createdBy: user?.uid ?? 'anonymous',
      });
      resetProtoForm();
      showToast('프로토타입 URL이 등록되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('등록 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleRegisterCode = async () => {
    if (!pCode.trim()) return;
    try {
      const id = await registerPrototypeScreen({
        projectId: project.id,
        name: pName,
        code: pCode,
        ownerId: user?.uid ?? null,
      });
      resetProtoForm();
      showToast('프로토타입 화면이 등록되었습니다.');
      navigate?.(`#screen_${id}`);
    } catch (err) {
      console.error(err);
      showToast('등록 중 오류가 발생했습니다.', 'error');
    }
  };

  // 확정 프로토타입 (Project.prototypeLock)
  const lock = project.prototypeLock ?? null;
  const isLockTarget = (targetType: 'screen' | 'source', id: string) =>
    !!lock && lock.targetType === targetType && lock.targetId === id;

  const handleLock = async (input: { targetType: 'screen' | 'source'; targetId: string; title?: string; url?: string }) => {
    // 이미 다른 항목이 확정돼 있으면 변경 확인
    if (lock && !(lock.targetType === input.targetType && lock.targetId === input.targetId)) {
      const ok = window.confirm('이미 확정된 프로토타입이 있습니다. 기준 프로토타입을 변경하시겠습니까?\n변경하면 이후 IA/기능정의서 생성 기준이 바뀝니다.');
      if (!ok) return;
    }
    try {
      await lockPrototype(project.id, { ...input, lockedBy: user?.uid ?? 'anonymous' });
      showToast('기준 프로토타입으로 확정되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('확정 중 오류가 발생했습니다.', 'error');
    }
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
  const handleGenerateIA = async () => {
    if (!lock) return;
    const target = resolveLockTarget();
    if (!target) return;
    const existing = byType('ia');
    if (existing && !window.confirm('기존 IA 문서가 있습니다. 확정 프로토타입 기준으로 다시 생성하면 기존 내용이 덮어써질 수 있습니다. 계속하시겠습니까?')) return;
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
  const handleGenerateFeatureSpec = async () => {
    if (!lock) return;
    const iaDoc = byType('ia');
    if (!iaDoc) { showToast('먼저 IA를 생성해주세요.', 'error'); return; }
    const target = resolveLockTarget();
    if (!target) return;
    const existing = byType('feature_spec');
    if (existing && !window.confirm('기존 기능정의서가 있습니다. 확정 프로토타입과 IA 기준으로 다시 생성하면 기존 내용이 덮어써질 수 있습니다. 계속하시겠습니까?')) return;
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

  const copyLink = (link: string) => {
    if (copyToClipboard(link)) showToast('링크를 복사했습니다.');
    else showToast('복사 실패', 'error');
  };

  const byType = (t: DocumentType) => documents.find((d) => d.type === t);

  // 딥링크 초기 문서 → 해당 문서 타입 선택 (렌더 중 조정 패턴, effect 미사용).
  // 문서 구독이 늦게 도착할 수 있어, 해당 문서를 찾은 시점에만 1회 적용한다.
  const [appliedDocId, setAppliedDocId] = useState<string | null>(null);
  if (initialDocId && initialDocId !== appliedDocId) {
    const doc = documents.find((d) => d.id === initialDocId);
    if (doc) {
      setAppliedDocId(initialDocId);
      setSelectedType(doc.type);
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

  return (
    <div className="space-y-5">
      {!isEditor && (
        <div className="flex items-center gap-2 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-lg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Eye size={16} className="shrink-0" />
          현재 권한에서는 문서를 편집할 수 없습니다. <span className="font-bold text-[var(--text-body)]">Owner 또는 Editor</span> 권한이 필요합니다. (조회·다운로드는 가능)
        </div>
      )}

      {/* 진행 요약 */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-[var(--text-strong)] text-lg">문서 파이프라인</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              브리프 → 시장조사 → 제품화전략 → IA → 기능정의서 → PRD 순으로 작성합니다.
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

      {/* 프로토타입 제작 패키지 (B2): 초기 문서 3종 기반 → 최소 IA/핵심 기능/Gemini Canvas 프롬프트 (로컬 생성·복사) */}
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
          <Button icon={Sparkles} onClick={handleBuildPrototypePackage} disabled={!initialDocsReady} className="shrink-0">
            {prototypePkg ? '다시 생성' : '프로토타입 프롬프트 생성'}
          </Button>
        </div>

        {prototypePkg && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--surface-card)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">생성된 프로토타입 제작 패키지 (초안)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrototypePackage}
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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

      {/* 프로토타입 등록 (B3): URL → projectSources(prototype_url) / 코드 → screens 재사용 */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--color-primary-text)] flex items-center justify-center">
              <MonitorPlay size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--text-strong)] text-lg">프로토타입 등록</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                Gemini Canvas 등에서 생성한 프로토타입 URL이나 코드를 등록합니다. 확정된 프로토타입은 이후 IA와 기능정의서 역작성의 기준이 됩니다.
              </p>
            </div>
          </div>
          {isEditor && protoForm === 'none' && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="secondary" icon={Link2} onClick={() => setProtoForm('url')}>프로토타입 URL 등록</Button>
              <Button variant="secondary" icon={Code2} onClick={() => setProtoForm('code')}>프로토타입 코드 등록</Button>
            </div>
          )}
        </div>

        {/* URL 등록 폼 */}
        {protoForm === 'url' && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="프로토타입 이름" className="flex-1 min-w-0 px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none" />
              <select value={pKind} onChange={(e) => setPKind(e.target.value)} className="shrink-0 px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none">
                {PROTOTYPE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <input type="url" value={pUrl} onChange={(e) => setPUrl(e.target.value)} placeholder="https://... (Gemini Canvas / Artifact / Vercel preview 등)" className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none" />
            <input value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="설명 (선택)" className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={resetProtoForm}>취소</Button>
              <Button icon={Plus} onClick={handleRegisterUrl} disabled={!pUrl.trim()}>등록</Button>
            </div>
          </div>
        )}

        {/* 코드 등록 폼 */}
        {protoForm === 'code' && (
          <div className="mt-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] p-4 space-y-3">
            <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="화면명" className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none" />
            <textarea value={pCode} onChange={(e) => setPCode(e.target.value)} placeholder="Gemini Canvas 등에서 생성한 HTML 또는 React 코드를 붙여넣으세요." rows={8} className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-xs font-mono resize-y bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none" />
            <p className="text-[11px] text-[var(--text-tertiary)]">HTML/React 코드는 기존 프로토타입 캔버스(ScreenEditor)에서 미리보기됩니다. 등록 후 해당 화면으로 이동합니다.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={resetProtoForm}>취소</Button>
              <Button icon={Plus} onClick={handleRegisterCode} disabled={!pCode.trim()}>등록</Button>
            </div>
          </div>
        )}

        {/* 등록된 프로토타입 목록: 화면(screens) + URL(projectSources) */}
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
                    <button type="button" onClick={handleUnlock} className="shrink-0 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">확정 해제</button>
                  ) : (
                    <button type="button" onClick={() => handleLock({ targetType: 'screen', targetId: s.id, title: s.name })} className="shrink-0 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors">기준으로 확정</button>
                  ))}
                  <button type="button" onClick={() => navigate?.(`#screen_${s.id}`)} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"><ExternalLink size={13} /> 열기</button>
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
                  <button type="button" onClick={handleUnlock} className="shrink-0 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">확정 해제</button>
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

        {/* IA / 기능정의서 생성 CTA (B5/B6): 확정 프로토타입이 있을 때만 */}
        {lock ? (
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 space-y-3">
            {/* IA 생성 (B5) */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <p className="text-xs text-[var(--color-primary-text)] font-medium min-w-0 flex-1">
                확정된 프로토타입을 기준으로 IA 초안을 생성합니다. 생성 후 문서 화면에서 수정할 수 있습니다.
              </p>
              {isEditor && (
                <Button icon={Sparkles} onClick={handleGenerateIA} className="shrink-0">확정 프로토타입 기반 IA 생성</Button>
              )}
            </div>
            {/* 기능정의서 생성 (B6): IA가 있어야 활성 */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <p className="text-xs min-w-0 flex-1 font-medium" style={{ color: byType('ia') ? 'var(--color-primary-text)' : 'var(--text-tertiary)' }}>
                {byType('ia')
                  ? '확정된 프로토타입과 IA를 기준으로 기능정의서 초안을 생성합니다. 생성 후 문서 화면에서 수정할 수 있습니다.'
                  : '먼저 확정 프로토타입 기반 IA를 생성해야 기능정의서를 작성할 수 있습니다.'}
              </p>
              {isEditor && (
                <Button icon={Sparkles} onClick={handleGenerateFeatureSpec} disabled={!byType('ia')} className="shrink-0">확정 프로토타입 기반 기능정의서 생성</Button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">
            프로토타입을 확정하면 이 화면 구조를 기준으로 IA를 생성할 수 있습니다. (기능정의서는 IA 생성 후 작성)
          </p>
        )}
      </div>

      {/* 문서 워크스페이스: 좌측 목록 + 중앙 에디터 */}
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
              {!selectedDoc && isEditor && (
                <Button variant="outline" icon={Plus} onClick={() => handleCreate(selectedType)} className="text-sm py-1.5">
                  {selectedType === 'prd' ? 'PRD 생성' : '생성'}
                </Button>
              )}
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
                {isEditor
                  ? `'${selectedMeta.title}' 문서를 생성해 작성을 시작하세요.`
                  : '문서가 생성되면 여기에서 조회할 수 있습니다.'}
              </p>
              {isEditor && (
                <Button icon={Plus} onClick={() => handleCreate(selectedType)}>
                  {selectedType === 'prd' ? 'PRD 생성' : `${selectedMeta.title} 생성`}
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
    </div>
  );
}
