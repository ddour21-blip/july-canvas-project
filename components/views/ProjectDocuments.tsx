'use client';

import { useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { getTime, nowMs, showToast } from '@/lib/utils';
import { DOCUMENT_META, DOCUMENT_ORDER, generatePRD, injectPrototypeUrl } from '@/lib/documents';
import { downloadTextFile } from '@/lib/export/exportMarkdown';
import { Button } from '@/components/common/Button';
import { CheckCircle2, Circle, Clock, Download, Eye, FileText, Lock, Plus, RefreshCw, Save } from 'lucide-react';
import type {
  DocumentStatus,
  DocumentType,
  FirestoreTime,
  Project,
  ProjectDocument,
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
}

export default function ProjectDocuments({ project, documents, screens, isEditor, isOwner }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType>(DOCUMENT_ORDER[0]);

  const byType = (t: DocumentType) => documents.find((d) => d.type === t);

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
