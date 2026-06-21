'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { formatDateTime, showToast } from '@/lib/utils';
import { activationDocTitle, buildActivationDocuments } from '@/lib/documents';
import {
  createProjectSource,
  deleteProjectSource,
  subscribeProjectSources,
  updateProjectSource,
  uploadSourceFileToStorage,
  validateSourceFile,
} from '@/lib/projectSources';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/common/Button';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Lightbulb, Link2, Loader2, Paperclip, Plus, Rocket, Sparkles, Trash2, Upload, X } from 'lucide-react';
import {
  EMPTY_ACTIVATION,
  type ActivationDraftResult,
  type Project,
  type ProjectActivation,
  type ProjectSource,
  type ProjectSourceUrlType,
} from '@/types';

/** 위저드에서 선택 가능한 모드 (legacy 제외) */
type WizardMode = 'idea_productization' | 'requirement_planning';

/** 텍스트 입력 필드 키 (mode 제외) */
type ActivationTextKey = Exclude<keyof ProjectActivation, 'mode'>;

interface Field {
  key: ActivationTextKey;
  label: string;
  placeholder: string;
  required?: boolean;
  /** 아이디어 자유 입력처럼 큰 textarea로 렌더 */
  big?: boolean;
}

const MODE_OPTIONS: { value: WizardMode; title: string; desc: string; icon: typeof Lightbulb }[] = [
  {
    value: 'idea_productization',
    title: '아이디어 제품화',
    desc: '아이디어를 시장조사와 제품화 전략으로 발전시킵니다. 누가 돈을 낼지, 어떤 MVP부터 검증할지 정리합니다.',
    icon: Lightbulb,
  },
  {
    value: 'requirement_planning',
    title: '요구사항/RFP 기반 기획',
    desc: '전달받은 요구사항을 분석해 서비스 기획 초안, 레퍼런스, 프로토타입 제작 방향, 개발 전달 문서로 정리합니다.',
    icon: ClipboardList,
  },
];

// 모드별 1단계(아이디어/요구사항) 입력 라벨·placeholder.
const IDEA_FIELD: Record<WizardMode, { label: string; placeholder: string }> = {
  idea_productization: {
    label: '무엇을 만들고 싶나요?',
    placeholder:
      '예: 여행 장소와 일정을 자동으로 정리해주는 앱을 만들고 싶습니다. 사용자는 구글맵에 저장한 장소나 참고 URL을 넣으면, AI가 여행 일정표와 예산, 날씨 준비까지 정리해줍니다.',
  },
  requirement_planning: {
    label: '전달받은 요구사항이나 RFP 내용을 입력해주세요.',
    placeholder:
      '예: 고객사에서 모바일 앱과 PC 관리자 페이지가 포함된 서비스를 요청했습니다. 사용자는 Google/Apple 로그인을 통해 앱에 접속하고, 관리자는 PC에서 클래스/영상/회원 정보를 관리해야 합니다. 참고 문서와 기존 프로토타입 코드가 있습니다.',
  },
};

// 모드별 1단계 설명 문구.
const IDEA_STEP_DESC: Record<WizardMode, string> = {
  idea_productization: '만들고 싶은 서비스나 아이디어를 자유롭게 설명해주세요. 이 내용으로 기획 문서 초안이 만들어집니다.',
  requirement_planning: '전달받은 요구사항이나 RFP 내용을 입력해주세요. 이 내용으로 기획 초안이 만들어집니다.',
};

// 모드별 2단계(보강 정보) 안내 문구.
const DETAIL_DESC: Record<WizardMode, string> = {
  idea_productization:
    '상세 정보를 더 입력하면 시장조사와 제품화 전략 품질이 좋아집니다. 비워두고 나중에 문서 화면에서 보완해도 됩니다.',
  requirement_planning:
    '요구사항의 범위, 참고 서비스, 플랫폼 구분, 필수 기능을 입력하면 기획 초안 품질이 좋아집니다. 비워두고 나중에 문서 화면에서 보완해도 됩니다.',
};

// 모드별 마지막 단계(문서 생성 안내) 문구.
const CONFIRM_DESC: Record<WizardMode, string> = {
  idea_productization:
    '활성화하면 브리프, 시장조사, 제품화전략 초안이 생성됩니다. IA와 기능정의서는 프로토타입 등록 후 생성할 수 있습니다.',
  requirement_planning:
    '활성화하면 요구사항 분석, 레퍼런스 조사, 구현 전략 초안이 생성됩니다. IA와 기능정의서는 확정된 프로토타입 코드와 화면 플로우를 기반으로 역작성합니다.',
};

