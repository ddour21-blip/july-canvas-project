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
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Lightbulb, Link2, Loader2, Paperclip, Pencil, PlayCircle, Plus, Trash2, Upload, Wand2, X } from 'lucide-react';
import {
  EMPTY_ACTIVATION,
  type ActivationAnalysis,
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
    'AI 기획을 시작하면 브리프, 시장조사, 제품화전략 초안이 만들어집니다. IA와 기능정의서는 프로토타입 등록 후 생성할 수 있습니다.',
  requirement_planning:
    'AI 기획을 시작하면 요구사항 분석, 레퍼런스 조사, 구현 전략 초안이 만들어집니다. IA와 기능정의서는 확정된 프로토타입 코드와 화면 플로우를 기반으로 역작성합니다.',
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
    title: mode === 'requirement_planning' ? '요구사항 입력' : '아이디어 입력',
    desc: IDEA_STEP_DESC[mode],
    fields: [{ key: 'intent', label: IDEA_FIELD[mode].label, placeholder: IDEA_FIELD[mode].placeholder, required: true, big: true }],
  },
  // AI 정리 확인: 입력 필드 없음(자동 정리된 기획 기준을 확인/수정).
  { id: 'detail', title: 'AI 정리 확인', desc: '', fields: [] },
  { id: 'confirm', title: '기획 문서 생성', desc: '', fields: [] },
];

// AI 실행 노출 스위치(클라이언트). Vercel=false(로컬 전용 베타), 로컬=true.
// 미설정/false면 AI 초안 버튼 비활성 + 안내. 활성화(템플릿) 흐름은 영향 없음.
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';

interface Props {
  project: Project;
  onClose: () => void;
  onActivated: () => void;
  /** 진입 시 시작할 step (0=시작 방식, 1=아이디어/핵심 항목 입력, 2=AI 정리 확인, 3=문서 생성). 기본 0. */
  initialStep?: number;
}

