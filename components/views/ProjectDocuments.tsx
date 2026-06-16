'use client';

import { useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { DOCUMENT_META, DOCUMENT_ORDER, generatePRD, injectPrototypeUrl } from '@/lib/documents';
import { downloadTextFile } from '@/lib/export/exportMarkdown';
import { Button } from '@/components/common/Button';
import { CheckCircle2, Download, FileText, Lock, Plus, RefreshCw, Save } from 'lucide-react';
import type {
  DocumentStatus,
  DocumentType,
  Project,
  ProjectDocument,
  Screen,
} from '@/types';

const STATUS_BADGE: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
};

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

  return (
    <div className="space-y-5">
      {!isEditor && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
          현재 권한에서는 문서를 편집할 수 없습니다. <span className="font-bold">Owner 또는 Editor</span> 권한이 필요합니다. (조회·다운로드는 가능)
        </div>
      )}
      {/* 진행 요약 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">문서 파이프라인</h3>
            <p className="text-sm text-gray-500 mt-1">
              브리프 → 시장조사 → 제품화전략 → IA → 기능정의서 → PRD 순으로 작성합니다.
            </p>
          </div>
          {missingRequired.length === 0 ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={16} /> 필수 문서 완료
            </span>
          ) : (
            <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
              미작성 {missingRequired.length}건
            </span>
          )}
        </div>
      </div>

      {DOCUMENT_ORDER.map((type) => {
        const meta = DOCUMENT_META[type];
        const docu = byType(type);
        const isEditing = docu && editingId === docu.id;

        return (
          <div key={type} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100 bg-gray-50/50 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {meta.order}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-gray-900">{meta.title}</h4>
                    {docu && <span className="text-[10px] font-mono text-gray-400">v{docu.version}</span>}
                    {docu?.locked && <Lock size={12} className="text-gray-400" />}
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">{meta.filename}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {docu && <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[docu.status]}`}>{docu.status}</span>}
                {!docu && isEditor && (
                  <Button variant="outline" icon={Plus} onClick={() => handleCreate(type)} className="text-sm py-1.5">
                    {type === 'prd' ? 'PRD 생성' : '생성'}
                  </Button>
                )}
                {docu && (
                  <Button
                    variant="outline"
                    icon={Download}
                    onClick={() => downloadTextFile(docu.content, meta.filename)}
                    className="text-sm py-1.5"
                  >
                    MD
                  </Button>
                )}
              </div>
            </div>

            {docu && (
              <div className="p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={14}
                      className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[13px] leading-relaxed bg-gray-50 focus:bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        취소
                      </Button>
                      <Button icon={Save} onClick={() => handleSave(docu)}>
                        저장 (버전 업)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <pre className="whitespace-pre-wrap text-[13px] text-gray-700 leading-relaxed font-sans max-h-72 overflow-y-auto bg-gray-50 border border-gray-100 rounded-xl p-4">
                      {docu.content}
                    </pre>
                    <div className="flex justify-end gap-2 mt-3 flex-wrap">
                      {type === 'prd' && isEditor && !docu.locked && (
                        <Button variant="outline" icon={RefreshCw} onClick={() => handleRegeneratePRD(docu)} className="text-sm py-1.5">
                          최신 데이터로 재생성
                        </Button>
                      )}
                      {isEditor && !docu.locked && (
                        <Button
                          variant="outline"
                          icon={FileText}
                          onClick={() => {
                            setEditingId(docu.id);
                            setDraft(docu.content);
                          }}
                          className="text-sm py-1.5"
                        >
                          편집
                        </Button>
                      )}
                      {type === 'prd' && isOwner && !docu.locked && (
                        <Button icon={CheckCircle2} onClick={() => handleApprovePRD(docu)} className="text-sm py-1.5">
                          승인 및 잠금
                        </Button>
                      )}
                      {docu.locked && (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                          <Lock size={14} /> 승인 완료 · 잠금됨
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