// 보강 정보 단계의 9개 선택 입력 필드(모드 공통, 의미만 모드에 따라 해석).
const DETAIL_FIELDS: Field[] = [
  { key: 'problem', label: '해결하려는 문제', placeholder: '어떤 문제를 해결하는가? (선택)' },
  { key: 'customer', label: '핵심 고객', placeholder: '누구를 위한 제품인가? (선택)' },
  { key: 'value', label: '핵심 가치', placeholder: '고객에게 주는 핵심 가치 (선택)' },
  { key: 'differentiator', label: '핵심 차별점', placeholder: '경쟁/대안 대비 차별점 (선택)' },
  { key: 'revenue', label: '수익 구조', placeholder: '어떻게 수익을 내는가? (선택)' },
  { key: 'market', label: '최초 진입 시장', placeholder: '가장 먼저 공략할 시장/세그먼트 (선택)' },
  { key: 'mvpScope', label: 'MVP 범위', placeholder: '최소 기능 범위 (선택)' },
  { key: 'laterScope', label: '나중에 추가할 기능', placeholder: 'MVP 이후 확장 기능 (선택)' },
  { key: 'references', label: '참고 UI / 서비스 / 레퍼런스', placeholder: '참고할 서비스 또는 URL (선택)' },
];

// URL 등록 유형 → projectSources의 type/urlType 매핑.
const URL_TYPE_OPTIONS: { value: ProjectSourceUrlType; label: string; sourceType: ProjectSource['type'] }[] = [
  { value: 'service', label: '기존 서비스', sourceType: 'url' },
  { value: 'reference', label: '경쟁/레퍼런스', sourceType: 'reference_url' },
  { value: 'prototype', label: '프로토타입', sourceType: 'prototype_url' },
  { value: 'document', label: '문서·Drive 링크', sourceType: 'url' },
  { value: 'other', label: '기타', sourceType: 'url' },
];

// 입력 소스 유형 → 표시 라벨.
const SOURCE_TYPE_LABEL: Record<ProjectSource['type'], string> = {
  text: '텍스트',
  file: '파일',
  screenshot: '이미지',
  url: 'URL',
  reference_url: '레퍼런스 URL',
  prototype_url: '프로토타입 URL',
};

// 상태 → 표시 라벨. (파일: pending→uploaded, URL: pending 유지)
const SOURCE_STATUS_LABEL: Record<ProjectSource['status'], string> = {
  pending: '분석 대기',
  uploaded: '업로드됨',
  analyzing: '분석 중',
  analyzed: '분석 완료',
  failed: '실패',
  skipped: '분석 건너뜀',
};

