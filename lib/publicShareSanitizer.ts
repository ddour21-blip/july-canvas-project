// public_readonly 공유 응답 sanitizer — S7-2B-2
//
// 목적: 비로그인 public 공유 API 응답에서 권한/멤버/소유자/내부 식별 필드를 제거하고,
//       targetType별로 "허용된 최소 데이터"만 화이트리스트로 골라 반환한다.
//
// 설계: 출력은 "허용 필드만 명시적으로 골라 새 객체로 만든다"(whitelist). 입력 객체를
//       그대로 spread 하거나 delete 로 깎지 않는다 — 미래에 민감 필드가 추가돼도 새로
//       추가하지 않는 한 노출되지 않는다.
//
// ⚠️ 반환 금지(전 타입 공통): ownerId, memberUids, roleByUid, invitedEmails,
//    organizationId, createdBy, lockedBy 등 사용자/권한/내부 식별 정보.
import { getTime } from './utils';
import type {
  Project,
  ProjectActivation,
  ProjectDocument,
  ProjectMode,
  Screen,
  ShareAccessType,
  ShareRecord,
  ShareTargetType,
} from '@/types';

// ---- 출력 타입 (public 응답 전용 — 내부 타입과 분리) ----

/** activation 중 공개 가능한 기획 필드만 (사용자 식별 정보 없음). */
export interface PublicActivation {
  mode?: ProjectMode;
  intent?: string;
  problem?: string;
  customer?: string;
  value?: string;
  differentiator?: string;
  revenue?: string;
  market?: string;
  mvpScope?: string;
  laterScope?: string;
  references?: string;
}

/** prototypeLock 요약 (lockedBy=uid 제외). */
export interface PublicPrototypeLock {
  targetType: 'screen' | 'source';
  title?: string;
  url?: string;
}

/** project 요약 (소유자/멤버/권한 정보 없음). */
export interface PublicProject {
  id: string;
  name: string;
  description?: string;
  status?: string;
  activation?: PublicActivation;
  prototypeLock?: PublicPrototypeLock | null;
}

/** 문서 목록 요약 (content 제외). */
export interface PublicDocumentSummary {
  id: string;
  type: string;
  title: string;
  status?: string;
  version?: string;
}

/** 문서 단건 (content 포함). */
export interface PublicDocument extends PublicDocumentSummary {
  content: string;
  updatedAt?: number;
}

/** 화면 단건. */
export interface PublicScreen {
  id: string;
  name: string;
  code: string;
}

/** share 메타 요약. */
export interface PublicShare {
  shareId: string;
  targetType: ShareTargetType;
  targetTitle?: string;
  accessType: Extract<ShareAccessType, 'public_readonly'>;
}

// --- public_review (비로그인 코멘트) — S7-2C ---

/** 코멘트 입력 길이 제한. */
export const REVIEW_LIMITS = {
  contentMax: 1000,
  authorNameMax: 40,
  /** 한 번에 반환하는 코멘트 최대 개수. */
  listMax: 200,
} as const;

/** 코멘트 기본 작성자명. */
export const REVIEW_DEFAULT_AUTHOR = '익명';

/** 공개 코멘트(응답용) — 작성자명/내용/작성시각만. uid·IP 등 식별 정보 없음. */
export interface PublicReview {
  id: string;
  authorName: string;
  content: string;
  createdAt?: number;
}

/** 코멘트 레코드(저장 형태). */
export interface PublicReviewRecord {
  id: string;
  shareId: string;
  projectId: string;
  targetType: ShareTargetType;
  targetId?: string;
  authorName: string;
  content: string;
  status: 'visible' | 'pending';
  createdAt?: import('@/types').FirestoreTime;
  updatedAt?: import('@/types').FirestoreTime;
}

// ---- sanitizers ----

/** share 레코드 → 공개 메타 (createdBy/projectId/내부 필드 제외). */
export function sanitizeShareForPublic(share: ShareRecord): PublicShare {
  return {
    shareId: share.shareId,
    targetType: share.targetType,
    ...(share.targetTitle ? { targetTitle: share.targetTitle } : {}),
    accessType: 'public_readonly',
  };
}

function sanitizeActivation(a: ProjectActivation | undefined): PublicActivation | undefined {
  if (!a) return undefined;
  const out: PublicActivation = {};
  if (a.mode) out.mode = a.mode;
  if (a.intent) out.intent = a.intent;
  if (a.problem) out.problem = a.problem;
  if (a.customer) out.customer = a.customer;
  if (a.value) out.value = a.value;
  if (a.differentiator) out.differentiator = a.differentiator;
  if (a.revenue) out.revenue = a.revenue;
  if (a.market) out.market = a.market;
  if (a.mvpScope) out.mvpScope = a.mvpScope;
  if (a.laterScope) out.laterScope = a.laterScope;
  if (a.references) out.references = a.references;
  return out;
}

/** project → 공개 요약 (ownerId/roleByUid/memberUids/organizationId 등 전부 제외). */
export function sanitizeProjectForPublic(project: Project): PublicProject {
  const lock = project.prototypeLock;
  const out: PublicProject = {
    id: project.id,
    name: project.name,
  };
  if (project.description) out.description = project.description;
  if (project.status) out.status = project.status;
  const activation = sanitizeActivation(project.activation);
  if (activation) out.activation = activation;
  if (lock) {
    out.prototypeLock = {
      targetType: lock.targetType,
      ...(lock.title ? { title: lock.title } : {}),
      ...(lock.url ? { url: lock.url } : {}),
    };
  }
  return out;
}

/** 문서 목록 요약 (content 제외). */
export function sanitizeDocumentSummaryForPublic(doc: ProjectDocument): PublicDocumentSummary {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    ...(doc.status ? { status: doc.status } : {}),
    ...(doc.version ? { version: doc.version } : {}),
  };
}

/** 문서 단건 (content 포함). updatedAt 은 ms number 로 정규화(Firestore Timestamp 내부 구조 미노출). */
export function sanitizeDocumentForPublic(doc: ProjectDocument): PublicDocument {
  const updatedAt = getTime(doc.updatedAt);
  return {
    ...sanitizeDocumentSummaryForPublic(doc),
    content: doc.content ?? '',
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/**
 * 화면 단건 (id/name/code). annotations 등 내부 코멘트/식별 정보 제외.
 * ⚠️ code 는 임의 마크업/스크립트를 포함할 수 있다. 후속 public viewer(S7-2B-3)에서
 *    iframe sandbox 등 스크립트 실행 격리 정책을 반드시 별도 검토할 것.
 */
export function sanitizeScreenForPublic(screen: Screen): PublicScreen {
  return {
    id: screen.id,
    name: screen.name,
    code: screen.code ?? '',
  };
}

/** 코멘트 → 공개 응답(작성자명/내용/시각만). content는 원문 그대로 반환하고 렌더 시 텍스트로만 표시한다. */
export function sanitizeReviewForPublic(r: PublicReviewRecord): PublicReview {
  const createdAt = getTime(r.createdAt);
  return {
    id: r.id,
    authorName: r.authorName || REVIEW_DEFAULT_AUTHOR,
    content: r.content ?? '',
    ...(createdAt ? { createdAt } : {}),
  };
}
