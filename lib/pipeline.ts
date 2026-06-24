// July Canvas 파이프라인 8단계 상태 derive (저장하지 않고 프론트에서 계산).
// 신규 Firestore 필드/스키마 변경 없음. 기존 documents 상태 + prototypeLock + project.status + screens 로만 계산한다.
// stale(needs_regen) 판정은 기존 ProjectDocuments.deriveDocStatus 와 동일한 기준(타임스탬프 비교)을 최소 적용한다.
import { getTime } from '@/lib/utils';
import type {
  DocumentType,
  PipelineStep,
  PipelineStepStatus,
  Project,
  ProjectDocument,
  Screen,
} from '@/types';

export interface PipelineStepMeta {
  step: PipelineStep;
  label: string;
  /** 이 단계와 연결된 ProjectDetail 탭 키 (딥링크/이동용). */
  tab: string;
  /** 이 단계 진행을 판단하는 문서 타입(없으면 문서 비연동 단계). */
  docTypes: DocumentType[];
}

/** 단계 정의(순서 = 파이프라인 진행 순서). 탭 키는 ProjectDetail 과 일치. */
export const PIPELINE_STEPS: PipelineStepMeta[] = [
  { step: 'idea', label: '아이디어', tab: 'overview', docTypes: [] },
  { step: 'planning', label: '기획', tab: 'planning', docTypes: ['brief', 'market_research', 'product_strategy'] },
  { step: 'design', label: '디자인/프로토타입', tab: 'design', docTypes: ['design_context'] },
  { step: 'structure', label: '구조 설계', tab: 'structure', docTypes: ['ia', 'feature_spec', 'service_structure'] },
  { step: 'build_plan', label: '개발 패키지', tab: 'build_plan', docTypes: ['prd', 'development_plan'] },
  { step: 'qa', label: 'QA', tab: 'qa_launch', docTypes: ['qa_criteria'] },
  { step: 'launch', label: '배포 준비', tab: 'qa_launch', docTypes: ['launch_checklist'] },
  { step: 'operate', label: '운영', tab: 'operate', docTypes: ['operation_report'] },
];

export interface PipelineStepState {
  step: PipelineStep;
  label: string;
  tab: string;
  status: PipelineStepStatus;
}

const STATUS_LABEL: Record<PipelineStepStatus, string> = {
  not_started: '시작 전',
  ready: '진행 가능',
  in_progress: '작성 중',
  needs_review: '검토 필요',
  approved: '완료',
  needs_regen: '재생성 필요',
};

export const pipelineStatusLabel = (s: PipelineStepStatus): string => STATUS_LABEL[s];

/**
 * 역작성 산출물(ia/feature_spec/prd)의 stale 여부.
 * - ia: prototypeLock.lockedAt > ia.updatedAt
 * - feature_spec: lock 또는 ia.updatedAt > fs.updatedAt
 * - prd: lock 또는 feature_spec.updatedAt > prd.updatedAt
 * 타임스탬프가 없으면 false(오탐 방지).
 */
const isStale = (type: DocumentType, doc: ProjectDocument, project: Project, docs: ProjectDocument[]): boolean => {
  if (type !== 'ia' && type !== 'feature_spec' && type !== 'prd') return false;
  const updatedMs = getTime(doc.updatedAt);
  if (!updatedMs) return false;
  const lockedMs = project.prototypeLock ? getTime(project.prototypeLock.lockedAt) : 0;
  const iaMs = getTime(docs.find((d) => d.type === 'ia')?.updatedAt);
  const fsMs = getTime(docs.find((d) => d.type === 'feature_spec')?.updatedAt);
  let threshold = lockedMs || 0;
  if (type === 'feature_spec' && iaMs) threshold = Math.max(threshold, iaMs);
  if (type === 'prd' && fsMs) threshold = Math.max(threshold, fsMs);
  return threshold > 0 && updatedMs < threshold;
};

/**
 * 문서 기반 단계 상태 계산.
 * - prereqReady=false: 상위 단계 미준비 → 일부 문서가 있으면 in_progress, 없으면 not_started.
 * - prereqReady=true: 문서 0개=ready, 일부=in_progress, stale 있으면 needs_regen, 전부 존재 시 status 합산.
 */
const docStepStatus = (
  types: DocumentType[],
  project: Project,
  docs: ProjectDocument[],
  prereqReady: boolean,
): PipelineStepStatus => {
  const found = types.map((t) => docs.find((d) => d.type === t)).filter(Boolean) as ProjectDocument[];
  if (!prereqReady) return found.length ? 'in_progress' : 'not_started';
  if (found.length === 0) return 'ready';
  if (found.some((d) => isStale(d.type, d, project, docs))) return 'needs_regen';
  if (found.length < types.length) return 'in_progress';
  if (found.some((d) => d.status === 'review')) return 'needs_review';
  if (found.every((d) => d.status === 'approved')) return 'approved';
  return 'in_progress';
};

/** 프로젝트의 8단계 파이프라인 상태를 계산한다(저장하지 않음). */
export const derivePipelineStatus = (
  project: Project,
  docs: ProjectDocument[],
  screens: Screen[],
): PipelineStepState[] => {
  const present = (t: DocumentType) => !!docs.find((d) => d.type === t)?.content?.trim();
  const activated = !!project.activation && project.status !== 'draft';
  const hasLock = !!project.prototypeLock;
  const projScreens = screens.filter((s) => s.projectId === project.id);

  const statusFor = (step: PipelineStep): PipelineStepStatus => {
    switch (step) {
      case 'idea':
        return activated ? 'approved' : project.activation ? 'in_progress' : 'not_started';
      case 'planning':
        return docStepStatus(['brief', 'market_research', 'product_strategy'], project, docs, activated);
      case 'design':
        if (!activated) return 'not_started';
        // 확정 프로토타입이 있으면 완료. 없으면 디자인 컨텍스트 문서/등록 화면이 있으면 진행 중.
        if (hasLock) return 'approved';
        return present('design_context') || projScreens.length ? 'in_progress' : 'ready';
      case 'structure':
        return docStepStatus(['ia', 'feature_spec', 'service_structure'], project, docs, hasLock);
      case 'build_plan':
        return docStepStatus(['prd', 'development_plan'], project, docs, present('ia') && present('feature_spec'));
      case 'qa':
        return docStepStatus(['qa_criteria'], project, docs, present('prd') || present('development_plan'));
      case 'launch':
        return docStepStatus(['launch_checklist'], project, docs, present('qa_criteria'));
      case 'operate':
        return docStepStatus(['operation_report'], project, docs, present('launch_checklist'));
      default:
        return 'not_started';
    }
  };

  return PIPELINE_STEPS.map((m) => ({ step: m.step, label: m.label, tab: m.tab, status: statusFor(m.step) }));
};