const formatBytes = (n?: number): string => {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

type StepId = 'mode' | 'idea' | 'detail' | 'confirm';

// 4단계: 0) 시작 방식(모드 선택) 1) 아이디어/요구사항(유일 필수) 2) 보강 정보(선택) 3) 문서 생성 확인.
const buildSteps = (mode: WizardMode): { id: StepId; title: string; desc: string; fields: Field[] }[] => [
  { id: 'mode', title: '시작 방식', desc: '', fields: [] },
  {
    id: 'idea',
    title: mode === 'requirement_planning' ? '요구사항' : '아이디어',
    desc: IDEA_STEP_DESC[mode],
    fields: [{ key: 'intent', label: IDEA_FIELD[mode].label, placeholder: IDEA_FIELD[mode].placeholder, required: true, big: true }],
  },
  { id: 'detail', title: '보강 정보', desc: DETAIL_DESC[mode], fields: DETAIL_FIELDS },
  { id: 'confirm', title: '문서 생성', desc: '', fields: [] },
];

// AI 실행 노출 스위치(클라이언트). Vercel=false(로컬 전용 베타), 로컬=true.
// 미설정/false면 AI 초안 버튼 비활성 + 안내. 활성화(템플릿) 흐름은 영향 없음.
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';

interface Props {
  project: Project;
  onClose: () => void;
  onActivated: () => void;
}

export default function ProjectActivationWizard({ project, onClose, onActivated }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProjectActivation>(project.activation ?? EMPTY_ACTIVATION);
  // 시작 방식. 기존 프로젝트(legacy 포함)는 아이디어 제품화로 폴백.
  const [mode, setMode] = useState<WizardMode>(
    project.activation?.mode === 'requirement_planning' ? 'requirement_planning' : 'idea_productization',
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  // AI가 생성한 문서 초안 (있으면 활성화 시 템플릿 대신 사용).
  const [draftDocs, setDraftDocs] = useState<ActivationDraftResult['documents'] | null>(null);

  const { user } = useAuth();

  // 요구사항/RFP 입력 소스 (파일/URL). 등록 즉시 projectSources에 저장되어 실시간 구독.
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [urlValue, setUrlValue] = useState('');
  const [urlType, setUrlType] = useState<ProjectSourceUrlType>('service');
  // 업로드 진행 중인 source id (UI 전용 상태). Firestore status는 pending→uploaded로 전이.
  const [uploadingIds, setUploadingIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeProjectSources(project.id, setSources);
    return () => unsub();
  }, [project.id]);

  // 파일 선택 → 검증 → Storage 업로드 → projectSources 저장(pending→uploaded). 이미지면 screenshot.
  const handleAddFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    // 1) 검증: 거부 파일은 안내하고 제외.
    const valid: File[] = [];
    for (const f of files) {
      const v = validateSourceFile(f);
      if (v.ok) valid.push(f);
      else showToast(v.reason ?? '업로드할 수 없는 파일입니다.', 'error');
    }
    // 2) 각 파일: 메타(pending) 생성 → 업로드 → uploaded로 갱신. 실패 시 failed.
    await Promise.all(
      valid.map(async (f) => {
        let sourceId: string | null = null;
        try {
          sourceId = await createProjectSource({
            projectId: project.id,
            type: f.type.startsWith('image/') ? 'screenshot' : 'file',
            status: 'pending',
            title: f.name,
            fileName: f.name,
            fileType: f.type || 'application/octet-stream',
            fileSize: f.size,
            createdBy: user?.uid ?? 'anonymous',
          });
          setUploadingIds((prev) => [...prev, sourceId as string]);
          const { storagePath } = await uploadSourceFileToStorage(project.id, sourceId, f);
          await updateProjectSource(sourceId, { status: 'uploaded', storagePath });
        } catch (err) {
          console.error('파일 업로드 실패:', err);
          if (sourceId) await updateProjectSource(sourceId, { status: 'failed' }).catch(() => {});
          showToast(`업로드 실패: ${f.name}`, 'error');
        } finally {
          if (sourceId) setUploadingIds((prev) => prev.filter((x) => x !== sourceId));
        }
      }),
    );
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // URL 등록 → 메타만 저장 (실제 fetch/크롤링 없음).
  const handleAddUrl = async () => {
    const value = urlValue.trim();
    if (!value) return;
    const opt = URL_TYPE_OPTIONS.find((o) => o.value === urlType) ?? URL_TYPE_OPTIONS[0];
    try {
      await createProjectSource({
        projectId: project.id,
        type: opt.sourceType,
        status: 'pending',
        title: value,
        url: value,
        urlType: opt.value,
        createdBy: user?.uid ?? 'anonymous',
      });
      setUrlValue('');
      showToast('URL이 등록되었습니다. (분석은 다음 단계)');
    } catch (err) {
      console.error(err);
      showToast('URL 등록 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteSource = async (source: ProjectSource) => {
    try {
      await deleteProjectSource(source.id, source.storagePath);
    } catch (err) {
      console.error(err);
      showToast('삭제 중 오류가 발생했습니다. (Storage 파일 삭제 실패)', 'error');
    }
  };

  const STEPS = useMemo(() => buildSteps(mode), [mode]);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isConfirm = current.id === 'confirm';

  // 유일 필수 = 아이디어/요구사항(intent). 나머지 단계/필드는 항상 통과.
  const stepValid = current.fields.every((f) => !f.required || data[f.key].trim());
  const ideaFilled = !!data.intent.trim();
  // 입력값이 Google Drive 링크인지 감지 (등록 시 공유 권한 안내용, UI 전용).
  const isDriveLink = /drive\.google\.com|docs\.google\.com/i.test(urlValue);

  const set = (key: ActivationTextKey, v: string) => setData((prev) => ({ ...prev, [key]: v }));

  // 아이디어 → AI 초안 생성. 보강 정보 필드 자동 입력 + 문서 초안 보관. (Firestore 저장은 활성화 시점에)
  const handleGenerateAI = async () => {
    if (!AI_ENABLED || !data.intent.trim() || aiLoading) return; // 비활성 환경에서는 실행 차단(버튼도 disabled)
    setAiLoading(true);
    setAiNotice(null);
    try {
      const res = await fetch('/api/generate/activation-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: data.intent, currentFields: data, projectName: project.name }),
      });
      const result = (await res.json()) as ActivationDraftResult;
      if (!result?.ok || !result.fields) throw new Error('생성 실패');
      setData((prev) => ({ ...prev, ...result.fields }));
      // AI 문서만 보관(풍부함 유지). 폴백(template)은 보관하지 않고 활성화 시
      // 최종 입력값으로 재생성 → 사용자가 수정한 보강 정보가 문서에 반영된다.
      setDraftDocs(result.mode === 'ai' ? (result.documents ?? null) : null);
      setAiNotice(
        result.mode === 'template'
          ? 'AI 초안 생성을 사용할 수 없어 기본 초안을 만들었습니다. 내용을 직접 보완해주세요.'
          : 'AI가 보강 정보와 문서 초안을 생성했습니다. 자유롭게 수정하세요.',
      );
    } catch {
      setAiNotice('AI 초안 생성에 실패했습니다. 직접 입력하거나 다시 시도해주세요.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      // 선택한 시작 방식을 activation에 포함해 저장 (스키마 변경 없음, optional 필드).
      const activation: ProjectActivation = { ...data, mode };

      // 1) 프로젝트 활성화 (draft → active)
      await updateDoc(docRef('projects', project.id), {
        activation,
        status: 'active',
        activatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2) 기본 문서 3종 자동 생성 (brief / market_research / product_strategy)
      //    mode에 따라 제목·content 프레이밍이 달라진다(DocumentType은 동일).
      //    AI 초안(draftDocs)이 있으면 우선 사용, 없으면 템플릿.
      const docs = buildActivationDocuments({ ...project, activation }, activation, draftDocs ?? undefined);
      await Promise.all(
        docs.map((d) =>
          addDoc(col('documents'), {
            projectId: project.id,
            ...d,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      showToast('프로젝트가 활성화되었습니다. 기본 문서가 생성되었습니다.');
      onActivated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('활성화 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-3xl)] shadow-[var(--shadow-2xl)] w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* 헤더 */}
        <div className="p-7 border-b border-[var(--border-subtle)] flex justify-between items-start shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[var(--color-primary)] rounded-[var(--radius-xl)] flex items-center justify-center text-[var(--color-on-primary)] shadow-[var(--shadow-brand)] shrink-0">
              <Rocket size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight">프로젝트 활성화</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{project.name} · 시작 방식을 선택하고 내용을 입력하면 기획 문서 초안이 생성됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-1.5 px-7 pt-5 shrink-0 flex-wrap">
          {STEPS.map((s, i) => {
            const done = i < step;
            const cur = i === step;
            return (
              <div key={s.id} className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : cur
                        ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)] ring-2 ring-[var(--color-primary)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </span>
                <span className={`text-xs font-bold truncate ${cur || done ? 'text-[var(--color-primary-text)]' : 'text-[var(--text-tertiary)]'}`}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`mx-1 h-0.5 w-6 rounded-full ${done ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-default)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* 현재 단계 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-7">
          {current.desc && <p className="text-sm text-[var(--text-secondary)] mb-5">{current.desc}</p>}

          {/* 시작 방식(모드) 선택 단계 */}
          {current.id === 'mode' && (
            <div>
              <p className="text-base font-bold text-[var(--text-strong)] mb-4">어떤 방식으로 시작할까요?</p>
              <div className="space-y-3">
                {MODE_OPTIONS.map((opt) => {
                  const selected = mode === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      aria-pressed={selected}
                      className={`w-full text-left flex items-start gap-3.5 p-4 rounded-[var(--radius-xl)] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--surface-active)] ring-2 ring-[var(--color-primary)]'
                          : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span
                        className={`shrink-0 w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center ${
                          selected
                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                            : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--text-strong)]">
                          {opt.title}
                          {selected && <CheckCircle2 size={15} className="text-[var(--color-primary-text)]" />}
                        </span>
                        <span className="block text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI 초안 생성 (보강 정보 단계, 아이디어 제품화 모드 한정) — 아이디어로 보강 정보 자동 입력 + 문서 초안 생성 */}
          {current.id === 'detail' && mode === 'idea_productization' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={!AI_ENABLED || !ideaFilled || aiLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold shadow-[var(--shadow-brand)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {aiLoading ? 'AI가 초안을 만드는 중...' : 'AI로 초안 생성'}
              </button>
              {!AI_ENABLED ? (
                <p className="mt-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2">
                  AI 실행은 <b>로컬 전용(베타)</b>입니다. 배포 환경에서는 비활성화됩니다. 보강 정보를 직접 입력하거나, 비워두고 활성화하면 입력값 기반 템플릿 초안이 생성됩니다.
                </p>
              ) : (
                aiNotice && (
                  <p className="mt-2 text-xs font-medium text-[var(--color-primary-text)] bg-[var(--surface-active)] border border-[var(--brand-100)] rounded-[var(--radius-md)] px-3 py-2">
                    {aiNotice}
                  </p>
                )
              )}
            </div>
          )}

          {/* 요구사항/RFP 모드: 파일/URL 등록을 보강 입력 필드보다 위(핵심 진입점)에 배치 (아이디어 모드는 fields만). */}
          {/* 요구사항/RFP 모드 전용: 파일 / URL 입력 소스 등록 (S2 — 메타만 저장) */}
          {current.id === 'detail' && mode === 'requirement_planning' && (
            <div className="mt-6 space-y-5">
              {/* 파일 등록 */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)] mb-1.5">
                  <Paperclip size={15} className="text-[var(--color-primary-text)]" /> 파일 등록
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                  파일을 업로드하면 요구사항/RFP 분석 단계에서 원본 자료로 사용할 수 있습니다. 이번 단계에서는 파일 저장까지만 진행하며, 내용 분석은 다음 단계에서 진행합니다.
                  <span className="block mt-1 text-[var(--text-tertiary)]">PDF · DOCX · XLSX · CSV · TXT · MD · PNG · JPG · WEBP / 최대 10MB</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleAddFiles(e.target.files)}
                  className="hidden"
                />
                <Button variant="secondary" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                  파일 선택
                </Button>
              </div>

              {/* URL 등록 */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)] mb-1.5">
                  <Link2 size={15} className="text-[var(--color-primary-text)]" /> URL 등록
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-1.5 leading-relaxed">
                  기존 서비스, 경쟁 서비스, 디자인 레퍼런스, 프로토타입 URL, Google Drive 공유 링크를 등록할 수 있습니다. Drive 파일은 공유 권한이 있는 링크만 이후 분석할 수 있습니다.
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
                  Google Drive 문서를 등록하려면 Drive에서 “링크가 있는 사용자 보기 가능”으로 공유한 뒤 URL을 붙여넣어 주세요. 비공개 링크는 이후 분석 단계에서 접근이 제한될 수 있습니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={urlType}
                    onChange={(e) => setUrlType(e.target.value as ProjectSourceUrlType)}
                    className="shrink-0 px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                  >
                    {URL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                    placeholder="https://example.com 또는 Google Drive 공유 링크"
                    className="flex-1 min-w-0 px-4 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                  />
                  <Button variant="secondary" icon={Plus} onClick={handleAddUrl} disabled={!urlValue.trim()}>
                    추가
                  </Button>
                </div>
                {isDriveLink && (
                  <p className="mt-2 text-[11px] font-medium text-[var(--color-primary-text)] bg-[var(--surface-active)] border border-[var(--brand-100)] rounded-[var(--radius-md)] px-2.5 py-1.5 leading-relaxed">
                    Google Drive 링크로 감지되었습니다. 공유 권한이 없으면 이후 분석이 실패할 수 있습니다.
                  </p>
                )}
              </div>

              {/* 등록 목록 */}
              {sources.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">등록된 자료 ({sources.length})</div>
                  <ul className="space-y-2">
                    {sources.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)]"
                      >
                        <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] flex items-center justify-center">
                          {s.type === 'file' || s.type === 'screenshot' ? <FileText size={15} /> : <Link2 size={15} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                              {SOURCE_TYPE_LABEL[s.type]}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-body)] truncate" title={s.url || s.fileName || s.title}>
                              {s.url || s.fileName || s.title || '(제목 없음)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-0.5">
                            {uploadingIds.includes(s.id) ? (
                              <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary-text)]">
                                <Loader2 size={11} className="animate-spin" /> 업로드 중
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 font-medium ${s.status === 'failed' ? 'text-[var(--red-600)]' : s.status === 'uploaded' ? 'text-[var(--green-700)]' : 'text-[var(--amber-700)]'}`}>
                                {SOURCE_STATUS_LABEL[s.status]}
                              </span>
                            )}
                            {s.fileType && <span>· {s.fileType}</span>}
                            {!!s.fileSize && <span>· {formatBytes(s.fileSize)}</span>}
                            <span>· {formatDateTime(s.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(s)}
                          disabled={uploadingIds.includes(s.id)}
                          aria-label="삭제"
                          className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--red-600)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 보강 입력 필드 (아이디어 모드 detail 9필드 / 아이디어 자유입력 등). 요구사항 모드에선 파일·URL 등록 아래에 위치. */}
          {!isConfirm && (
            <div className={`space-y-4 ${current.id === 'detail' && mode === 'requirement_planning' ? 'mt-6' : ''}`}>
              {current.fields.map((f) => {
                const filled = !!data[f.key].trim();
                return (
                  <div key={f.key}>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-body)] mb-1.5">
                      {f.label} {f.required && <span className="text-[var(--red-600)]">*</span>}
                      {filled && <CheckCircle2 size={13} className="text-[var(--green-600)]" />}
                    </label>
                    <textarea
                      value={data[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={f.big ? 6 : 2}
                      className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-sm resize-y bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] text-[var(--text-body)] transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* 보강 정보 단계: 건너뛰기 안내 */}
          {current.id === 'detail' && (
            <p className="mt-4 text-xs text-[var(--text-tertiary)]">
              모두 선택 입력입니다. 비워두고 <span className="font-bold text-[var(--text-secondary)]">다음</span>을 눌러 바로 생성할 수 있어요.
            </p>
          )}

          {/* 생성 전 확인 단계 */}
          {isConfirm && (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                <div className="text-xs font-bold text-[var(--text-tertiary)] mb-1.5">
                  {mode === 'requirement_planning' ? '입력한 요구사항' : '입력한 아이디어'}
                </div>
                {ideaFilled ? (
                  <p className="text-sm text-[var(--text-body)] whitespace-pre-wrap leading-relaxed line-clamp-6">{data.intent}</p>
                ) : (
                  <p className="text-sm text-[var(--amber-700)]">
                    {mode === 'requirement_planning' ? '요구사항이' : '아이디어가'} 비어 있습니다. 입력 단계에서 작성해주세요.
                  </p>
                )}
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--brand-200)] bg-[var(--color-primary-softer)] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)]">
                  <Rocket size={15} className="text-[var(--color-primary-text)]" /> 완료하면 프로젝트가 <span className="text-[var(--color-primary-text)]">draft → active</span>로 전환됩니다.
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 mb-2.5">다음 기획 문서 초안이 자동 생성됩니다.</p>
                <ul className="flex flex-wrap gap-2 mb-3">
                  {(['brief', 'market_research', 'product_strategy'] as const).map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-body)] px-2.5 py-1 rounded-[var(--radius-md)]">
                      <FileText size={12} className="text-[var(--color-primary-text)]" /> {activationDocTitle(t, mode)}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--text-tertiary)]">{CONFIRM_DESC[mode]}</p>
              </div>
            </div>
          )}

          {/* 미입력 validation 안내 (입력 단계 전용) */}
          {!stepValid && (
            <p className="mt-4 text-xs font-medium text-[var(--amber-700)] bg-[var(--amber-50)] border border-[var(--amber-100)] rounded-[var(--radius-md)] px-3 py-2">
              {mode === 'requirement_planning' ? '요구사항' : '아이디어'}(<span className="text-[var(--red-600)] font-bold">*</span>)을(를) 입력해야 다음 단계로 진행할 수 있습니다.
            </p>
          )}
        </div>

        {/* 이전 / 다음 / 완료 */}
        <div className="p-6 border-t border-[var(--border-subtle)] flex justify-between items-center shrink-0">
          <Button variant="secondary" icon={ChevronLeft} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            이전
          </Button>
          {isLast ? (
            <Button icon={Rocket} onClick={handleActivate} disabled={!ideaFilled || saving} className="px-7">
              {saving ? '활성화 중...' : '활성화 완료'}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!stepValid}>
              다음 <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
