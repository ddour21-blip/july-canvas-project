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
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Lightbulb, Link2, Loader2, Paperclip, Plus, Rocket, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import {
  EMPTY_ACTIVATION,
  type ActivationAnalysis,
  type ActivationRequirement,
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


// 모드별 마지막 단계(문서 생성 안내) 문구.
const CONFIRM_DESC: Record<WizardMode, string> = {
  idea_productization:
    '활성화하면 브리프, 시장조사, 제품화전략 초안이 생성됩니다. IA와 기능정의서는 프로토타입 등록 후 생성할 수 있습니다.',
  requirement_planning:
    '활성화하면 요구사항 분석, 레퍼런스 조사, 구현 전략 초안이 생성됩니다. IA와 기능정의서는 확정된 프로토타입 코드와 화면 플로우를 기반으로 역작성합니다.',
};

// URL 등록 유형 → projectSources의 type/urlType 매핑.
const URL_TYPE_OPTIONS: { value: ProjectSourceUrlType; label: string; sourceType: ProjectSource['type'] }[] = [
  { value: 'service', label: '기존 서비스', sourceType: 'url' },
  { value: 'reference', label: '경쟁/레퍼런스', sourceType: 'reference_url' },
  { value: 'prototype', label: '프로토타입', sourceType: 'prototype_url' },
  { value: 'document', label: '문서·Drive 링크', sourceType: 'url' },
  { value: 'other', label: '기타', sourceType: 'url' },
];

// 활성화 입력 단계 참고자료 등록용 옵션. 확정 프로토타입 등록과 혼동되지 않도록 'prototype_url' 제외.
// (원본 URL_TYPE_OPTIONS·prototype_url 타입은 다른 화면용으로 그대로 유지)
const ACTIVATION_URL_TYPE_OPTIONS = URL_TYPE_OPTIONS.filter((o) => o.sourceType !== 'prototype_url');

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

// 저장소 연결 미비/권한/용량 류 업로드 실패 → Drive 링크 대체 안내로 묶는다.
const STORAGE_FALLBACK_CODES = [
  'storage/retry-limit-exceeded',
  'storage/unauthorized',
  'storage/quota-exceeded',
  'storage/unknown',
];
const STORAGE_FALLBACK_MSG =
  '파일 업로드 저장소 연결이 아직 준비되지 않았습니다. 지금은 Google Drive 공유 링크 또는 문서 URL로 참고자료를 등록해주세요.';

// 줄 단위 리스트 ↔ 문자열 (string[] 편집을 textarea 한 칸으로 처리).
const splitLines = (s: string): string[] => s.split('\n').map((x) => x.trim()).filter(Boolean);
const joinLines = (a: string[]): string => a.join('\n');

// 요구사항 행 id. crypto.randomUUID 미지원 환경 대비 fallback.
const createClientId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Firestore 저장용 안전 변환기.
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * activationAnalysis 를 Firestore 저장 전 정규화한다.
 * - string→'' / string[]→[] / boolean 유지, nested undefined 제거.
 * - optional timestamp(generatedAt/updatedAt)는 값이 있을 때만 포함(없으면 키 자체 생략).
 * - 권한 필드는 애초에 이 객체에 없으므로 payload에 섞일 수 없다.
 */
const sanitizeActivationAnalysis = (a: ActivationAnalysis): ActivationAnalysis => {
  const out: ActivationAnalysis = {
    source: a.source === 'ai' || a.source === 'template' ? a.source : 'manual',
    schemaVersion: typeof a.schemaVersion === 'number' ? a.schemaVersion : 2,
    edited: a.edited === true,
    mode: a.mode === 'requirements' ? 'requirements' : 'idea',
    brief: {
      summary: str(a.brief?.summary),
      problem: str(a.brief?.problem),
      customer: str(a.brief?.customer),
      value: str(a.brief?.value),
      differentiation: str(a.brief?.differentiation),
      constraints: strArr(a.brief?.constraints),
    },
    requirements: Array.isArray(a.requirements)
      ? a.requirements.map((r) => ({
          id: str(r?.id) || createClientId(),
          title: str(r?.title),
          description: str(r?.description),
          required: r?.required === true,
          rationale: str(r?.rationale),
          sourceIds: strArr(r?.sourceIds),
        }))
      : [],
    marketResearch: {
      targetMarket: str(a.marketResearch?.targetMarket),
      entryMarket: str(a.marketResearch?.entryMarket),
      customerProblemHypothesis: str(a.marketResearch?.customerProblemHypothesis),
      competitors: strArr(a.marketResearch?.competitors),
      references: strArr(a.marketResearch?.references),
      insights: strArr(a.marketResearch?.insights),
      opportunities: strArr(a.marketResearch?.opportunities),
      risks: strArr(a.marketResearch?.risks),
    },
    productStrategy: {
      concept: str(a.productStrategy?.concept),
      mvpIncluded: strArr(a.productStrategy?.mvpIncluded),
      mvpExcluded: strArr(a.productStrategy?.mvpExcluded),
      laterFeatures: strArr(a.productStrategy?.laterFeatures),
      revenueModel: str(a.productStrategy?.revenueModel),
      policyDraft: strArr(a.productStrategy?.policyDraft),
      approvalFlow: str(a.productStrategy?.approvalFlow),
      openQuestions: strArr(a.productStrategy?.openQuestions),
    },
    sourceSummaries: Array.isArray(a.sourceSummaries)
      ? a.sourceSummaries.map((s) => ({
          sourceId: str(s?.sourceId),
          label: str(s?.label),
          purpose: str(s?.purpose),
          insight: str(s?.insight),
        }))
      : [],
  };
  // optional timestamp: 값이 있을 때만 포함(undefined 키 삽입 방지).
  if (a.generatedAt !== undefined && a.generatedAt !== null) out.generatedAt = a.generatedAt;
  if (a.updatedAt !== undefined && a.updatedAt !== null) out.updatedAt = a.updatedAt;
  return out;
};

const formatBytes = (n?: number): string => {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

type StepId = 'mode' | 'idea' | 'detail' | 'confirm';

// 4단계: 0) 시작 방식(모드 선택) 1) 아이디어/요구사항(유일 필수) 2) AI 분석 결과 확인 3) 문서 생성 확인.
const buildSteps = (mode: WizardMode): { id: StepId; title: string; desc: string; fields: Field[] }[] => [
  { id: 'mode', title: '시작 방식', desc: '', fields: [] },
  {
    id: 'idea',
    title: mode === 'requirement_planning' ? '요구사항' : '아이디어',
    desc: IDEA_STEP_DESC[mode],
    fields: [{ key: 'intent', label: IDEA_FIELD[mode].label, placeholder: IDEA_FIELD[mode].placeholder, required: true, big: true }],
  },
  // 분석 확인: 입력 필드 없음(AI 분석 결과를 activationAnalysis로 확인/편집).
  { id: 'detail', title: '분석 확인', desc: '', fields: [] },
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

  // 3단계 분석 산출물(A안: project.activationAnalysis 단일 최신본). AI 미실행 — 수동/템플릿 초기값.
  // 기존 저장본은 sanitize로 정규화해 신규 필드(strategy 등) 누락 시에도 안전하게 렌더한다.
  const [analysis, setAnalysis] = useState<ActivationAnalysis | null>(
    project.activationAnalysis ? sanitizeActivationAnalysis(project.activationAnalysis) : null,
  );
  const [analysisSaving, setAnalysisSaving] = useState(false);

  // 분석 초기값 생성(현재 입력/소스 기반, AI 미실행). 자동 생성하지 않고 사용자가 버튼을 눌렀을 때만 호출.
  // 기존 activation(보강 정보) 값이 있으면 브리프/시장조사/제품화 전략 그룹에 시드 — 동일 내용 재입력 방지.
  const buildInitialAnalysis = (src: ActivationAnalysis['source']): ActivationAnalysis => ({
    source: src,
    schemaVersion: 2,
    mode: mode === 'requirement_planning' ? 'requirements' : 'idea',
    brief: {
      summary: data.intent.trim(),
      problem: data.problem,
      customer: data.customer,
      value: data.value,
      differentiation: data.differentiator,
      constraints: [],
    },
    requirements: [],
    marketResearch: {
      targetMarket: '',
      entryMarket: data.market,
      customerProblemHypothesis: '',
      competitors: [],
      references: [],
      insights: [],
      opportunities: [],
      risks: [],
    },
    productStrategy: {
      concept: '',
      mvpIncluded: splitLines(data.mvpScope),
      mvpExcluded: [],
      laterFeatures: splitLines(data.laterScope),
      revenueModel: data.revenue,
      policyDraft: [],
      approvalFlow: '',
      openQuestions: [],
    },
    sourceSummaries: sources.map((s) => ({
      sourceId: s.id,
      label: s.url || s.fileName || s.title || '(제목 없음)',
      purpose: '',
      insight: '',
    })),
  });

  // '수동으로 분석 내용 작성' — 빈 초기값으로 편집 폼 열기.
  const startManualAnalysis = () => {
    if (!analysis) setAnalysis(buildInitialAnalysis('manual'));
  };

  // 'AI 분석 실행' — 이번 단계는 실제 실행 미연결. 활성 환경에서도 템플릿 초안으로 시작(추후 local-cli 연결).
  const startAiAnalysis = () => {
    if (!AI_ENABLED) return; // 비활성 환경: 버튼 disabled
    if (!analysis) setAnalysis(buildInitialAnalysis('template'));
    showToast('지금은 템플릿 초안으로 시작합니다. 실제 AI 분석은 다음 단계에서 연결됩니다.');
  };

  // 참고자료 목록(projectSources)이 바뀌면 analysis.sourceSummaries를 동기화(입력한 목적/인사이트는 보존).
  useEffect(() => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const byId = new Map(prev.sourceSummaries.map((x) => [x.sourceId, x]));
      const next = sources.map(
        (s) => byId.get(s.id) ?? { sourceId: s.id, label: s.url || s.fileName || s.title || '(제목 없음)', purpose: '', insight: '' },
      );
      return { ...prev, sourceSummaries: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  /** analysis 부분 갱신(편집 표시 포함). */
  const patchAnalysis = (fn: (a: ActivationAnalysis) => ActivationAnalysis) =>
    setAnalysis((prev) => (prev ? { ...fn(prev), edited: true } : prev));

  // 분석 그룹(브리프/시장조사/제품화 전략) 내 단일 필드 렌더 헬퍼.
  // analysis narrowing을 깨지 않도록 값/세터만 받는다(내부에서 analysis를 직접 참조하지 않음).
  const textRow = (label: string, value: string, onChange: (v: string) => void, placeholder = '', rows = 2) => (
    <div>
      <label className="block text-xs font-bold text-[var(--text-body)] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-sm resize-y bg-[var(--surface-card)] text-[var(--text-body)]"
      />
    </div>
  );
  // 줄 단위 string[] 필드. 안내(줄 단위)는 라벨 옆에 한 번만.
  const listRow = (label: string, value: string[], onChange: (v: string[]) => void, placeholder = '', rows = 2) =>
    textRow(
      label,
      joinLines(value),
      (v) => onChange(splitLines(v)),
      placeholder || '한 줄에 하나씩 입력',
      rows,
    );

  /** 분석 내용만 부분 저장(권한 필드 미포함 → editor rules 통과). */
  const handleSaveAnalysis = async () => {
    if (!analysis || analysisSaving) return;
    setAnalysisSaving(true);
    try {
      await updateDoc(docRef('projects', project.id), {
        activationAnalysis: sanitizeActivationAnalysis({ ...analysis, edited: true }),
        updatedAt: serverTimestamp(),
      });
      showToast('분석 내용을 저장했습니다.');
    } catch (err) {
      console.error(err);
      showToast('분석 내용 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setAnalysisSaving(false);
    }
  };

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
          console.error('파일 업로드 실패:', err); // 내부 확인용 유지
          if (sourceId) await updateProjectSource(sourceId, { status: 'failed' }).catch(() => {});
          const code = (err as { code?: string })?.code ?? '';
          if (STORAGE_FALLBACK_CODES.includes(code)) {
            // 저장소 미비/권한/용량 → Drive 링크 대체 안내(앱 흐름은 계속).
            showToast(STORAGE_FALLBACK_MSG, 'error');
          } else {
            showToast(`파일 업로드에 실패했습니다: ${f.name}. Drive 공유 링크를 URL로 등록해 참고자료로 사용할 수 있습니다.`, 'error');
          }
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

  // 참고자료/레퍼런스 → references 텍스트 요약. 활성화 시 activation.references 매핑용.
  const summarizeReferences = (a: ActivationAnalysis): string => {
    const fromSources = a.sourceSummaries.map((s) => {
      const note = s.insight.trim() || s.purpose.trim();
      return note ? `${s.label} — ${note}` : s.label;
    });
    return [...fromSources, ...a.marketResearch.references].filter(Boolean).join('\n');
  };

  // 요구사항 목록 → 한 줄 요약(요구사항 모드에서 problem 폴백용).
  const summarizeRequirements = (a: ActivationAnalysis): string =>
    a.requirements.map((r) => r.title.trim()).filter(Boolean).join('\n');

  const handleActivate = async () => {
    setSaving(true);
    try {
      // 선택한 시작 방식을 activation에 포함해 저장 (스키마 변경 없음, optional 필드).
      // 분석 산출물이 있으면 brief/marketResearch/productStrategy를 기존 ProjectActivation 필드로
      // 얕게 반영한다(사용자가 9필드를 다시 입력하지 않도록 — 문서 3종 생성 흐름은 그대로 유지).
      // 분석 값이 비어 있으면 기존 data 값을 보존한다.
      const activation: ProjectActivation = { ...data, mode };
      if (analysis) {
        const mvpIncluded = joinLines(analysis.productStrategy.mvpIncluded);
        const mvpLater = joinLines(analysis.productStrategy.laterFeatures);
        const refSummary = summarizeReferences(analysis);
        const problemFallback =
          analysis.brief.problem || (analysis.mode === 'requirements' ? summarizeRequirements(analysis) : '');
        activation.intent = analysis.brief.summary || data.intent;
        activation.problem = problemFallback || data.problem;
        activation.customer = analysis.brief.customer || data.customer;
        activation.value = analysis.brief.value || data.value;
        activation.differentiator = analysis.brief.differentiation || data.differentiator;
        activation.market = analysis.marketResearch.entryMarket || analysis.marketResearch.targetMarket || data.market;
        activation.revenue = analysis.productStrategy.revenueModel || data.revenue;
        activation.mvpScope = mvpIncluded || data.mvpScope;
        activation.laterScope = mvpLater || data.laterScope;
        activation.references = refSummary || data.references;
      }

      // 1) 프로젝트 활성화 (draft → active). 분석 산출물이 있으면 함께 저장(최신본).
      await updateDoc(docRef('projects', project.id), {
        activation,
        ...(analysis ? { activationAnalysis: sanitizeActivationAnalysis(analysis) } : {}),
        status: 'active',
        activatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2) 기본 문서 3종 자동 생성 (brief / market_research / product_strategy)
      //    mode에 따라 제목·content 프레이밍이 달라진다(DocumentType은 동일).
      //    분석/매핑된 activation 입력값으로 템플릿 문서를 생성한다.
      const docs = buildActivationDocuments({ ...project, activation }, activation);
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

          {/* 입력 단계: 아이디어/요구사항 텍스트(필수) + 참고자료(파일/URL) — 두 모드 공통. projectSources 재사용. */}
          {current.id === 'idea' && (
            <div className="space-y-5">
              <p className="text-base font-bold text-[var(--text-strong)]">
                {mode === 'requirement_planning' ? '요구사항/RFP와 참고자료를 등록하세요' : '아이디어와 참고자료를 입력하세요'}
              </p>

              {/* 아이디어/요구사항 입력 (유일 필수) */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-body)] mb-1.5">
                  {IDEA_FIELD[mode].label} <span className="text-[var(--red-600)]">*</span>
                  {ideaFilled && <CheckCircle2 size={13} className="text-[var(--green-600)]" />}
                </label>
                <textarea
                  value={data.intent}
                  onChange={(e) => set('intent', e.target.value)}
                  placeholder={IDEA_FIELD[mode].placeholder}
                  rows={6}
                  className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-sm resize-y bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] text-[var(--text-body)] transition-colors"
                />
              </div>

              {/* 참고자료 (파일/URL/Drive) — 기존 projectSources 로직 재사용 */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-[var(--text-strong)]">참고자료</div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    기획에 참고할 파일, 기존 서비스 화면 캡처, RFP 문서, URL, Google Drive 공유 링크를 함께 등록할 수 있습니다.
                  </p>
                </div>

                {/* 파일 첨부 */}
                <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)] mb-1.5">
                    <Paperclip size={15} className="text-[var(--color-primary-text)]" /> 파일 첨부
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                    {mode === 'requirement_planning'
                      ? 'RFP·사업계획서 문서와 기존 서비스 UI 캡처 이미지를 함께 업로드할 수 있습니다.'
                      : '참고할 자료나 화면 캡처를 업로드할 수 있습니다.'}
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
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    파일 업로드가 실패하는 경우 Google Drive 공유 링크를 URL로 등록해주세요.
                  </p>
                </div>

                {/* URL 추가 */}
                <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)] mb-1.5">
                    <Link2 size={15} className="text-[var(--color-primary-text)]" /> URL 추가
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1.5 leading-relaxed">
                    기존 서비스, 경쟁 서비스, 디자인 레퍼런스, 프로토타입 URL, Google Drive 공유 링크를 등록할 수 있습니다.
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
                    Google Drive 문서는 “링크가 있는 사용자 보기 가능”으로 공유한 뒤 URL을 붙여넣어 주세요. 비공개 링크는 이후 분석 단계에서 접근이 제한될 수 있습니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={urlType}
                      onChange={(e) => setUrlType(e.target.value as ProjectSourceUrlType)}
                      className="shrink-0 px-3 py-2.5 border border-[var(--border-strong)] rounded-[var(--radius-lg)] text-sm bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                    >
                      {ACTIVATION_URL_TYPE_OPTIONS.map((o) => (
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
                    <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">등록된 참고자료 ({sources.length})</div>
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

                <p className="text-[11px] text-[var(--text-tertiary)]">
                  첨부한 파일과 링크는 이후 AI 분석, 기초 기획 문서, 프로토타입 생성, PRD 역작성에 참고자료로 사용됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 3단계: AI 분석 결과 확인 — 기초 산출물 흐름(브리프 → 시장조사 → 제품화 전략) 기준으로 초안을 확인/수정. */}
          {/*          이번 단계는 실제 AI 실행 미연결. projects.activationAnalysis 단일 최신본으로 저장. */}
          {current.id === 'detail' && (() => {
            const isReq = mode === 'requirement_planning';
            return (
            <div className="space-y-3 mb-6">
              {/* 제목 + 설명 */}
              <div>
                <p className="text-base font-bold text-[var(--text-strong)]">AI 분석 결과 확인</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  입력한 아이디어/요구사항과 참고자료를 바탕으로 브리프, 시장조사, 제품화 전략 초안을 정리합니다. 결과를 확인하고 필요한 부분만 수정하세요.
                </p>
              </div>

              {/* AI 분석 실행 영역 (상태 카드). 실제 실행은 미연결 — provider 정책에 따라 비활성/안내. */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2 text-sm font-bold text-[var(--text-strong)]">
                    <Sparkles size={16} className="text-[var(--color-primary-text)]" /> AI 분석
                  </div>
                  <button
                    type="button"
                    onClick={startAiAnalysis}
                    disabled={!AI_ENABLED}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)] text-sm font-bold shadow-[var(--shadow-brand)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    <Sparkles size={16} /> AI 분석 실행
                  </button>
                </div>
                {!AI_ENABLED && (
                  <p className="mt-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2">
                    AI 분석은 <b>로컬 전용(베타)</b>입니다. 배포 환경에서는 수동 초안으로 진행할 수 있습니다.
                  </p>
                )}
              </div>

              {analysis ? (
                <>
                  {/* 전체 activationAnalysis 저장(상단 1개) — 개별 섹션 저장 없음. primary CTA는 하단 '다음' 유지. */}
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <span className="text-[11px] text-[var(--text-tertiary)]">활성화 완료 시 자동 저장됩니다.</span>
                    <Button variant="secondary" icon={Save} onClick={handleSaveAnalysis} disabled={analysisSaving}>
                      {analysisSaving ? '저장 중…' : '분석 초안 저장'}
                    </Button>
                  </div>

                  {/* 1. 브리프 초안 */}
                  <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-strong)]">{isReq ? '1. 요구사항 분석 / 브리프 초안' : '1. 브리프 초안'}</div>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                        {isReq
                          ? '요청 내용을 요약하고 핵심 요구사항과 제약 조건을 정리합니다.'
                          : '입력 내용을 바탕으로 서비스의 문제, 고객, 가치 정의를 정리합니다.'}
                      </p>
                    </div>
                    {textRow(
                      isReq ? '요청 내용 요약' : '아이디어 요약',
                      analysis.brief.summary,
                      (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, summary: v } })),
                      isReq ? '전달받은 RFP/요구사항의 목적, 배경, 요청 범위를 요약합니다.' : '만들고 싶은 서비스의 핵심 요약',
                      3,
                    )}
                    {!isReq && (
                      <>
                        {textRow('해결하려는 문제', analysis.brief.problem, (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, problem: v } })), '어떤 문제를 해결하는가?')}
                        {textRow('핵심 고객', analysis.brief.customer, (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, customer: v } })), '누구를 위한 제품인가?')}
                        {textRow('핵심 가치', analysis.brief.value, (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, value: v } })), '고객에게 주는 핵심 가치')}
                        {textRow('핵심 차별점', analysis.brief.differentiation, (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, differentiation: v } })), '경쟁/대안 대비 차별점')}
                      </>
                    )}

                    {/* 핵심 요구사항 테이블 — 요구사항/RFP 모드에서만 노출(아이디어 모드는 MVP 포함 기능으로 대체). */}
                    {isReq && (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-strong)]">핵심 요구사항</div>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                              AI가 추출한 필수/선택 요구사항을 확인하고 수정합니다. 누락된 항목이 있을 때만 추가하세요.
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            icon={Plus}
                            onClick={() =>
                              patchAnalysis((a) => ({
                                ...a,
                                requirements: [...a.requirements, { id: createClientId(), title: '', description: '', required: true, rationale: '', sourceIds: [] } as ActivationRequirement],
                              }))
                            }
                          >
                            누락 요구사항 추가
                          </Button>
                        </div>
                        {analysis.requirements.length === 0 ? (
                          <p className="text-xs text-[var(--text-tertiary)]">아직 추출된 요구사항이 없습니다. AI 분석 실행 후 결과를 확인하거나, 누락 요구사항을 직접 추가할 수 있습니다.</p>
                        ) : (
                          <ul className="space-y-3">
                            {analysis.requirements.map((r, i) => (
                              <li key={r.id} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={r.title}
                                    onChange={(e) => patchAnalysis((a) => ({ ...a, requirements: a.requirements.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) }))}
                                    placeholder="요구사항명"
                                    className="flex-1 min-w-0 px-3 py-2 border border-[var(--border-strong)] rounded-[var(--radius-lg)] outline-none text-sm font-semibold bg-[var(--surface-card)] text-[var(--text-body)]"
                                  />
                                  <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-body)] shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={r.required}
                                      onChange={(e) => patchAnalysis((a) => ({ ...a, requirements: a.requirements.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)) }))}
                                    />
                                    필수
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => patchAnalysis((a) => ({ ...a, requirements: a.requirements.filter((_, j) => j !== i) }))}
                                    aria-label="요구사항 삭제"
                                    className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--red-600)] transition-colors"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                                <textarea
                                  value={r.description}
                                  onChange={(e) => patchAnalysis((a) => ({ ...a, requirements: a.requirements.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) }))}
                                  rows={2}
                                  placeholder="설명"
                                  className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-[var(--radius-lg)] outline-none text-sm resize-y bg-[var(--surface-card)] text-[var(--text-body)]"
                                />
                                <input
                                  type="text"
                                  value={r.rationale}
                                  onChange={(e) => patchAnalysis((a) => ({ ...a, requirements: a.requirements.map((x, j) => (j === i ? { ...x, rationale: e.target.value } : x)) }))}
                                  placeholder="근거"
                                  className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-[var(--radius-lg)] outline-none text-sm bg-[var(--surface-card)] text-[var(--text-body)]"
                                />
                                {analysis.sourceSummaries.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {analysis.sourceSummaries.map((src) => {
                                      const on = r.sourceIds.includes(src.sourceId);
                                      return (
                                        <button
                                          key={src.sourceId}
                                          type="button"
                                          onClick={() =>
                                            patchAnalysis((a) => ({
                                              ...a,
                                              requirements: a.requirements.map((x, j) =>
                                                j === i ? { ...x, sourceIds: on ? x.sourceIds.filter((s) => s !== src.sourceId) : [...x.sourceIds, src.sourceId] } : x,
                                              ),
                                            }))
                                          }
                                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] border transition-colors ${
                                            on ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--surface-active)]' : 'border-[var(--border-default)] text-[var(--text-tertiary)] bg-[var(--surface-card)]'
                                          }`}
                                          title={src.label}
                                        >
                                          {on ? '✓ ' : ''}{src.label.length > 18 ? src.label.slice(0, 18) + '…' : src.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {isReq &&
                      listRow(
                        '제약 조건 / 전제 조건',
                        analysis.brief.constraints,
                        (v) => patchAnalysis((a) => ({ ...a, brief: { ...a.brief, constraints: v } })),
                        '일정, 예산, 기술, 정책, 운영상 제약 조건을 한 줄에 하나씩 입력',
                      )}
                  </div>

                  {/* 2. 시장조사 초안 */}
                  <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-strong)]">{isReq ? '2. 시장조사 / 적용 방향' : '2. 시장조사 초안'}</div>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                        참고자료와 레퍼런스를 바탕으로 시장, 경쟁/대안, 기회와 리스크를 정리합니다.
                      </p>
                    </div>
                    {isReq ? (
                      <>
                        {textRow('기존 자사 서비스에 적용할 부분', analysis.marketResearch.targetMarket, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, targetMarket: v } })))}
                        {listRow('참고한 타사 / 레퍼런스 서비스', analysis.marketResearch.competitors, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, competitors: v } })))}
                        {listRow('유사 기능 / 차별화 포인트', analysis.marketResearch.opportunities, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, opportunities: v } })))}
                        {listRow('시장 / 사용자 관점 인사이트', analysis.marketResearch.insights, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, insights: v } })))}
                        {listRow('리스크', analysis.marketResearch.risks, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, risks: v } })))}
                      </>
                    ) : (
                      <>
                        {textRow('목표 시장 / 최초 진입 시장', analysis.marketResearch.entryMarket, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, entryMarket: v } })))}
                        {textRow('고객 문제 가설', analysis.marketResearch.customerProblemHypothesis, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, customerProblemHypothesis: v } })))}
                        {listRow('경쟁 / 대안 서비스', analysis.marketResearch.competitors, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, competitors: v } })))}
                        {listRow('참고자료에서 확인한 인사이트', analysis.marketResearch.insights, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, insights: v } })))}
                        {listRow('시장 기회', analysis.marketResearch.opportunities, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, opportunities: v } })))}
                        {listRow('리스크', analysis.marketResearch.risks, (v) => patchAnalysis((a) => ({ ...a, marketResearch: { ...a.marketResearch, risks: v } })))}
                      </>
                    )}
                  </div>

                  {/* 3. 제품화 전략 초안 */}
                  <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-strong)]">3. 제품화 전략 초안</div>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                        MVP 범위, 수익 구조, 운영 정책, 후속 기능을 정리합니다.
                      </p>
                    </div>
                    {textRow(
                      isReq ? '제품 적용 방향' : '제품 콘셉트',
                      analysis.productStrategy.concept,
                      (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, concept: v } })),
                    )}
                    {listRow('MVP 포함 기능', analysis.productStrategy.mvpIncluded, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, mvpIncluded: v } })))}
                    {listRow('MVP 제외 기능', analysis.productStrategy.mvpExcluded, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, mvpExcluded: v } })))}
                    {listRow('나중에 추가할 기능', analysis.productStrategy.laterFeatures, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, laterFeatures: v } })))}
                    {!isReq &&
                      textRow('수익 구조', analysis.productStrategy.revenueModel, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, revenueModel: v } })), '어떻게 수익을 내는가?')}
                    {listRow(isReq ? '정책 초안' : '운영 / 정책 초안', analysis.productStrategy.policyDraft, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, policyDraft: v } })))}
                    {isReq &&
                      textRow('승인 / 검토 흐름', analysis.productStrategy.approvalFlow, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, approvalFlow: v } })))}
                    {listRow('확인 필요 항목', analysis.productStrategy.openQuestions, (v) => patchAnalysis((a) => ({ ...a, productStrategy: { ...a.productStrategy, openQuestions: v } })))}
                  </div>
                </>
              ) : (
                /* 분석 결과 없음: 긴 빈 폼 대신 짧은 empty state + 수동 초안 작성 진입 */
                <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-5 text-center space-y-3">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                    {'아직 분석 결과가 없습니다.\nAI 분석을 실행하면 입력 내용과 참고자료를 바탕으로 브리프, 시장조사, 제품화 전략 초안이 순서대로 정리됩니다.\n배포 환경에서는 수동으로 초안을 작성할 수 있습니다.'}
                  </p>
                  <Button variant="secondary" icon={Plus} onClick={startManualAnalysis}>
                    수동 초안 작성
                  </Button>
                </div>
              )}
            </div>
            );
          })()}

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