export default function ProjectActivationWizard({ project, onClose, onActivated, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
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
  // 로컬 AI 분석 실행 진행 상태(버튼 비활성/로딩 표시용).
  const [aiRunning, setAiRunning] = useState(false);
  // 핵심 기준 요약 편집 모드. 기본은 읽기 전용 compact 표시, [수정] 클릭 시에만 입력 필드.
  const [summaryEditing, setSummaryEditing] = useState(false);

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
  // AI/수동 분석 결과를 '핵심 요약' 편집 필드(data.*)로 시드. 비어 있는 필드만 채워 사용자 수정은 보존.
  const seedSummaryFromAnalysis = (a: ActivationAnalysis) =>
    setData((prev) => ({
      ...prev,
      intent: prev.intent?.trim() ? prev.intent : a.brief.summary || prev.intent,
      customer: prev.customer?.trim() ? prev.customer : a.brief.customer || prev.customer,
      problem: prev.problem?.trim() ? prev.problem : a.brief.problem || prev.problem,
      value: prev.value?.trim() ? prev.value : a.brief.value || prev.value,
      differentiator: prev.differentiator?.trim() ? prev.differentiator : a.brief.differentiation || prev.differentiator,
      mvpScope: prev.mvpScope?.trim() ? prev.mvpScope : joinLines(a.productStrategy.mvpIncluded) || prev.mvpScope,
    }));

  // AI 비활성/실패 시에도 입력한 아이디어로 '기본 초안'을 자동 구성(빈 필드만 채움 → 사용자 수정 보존).
  // 같은 입력을 모든 필드에 반복하지 않고, 입력에서 핵심 주제를 뽑아 필드별로 다른 의미로 구조화한다.
  const buildFallbackSummary = (ideaRaw: string) => {
    const raw = (ideaRaw || '').trim();
    // 첫 줄·첫 문장에서 핵심 주제를 뽑고, '앱/서비스/플랫폼' 등 접미어를 떼어 핵심 명사만 남긴다.
    const firstLine = (raw.split('\n')[0] || '').trim();
    const sentence = (firstLine.split(/[.!?。\n]/)[0] || firstLine).trim();
    const topic = (sentence.length > 24 ? sentence.slice(0, 24).trim() : sentence) || '새 서비스';
    const core = topic.replace(/(앱|어플|애플리케이션|서비스|플랫폼|사이트|웹사이트|웹|툴|솔루션)\s*$/u, '').trim() || topic;
    return {
      // 서비스 목적 / 주요 사용자 / 해결하려는 문제 / 핵심 가치 / MVP 방향 / 차별점
      intent: `${core}을(를) 쉽게 시작하고 꾸준히 이어갈 수 있도록 돕는 서비스`,
      customer: `${core}에 관심이 있고 직접 활용하려는 개인 사용자`,
      problem: `${core} 과정이 번거롭거나 흩어져 지속하기 어려운 문제`,
      value: `간단한 흐름으로 ${core}의 핵심을 빠르게 처리하고 확인`,
      mvpScope: `핵심 기능 등록, 목록 확인, 기본 현황 보기`,
      differentiator: `복잡한 기능보다 빠른 실행과 확인에 집중한 단순한 흐름`,
    };
  };

  // 기본 초안 적용: 빈 핵심 요약 필드를 fallback으로 채우고 analysis(브리프/전략)도 같은 값으로 구성.
  const applyBasicDraft = (src: ActivationAnalysis['source']) => {
    const fb = buildFallbackSummary(data.intent);
    const merged = {
      intent: data.intent?.trim() || fb.intent,
      customer: data.customer?.trim() || fb.customer,
      problem: data.problem?.trim() || fb.problem,
      value: data.value?.trim() || fb.value,
      mvpScope: data.mvpScope?.trim() || fb.mvpScope,
      differentiator: data.differentiator?.trim() || fb.differentiator,
    };
    setData((prev) => ({ ...prev, ...merged }));
    const a = buildInitialAnalysis(src);
    a.brief.summary = merged.intent;
    a.brief.customer = merged.customer;
    a.brief.problem = merged.problem;
    a.brief.value = merged.value;
    a.brief.differentiation = merged.differentiator;
    a.productStrategy.mvpIncluded = splitLines(merged.mvpScope);
    setAnalysis(a);
  };

  // 3단계 단일 액션: AI 활성이면 AI 정리, 아니면 기본 초안. '초안 다시 정리'도 이 함수로 처리.
  // applyBasicDraft/seedSummaryFromAnalysis 모두 빈 필드만 채워 사용자 수정값을 보존한다.
  const runDraft = () => {
    if (aiRunning) return;
    if (AI_ENABLED) void startAiAnalysis();
    else applyBasicDraft('manual');
  };

  // 'AI 분석 실행' — 로컬 전용(local-cli). 서버 라우트가 disabled면 호출해도 AI_DISABLED로 떨어진다.
  // 성공: 응답 analysis를 sanitize 후 setAnalysis. 실패/비활성: 기존 템플릿 시드로 폴백.
  const startAiAnalysis = async () => {
    if (!AI_ENABLED || aiRunning) return; // 비활성 환경: 버튼 disabled
    setAiRunning(true);
    try {
      const res = await fetch('/api/generate/activation-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode === 'requirement_planning' ? 'requirements' : 'idea',
          idea: data.intent,
          projectName: project.name,
          currentFields: data,
          sources: sources.map((s) => ({ sourceId: s.id, label: s.url || s.fileName || s.title || '(제목 없음)' })),
          currentAnalysis: analysis ?? undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; analysis?: ActivationAnalysis; reason?: string };
      if (json?.ok && json.analysis) {
        // mode/source/schemaVersion은 신뢰 가능한 값으로 고정 후 sanitize. sourceSummaries는 이후 useEffect가 실제 소스와 동기화.
        const normalized = sanitizeActivationAnalysis({
          ...(json.analysis as ActivationAnalysis),
          source: 'ai',
          schemaVersion: 2,
          mode: mode === 'requirement_planning' ? 'requirements' : 'idea',
        });
        setAnalysis(normalized);
        seedSummaryFromAnalysis(normalized);
        showToast('AI 분석 초안을 생성했습니다. 결과를 확인하고 필요한 부분만 수정하세요.');
      } else {
        if (!analysis) applyBasicDraft('template');
        showToast('로컬 AI 실행이 준비되지 않아 기본 초안으로 시작합니다.', 'error');
      }
    } catch {
      if (!analysis) setAnalysis(buildInitialAnalysis('template'));
      showToast('로컬 AI 실행이 준비되지 않아 기본 초안으로 시작합니다.', 'error');
    } finally {
      setAiRunning(false);
    }
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
  const stepFieldsValid = current.fields.every((f) => !f.required || data[f.key].trim());
  // AI 정리 확인(detail) 단계는 초안(analysis)이 생성되어야 다음으로 진행 가능.
  // 기존 프로젝트가 이미 activationAnalysis를 가진 경우 mount 시 analysis가 채워져 통과한다.
  const stepValid = stepFieldsValid && (current.id !== 'detail' || !!analysis);
  const ideaFilled = !!data.intent.trim();
  // 생성 시점(Dashboard/모달)에 이미 아이디어가 입력돼 있었는지 — 중복 입력 안내용(저장된 activation.intent 기준).
  const prefilledIntent = !!project.activation?.intent?.trim();
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
        // 사용자가 '핵심 요약 보완' 단계에서 직접 입력한 값(data.*)을 우선한다. 비워둔 항목만 AI 분석으로 채움.
        activation.intent = data.intent?.trim() || analysis.brief.summary || '';
        activation.problem = data.problem?.trim() || problemFallback;
        activation.customer = data.customer?.trim() || analysis.brief.customer;
        activation.value = data.value?.trim() || analysis.brief.value;
        activation.differentiator = data.differentiator?.trim() || analysis.brief.differentiation;
        activation.market = analysis.marketResearch.entryMarket || analysis.marketResearch.targetMarket || data.market;
        activation.revenue = analysis.productStrategy.revenueModel || data.revenue;
        activation.mvpScope = data.mvpScope?.trim() || mvpIncluded;
        activation.laterScope = mvpLater || data.laterScope;
        activation.references = refSummary || data.references;
      }

      // 이미 활성화된 프로젝트(재수정)면 문서 재생성 없이 입력값만 갱신한다(중복 문서 방지).
      const alreadyActive = !!project.status && project.status !== 'draft';

      // 1) 프로젝트 활성화/갱신. 분석 산출물이 있으면 함께 저장(최신본).
      await updateDoc(docRef('projects', project.id), {
        activation,
        ...(analysis ? { activationAnalysis: sanitizeActivationAnalysis(analysis) } : {}),
        status: 'active',
        ...(alreadyActive ? {} : { activatedAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      });

      // 2) 최초 활성화에서만 기본 문서 3종 자동 생성(brief / market_research / product_strategy).
      //    재수정(이미 active)에서는 입력/요약만 갱신하고 문서를 다시 만들지 않는다(중복 방지).
      if (!alreadyActive) {
        const docs = buildActivationDocuments({ ...project, activation }, activation, undefined, analysis ?? undefined);
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
      }

      showToast(alreadyActive ? 'AI 기획이 업데이트되었습니다.' : 'AI 기획을 시작했어요. 기본 기획 문서가 만들어졌습니다.');
      onActivated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('AI 기획 시작 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* 헤더 */}
        <div className="p-7 border-b border-[var(--border-subtle)] flex justify-between items-start shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[var(--color-blue-50)] rounded-[var(--radius-xl)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <PlayCircle size={22} />
            </div>
            <div>
              <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-[var(--color-blue-50)] text-[var(--color-blue-700)] text-[11px] font-bold">
                기획 시작 단계 · AI 기획 {step + 1}/{STEPS.length}
              </span>
              <h2 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight mt-1.5">AI 기획 시작</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{project.name} · 시작 방식을 선택하고 아이디어를 입력하면 기획 문서 초안이 만들어집니다.</p>
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
                      ? 'bg-[var(--color-accent)] text-[var(--color-on-primary)]'
                      : cur
                        ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)] ring-1 ring-[var(--color-accent)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </span>
                <span className={`text-xs font-bold truncate ${cur || done ? 'text-[var(--color-primary-text)]' : 'text-[var(--text-tertiary)]'}`}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`mx-1 h-0.5 w-6 rounded-full ${done ? 'bg-[var(--color-accent)]' : 'bg-[var(--border-default)]'}`} />
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
                          ? 'border-[var(--color-accent)] bg-[var(--surface-active)] ring-1 ring-[var(--color-accent)]'
                          : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span
                        className={`shrink-0 w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center ${
                          selected
                            ? 'bg-[var(--color-accent)] text-[var(--color-on-primary)]'
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

              {prefilledIntent && (
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] border border-[var(--color-blue-100)] rounded-[var(--radius-md)] px-3 py-2">
                  <CheckCircle2 size={14} /> 이전에 입력한 내용을 불러왔어요. 필요한 부분만 보완하세요.
                </div>
              )}

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

          {/* 3단계: AI 정리 확인 — 입력 재료를 바탕으로 자동 정리된 '기획 기준'을 확인/수정하는 단계.
                      상세 산출물(브리프/시장조사/제품화 전략)은 미리보기만 보여주고, 상세 편집은 4단계 이후 산출물 상세에서 처리.
                      실제 AI 실행은 로컬 전용. projects.activationAnalysis 단일 최신본으로 저장. */}
          {current.id === 'detail' && (() => {
            const isReq = mode === 'requirement_planning';
            // 3-3. 핵심 기준 요약 6항목(읽기/편집 공용). data.* 와 1:1.
            const SUMMARY_FIELDS: { key: ActivationTextKey; label: string; ph: string }[] = [
              { key: 'intent', label: '서비스 목적', ph: '예: 흩어진 운동 기록을 한곳에 모아 성취를 시각화' },
              { key: 'customer', label: '주요 사용자', ph: '예: 자기 기록을 즐기는 20–30대 러너' },
              { key: 'problem', label: '해결하려는 문제', ph: '예: 기록이 흩어져 동기부여가 어렵다' },
              { key: 'value', label: '핵심 가치', ph: '예: 한 흐름으로 기록·통계·공유' },
              { key: 'mvpScope', label: 'MVP 방향', ph: '예: 운동 기록·통계·간단 공유' },
              { key: 'differentiator', label: '차별점', ph: '예: 기획-디자인-개발이 한 흐름으로 연결' },
            ];
            // 3-4. 산출물 미리보기 — 상세 textarea 대신 2~3줄 요약 카드만. 상세는 4단계 이후.
            const PREVIEWS = isReq
              ? [
                  { n: 1, title: '요구사항 분석 / 브리프', desc: '요청 내용과 핵심 요구사항, 제약 조건을 정리합니다.' },
                  { n: 2, title: '시장조사 / 적용 방향', desc: '참고자료와 유사 서비스를 기준으로 적용할 부분과 차별화 포인트를 검토합니다.' },
                  { n: 3, title: '제품화 전략', desc: 'MVP 범위, 제외할 기능, 이후 확장 방향을 구분합니다.' },
                ]
              : [
                  { n: 1, title: '브리프 초안', desc: '입력한 아이디어를 서비스 목적과 핵심 요구사항으로 정리합니다.' },
                  { n: 2, title: '시장조사 방향', desc: '참고자료와 유사 서비스를 기준으로 적용할 부분과 차별화 포인트를 검토합니다.' },
                  { n: 3, title: '제품화 전략', desc: 'MVP 범위, 제외할 기능, 이후 확장 방향을 구분합니다.' },
                ];
            return (
            <div className="space-y-4 mb-6">
              {/* 3-1. AI 정리 상태 + 액션(단일 헤더 카드). 생성 전/후 문구를 한 곳으로 통합(중복 제거). */}
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-base font-bold text-[var(--text-strong)]">
                      <Wand2 size={18} className="text-[var(--color-primary-text)]" /> {analysis ? 'AI 정리 완료' : 'AI 정리 확인'}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {analysis ? '기획 기준과 산출물 초안이 준비되었습니다.' : '기획 기준과 산출물 초안을 생성합니다.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runDraft}
                    disabled={aiRunning}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)] text-sm font-bold shadow-[var(--shadow-brand)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    {aiRunning ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    {aiRunning ? '정리 중…' : analysis ? '초안 다시 정리' : AI_ENABLED ? 'AI 정리 생성' : '기본 초안 생성'}
                  </button>
                </div>
                {!AI_ENABLED && !analysis && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-2">로컬 AI가 꺼져 있어 기본 초안으로 생성됩니다.</p>
                )}
              </div>

              {/* 3-3. 핵심 기준 요약 — 생성 후에만 노출. 기본은 compact 읽기, [수정] 클릭 시에만 편집. */}
              {analysis && (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-strong)]">핵심 기준 요약</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">자동 정리된 결과입니다. 필요한 항목만 수정하세요.</p>
                    </div>
                    <Button variant="secondary" icon={summaryEditing ? Check : Pencil} onClick={() => setSummaryEditing((v) => !v)}>
                      {summaryEditing ? '완료' : '수정'}
                    </Button>
                  </div>
                  {summaryEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SUMMARY_FIELDS.map((f) => (
                        <label key={f.key} className="block">
                          <span className="block text-xs font-bold text-[var(--text-tertiary)] mb-1">{f.label}</span>
                          <input
                            value={data[f.key]}
                            onChange={(e) => set(f.key, e.target.value)}
                            placeholder={f.ph}
                            className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-sm bg-[var(--surface-card)] text-[var(--text-body)] transition-colors"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                      {SUMMARY_FIELDS.map((f) => (
                        <div key={f.key} className="grid grid-cols-[84px_1fr] gap-2">
                          <dt className="text-[11px] font-bold text-[var(--text-tertiary)] pt-0.5">{f.label}</dt>
                          <dd className="text-sm text-[var(--text-body)] leading-relaxed line-clamp-2">
                            {data[f.key]?.trim() ? data[f.key] : <span className="text-[var(--text-tertiary)]">미입력</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}

              {/* 3-4. 산출물 미리보기 — 상세 textarea 대신 요약 카드만. 상세 편집은 4단계 이후 산출물 상세에서. */}
              {analysis && (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
                  <p className="text-sm font-bold text-[var(--text-strong)]">산출물 미리보기</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 mb-3 leading-relaxed">
                    다음 단계에서 아래 기획 산출물이 생성됩니다. 상세 내용은 문서 생성 후 산출물 상세에서 편집할 수 있습니다.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PREVIEWS.map((p) => (
                      <div key={p.n} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-strong)]">
                          <FileText size={13} className="text-[var(--color-primary-text)]" /> {p.n}. {p.title}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{p.desc}</p>
                      </div>
                    ))}
                  </div>
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
                  <PlayCircle size={15} className="text-[var(--color-primary-text)]" /> 완료하면 프로젝트가 <span className="text-[var(--color-primary-text)]">draft → active</span>로 전환됩니다.
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
          {!stepFieldsValid && (
            <p className="mt-4 text-xs font-medium text-[var(--amber-700)] bg-[var(--amber-50)] border border-[var(--amber-100)] rounded-[var(--radius-md)] px-3 py-2">
              {mode === 'requirement_planning' ? '요구사항' : '아이디어'}(<span className="text-[var(--red-600)] font-bold">*</span>)을(를) 입력해야 다음 단계로 진행할 수 있습니다.
            </p>
          )}
          {/* AI 정리 확인 단계: 초안 미생성 시 진행 안내 */}
          {current.id === 'detail' && !analysis && (
            <p className="mt-4 text-xs font-medium text-[var(--amber-700)] bg-[var(--amber-50)] border border-[var(--amber-100)] rounded-[var(--radius-md)] px-3 py-2">
              먼저 {AI_ENABLED ? 'AI 정리 생성' : '기본 초안 생성'}을 눌러 초안을 만들어야 다음 단계로 진행할 수 있습니다.
            </p>
          )}
        </div>

        {/* 이전 / 다음 / 완료 */}
        <div className="p-6 border-t border-[var(--border-subtle)] flex justify-between items-center shrink-0">
          <Button variant="secondary" icon={ChevronLeft} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            이전
          </Button>
          {isLast ? (
            <Button icon={PlayCircle} onClick={handleActivate} disabled={!ideaFilled || saving} className="px-7">
              {saving ? '기획 문서 생성 중...' : '기획 문서 생성'}
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
