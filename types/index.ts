// July Canvas - 데이터 모델 타입 정의
// 기존 프로토타입 구조를 유지하면서 기획 자동화 툴 고도화를 위한 타입을 추가합니다.

/** Firestore Timestamp 또는 number(ms) 또는 serverTimestamp sentinel 모두 허용 */
export type FirestoreTime =
  | number
  | { toMillis: () => number }
  | { seconds: number; nanoseconds?: number }
  | null
  | undefined;

export type ProjectStatus = 'draft' | 'active' | 'review' | 'approved' | 'archived' | 'handoff';

export type ProjectRole = 'owner' | 'editor' | 'viewer' | 'guest';

/**
 * 프로젝트 시작 방식.
 * - idea_productization: 아이디어를 시장조사/제품화 전략으로 발전 (기존 기본 흐름)
 * - requirement_planning: 전달받은 요구사항/RFP를 분석해 기획 초안/레퍼런스/구현 전략으로 정리
 * - legacy: mode가 저장되지 않은 기존 프로젝트 (idea_productization과 동일하게 처리)
 */
export type ProjectMode = 'idea_productization' | 'requirement_planning' | 'legacy';

/** 프로젝트 활성화 시 입력받는 기획 정보 (브리프 + 제품화전략 원천 데이터) */
export interface ProjectActivation {
  /** 프로젝트 시작 방식. 미지정(기존 프로젝트)은 idea_productization으로 폴백. */
  mode?: ProjectMode;
  /** 기획 의도 */
  intent: string;
  /** 해결하려는 문제 */
  problem: string;
  /** 핵심 고객 */
  customer: string;
  /** 핵심 가치 */
  value: string;
  /** 핵심 차별점 */
  differentiator: string;
  /** 수익 구조 */
  revenue: string;
  /** 최초 진입 시장 */
  market: string;
  /** MVP 범위 */
  mvpScope: string;
  /** 나중에 추가할 기능 */
  laterScope: string;
  /** 참고 UI/서비스/레퍼런스 */
  references: string;
}

/** AI(또는 템플릿 폴백) 초안 생성 결과. /api/generate/activation-draft 응답 본문. */
export interface ActivationDraftResult {
  ok: boolean;
  /** 'ai' = Claude 생성, 'template' = 키 없음/실패로 템플릿 폴백 */
  mode: 'ai' | 'template';
  reason?: string;
  fields: ProjectActivation;
  documents: {
    projectBrief: string;
    marketResearch: string;
    productStrategy: string;
  };
}

export const EMPTY_ACTIVATION: ProjectActivation = {
  intent: '',
  problem: '',
  customer: '',
  value: '',
  differentiator: '',
  revenue: '',
  market: '',
  mvpScope: '',
  laterScope: '',
  references: '',
};

/** 활성화 3단계(분석/보강 확인) 산출물의 핵심 요구사항 항목. */
export interface ActivationRequirement {
  id: string;
  title: string;
  description: string;
  required: boolean;
  rationale: string;
  /** 관련 projectSources.id (느슨한 참조 — 조인/제약 없음) */
  sourceIds: string[];
}

/** 참고자료별 요약(라벨/활용 목적/인사이트). projectSources와 느슨한 참조. */
export interface ActivationSourceSummary {
  sourceId: string;
  label: string;
  purpose: string;
  insight: string;
}

/**
 * 활성화 3단계 분석 산출물(단일 최신본). projects 문서의 optional field로 저장(A안).
 * 모든 값은 Firestore 안전 타입(string/string[]/boolean/number/plain object)만 사용한다.
 * AI 실행과 무관 — 수동/템플릿/AI 어느 경로든 동일 구조를 채운다.
 *
 * 3단계 UI는 기초 산출물 흐름(브리프 → 시장조사 → 제품화 전략)을 기준으로 구성되며,
 * 데이터도 동일하게 brief / marketResearch / productStrategy 그룹으로 계층화한다.
 */
export interface ActivationAnalysis {
  /** 생성 방식. */
  source: 'ai' | 'template' | 'manual';
  /** 스키마 버전(향후 호환). v2부터 브리프/시장조사/제품화전략 계층 구조. */
  schemaVersion: number;
  /** 사용자가 편집했는지(재생성 경고/표시용). */
  edited?: boolean;
  /** 분석 모드. 아이디어 제품화('idea') / 요구사항·RFP('requirements'). UI 분기 기준. */
  mode: 'idea' | 'requirements';

  /** 1. 브리프 초안 — 서비스의 문제/고객/가치 정의. */
  brief: {
    /** 아이디어 요약(아이디어 모드) / 요청 내용 요약(요구사항 모드). */
    summary: string;
    problem: string;
    customer: string;
    value: string;
    differentiation: string;
    /** 제약 조건 / 전제 조건. */
    constraints: string[];
  };

  /** 핵심/필수/선택 요구사항. 요구사항·RFP 모드에서 주로 사용(브리프 그룹 안에 표시). */
  requirements: ActivationRequirement[];

  /** 2. 시장조사 초안 — 시장/경쟁/기회/리스크. */
  marketResearch: {
    /** 기존 자사 서비스에 적용할 부분(요구사항 모드). */
    targetMarket: string;
    /** 목표 시장 / 최초 진입 시장(아이디어 모드). */
    entryMarket: string;
    customerProblemHypothesis: string;
    /** 경쟁/대안 서비스 / 참고한 타사·레퍼런스. */
    competitors: string[];
    /** 참고자료에서 확인한 레퍼런스 링크. */
    references: string[];
    /** 시장/사용자 관점 인사이트. */
    insights: string[];
    /** 시장 기회 / 유사 기능·차별화 포인트. */
    opportunities: string[];
    risks: string[];
  };

  /** 3. 제품화 전략 초안 — MVP/수익/정책/후속. */
  productStrategy: {
    /** 제품 콘셉트(아이디어 모드) / 제품 적용 방향(요구사항 모드). */
    concept: string;
    mvpIncluded: string[];
    mvpExcluded: string[];
    laterFeatures: string[];
    revenueModel: string;
    policyDraft: string[];
    approvalFlow: string;
    openQuestions: string[];
  };

  /** 참고자료별 요약(라벨/목적/인사이트). projectSources 변경 시 동기화. */
  sourceSummaries: ActivationSourceSummary[];

  generatedAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface Project {
  id: string;
  name: string;
  /** 조직 단위 확장 대비. 현재는 null(개인). 향후 organizations 컬렉션과 연결. */
  organizationId?: string | null;
  ownerId: string | null;
  /** uid → 역할 맵. 신규 프로젝트부터 적용 (레거시 프로젝트는 없을 수 있음). */
  roleByUid?: Record<string, ProjectRole>;
  /** 멤버 uid 배열. Firestore Rules 멤버십 read(list) 쿼리(array-contains)용. */
  memberUids?: string[];
  status?: ProjectStatus;
  description?: string;
  /** 활성화 입력 데이터 (활성화 완료 시 채워짐) */
  activation?: ProjectActivation;
  /** 확정(lock)된 기준 프로토타입. 이후 IA/기능정의서 역작성의 기준. 미확정/해제 시 없음(null). */
  prototypeLock?: PrototypeLock | null;
  /** 활성화 3단계 분석 산출물(단일 최신본). 미분석/기존 프로젝트는 없음. */
  activationAnalysis?: ActivationAnalysis | null;
  activatedAt?: FirestoreTime;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

/** 확정된 기준 프로토타입 (Project.prototypeLock). 새 컬렉션 없이 project 문서에 저장. */
export interface PrototypeLock {
  /** screen = 등록된 화면(코드), source = projectSources prototype_url */
  targetType: 'screen' | 'source';
  targetId: string;
  title?: string;
  url?: string;
  lockedAt: FirestoreTime;
  lockedBy: string;
}

/** 프로젝트별 멤버 (projectMembers 컬렉션) */
export interface ProjectMember {
  id: string;
  projectId: string;
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role: ProjectRole;
  status: 'active' | 'pending' | 'removed';
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

// --- 공유 링크 (shares 컬렉션) — S7-2A ---

export type ShareTargetType = 'project' | 'document' | 'screen' | 'handoff_package';

/**
 * - internal: 로그인 멤버용(현 단계). shareId로 내부 딥링크 resolve.
 * - public_readonly / public_review: 데이터 모델만 준비, 비로그인 접근은 후속(S7-2B/C).
 */
export type ShareAccessType = 'internal' | 'public_readonly' | 'public_review';

/** 공유 링크 레코드 (shares 컬렉션). shareId는 추측 불가 토큰. */
export interface ShareRecord {
  id: string;
  shareId: string;
  projectId: string;
  targetType: ShareTargetType;
  targetId?: string;
  targetTitle?: string;
  accessType: ShareAccessType;
  isEnabled: boolean;
  /** 만료 시각. null/미설정이면 만료 없음. */
  expiresAt?: FirestoreTime | null;
  createdAt?: FirestoreTime;
  createdBy: string;
  updatedAt?: FirestoreTime;
}

/** 로그인 사용자 정보 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

// --- 입력 소스(요구사항/RFP 첨부·링크) — projectSources 컬렉션 (M3/S2) ---

export type ProjectSourceType =
  | 'text'
  | 'file'
  | 'screenshot'
  | 'url'
  | 'reference_url'
  | 'prototype_url';

export type ProjectSourceStatus =
  | 'pending'
  | 'uploaded'
  | 'analyzing'
  | 'analyzed'
  | 'failed'
  | 'skipped';

export type ProjectSourceUrlType = 'service' | 'reference' | 'prototype' | 'document' | 'other';

/**
 * 요구사항/RFP 모드 입력 소스(파일/URL/텍스트) 메타데이터. projectSources 컬렉션.
 * S2 단계에서는 메타만 저장한다. 파일 업로드(storagePath/downloadUrl)와
 * 분석 결과(extractedText/analysisResult)는 후속 단계(S3/S5)에서 채운다.
 */
export interface ProjectSource {
  id: string;
  projectId: string;
  type: ProjectSourceType;
  status: ProjectSourceStatus;

  title?: string;
  description?: string;

  /** text 소스 본문 */
  content?: string;

  /** file / screenshot 메타 (S2: 업로드 없이 메타만) */
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  storagePath?: string;
  downloadUrl?: string;

  /** url 계열 */
  url?: string;
  urlType?: ProjectSourceUrlType;
  /** 프로토타입 URL 등록 시 도구 유형 (Gemini Canvas / Claude Artifact / Vercel Preview 등). 표시용. */
  prototypeKind?: string;

  /** 분석 결과 (후속 단계에서 사용) */
  extractedText?: string;
  analysisSummary?: string;
  analysisResult?: {
    requirements?: string[];
    features?: string[];
    screens?: string[];
    policies?: string[];
    references?: string[];
    risks?: string[];
  };

  createdBy: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type DocumentType =
  | 'brief'
  | 'market_research'
  | 'product_strategy'
  | 'ia'
  | 'feature_spec'
  | 'prd'
  // --- Pipeline MVP 신규 산출물 (기존 documents 컬렉션에 type만 추가 — schema/rules 무변경) ---
  | 'design_context'
  | 'service_structure'
  | 'development_plan'
  | 'qa_criteria'
  | 'launch_checklist'
  | 'operation_report';

export type DocumentStatus = 'draft' | 'review' | 'approved';

/**
 * July Canvas 파이프라인 8단계 (아이디어 → 운영). 저장하지 않고 프론트에서 derive한다.
 * 기존 documents 상태 / prototypeLock / project.status 기반 계산(신규 저장 필드 없음).
 */
export type PipelineStep =
  | 'idea'
  | 'planning'
  | 'design'
  | 'structure'
  | 'build_plan'
  | 'qa'
  | 'launch'
  | 'operate';

/** 단계별 파생 상태(UI 표시용). 저장하지 않는다. */
export type PipelineStepStatus =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'needs_review'
  | 'approved'
  | 'needs_regen';

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: string;
  version: string;
  status: DocumentStatus;
  /** 승인 완료 후 잠금 (PRD 등) */
  locked?: boolean;
  /**
   * 기획 산출물(brief/market_research/product_strategy) 생성·재생성 시점의 기준 fingerprint.
   * 현재 activation+activationAnalysis 기준값과 비교해 "재생성 필요" 여부를 판단한다(내부 비교용 해시).
   */
  sourceFingerprint?: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

/** 레거시 댓글 (기존: annotation 내부 배열). 읽기 fallback + 마이그레이션 원본. */
export interface CommentReply {
  id: string;
  text: string;
  author: string;
  createdAt: FirestoreTime;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: FirestoreTime;
  replies?: CommentReply[];
}

/** 멘션 대상 */
export interface CommentMention {
  uid?: string;
  email?: string;
  name?: string;
}

/** 신규 댓글 컬렉션(comments) 문서 */
export interface CommentDoc {
  id: string;
  organizationId?: string | null;
  projectId: string;
  screenId?: string;
  annotationId?: string;
  documentId?: string;
  parentCommentId?: string | null;

  body: string;

  authorUid: string;
  authorEmail?: string | null;
  authorName?: string | null;
  authorPhotoURL?: string | null;

  mentions: CommentMention[];

  status: 'active' | 'resolved' | 'deleted';
  source: 'annotation' | 'document' | 'project';

  /** 레거시 마이그레이션 출처 (중복 방지 키). 신규 댓글은 null */
  migratedFrom?: {
    screenId?: string;
    annotationId?: string;
    legacyCommentIndex?: number;
    legacyCommentId?: string;
  } | null;

  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

/** 정책 버전 히스토리 항목 */
export interface AnnotationHistory {
  version: string;
  title: string;
  description: string;
  updatedAt: FirestoreTime;
}

/** UI 요소에 붙는 기획/정책 주석 */
export interface Annotation {
  id: string;
  number?: number;
  title: string;
  description: string;
  version?: string;
  /** iframe 기준 좌표 */
  x: number;
  y: number;
  /** 스크롤 포함 절대 좌표 */
  absoluteX?: number;
  absoluteY?: number;
  /** 대상 요소 CSS selector */
  targetSelector?: string;
  /** 대상 요소 기준 오프셋 */
  offsetX?: number;
  offsetY?: number;
  /** 화면 컨텍스트 지문 */
  pageContext?: string;
  history?: AnnotationHistory[];
  comments?: Comment[];
  createdAt?: FirestoreTime;
}

/** 추적된 주석 (런타임 가시성/현재 좌표 계산 결과 포함) */
export interface TrackedAnnotation extends Annotation {
  isVisible?: boolean;
  currentX?: number;
  currentY?: number;
}

export interface Screen {
  id: string;
  projectId: string;
  name: string;
  code: string;
  annotations?: Annotation[];
  ownerId?: string | null;
  createdAt?: FirestoreTime;
}

/** 전역 팀원 (멘션 대상) */
export interface Member {
  id: string;
  nickname: string;
  email?: string;
  createdAt?: FirestoreTime;
}

/** 멘션 알림 (mockEmails 컬렉션) */
export interface MockEmail {
  id: string;
  author: string;
  receivers: string[];
  screenName?: string;
  projectName?: string;
  uiTitle?: string;
  text: string;
  isReply?: boolean;
  linkUrl: string;
  createdAt: FirestoreTime;
  isRead?: boolean;
}

export type ToastType = 'success' | 'error';

export interface ToastDetail {
  message: string;
  type: ToastType;
}

/** 해시 라우팅 파싱 결과 */
export interface ParsedRoute {
  workspaceId: string;
  viewType: 'dashboard' | 'project' | 'screen' | string;
  viewId: string | null;
  extraParam: string | null;
}

// --- 조직 단위 확장 대비 예약 모델 (이번 단계에서는 기능 미구현, 구조만 준비) ---

/** 조직(워크스페이스). 향후 organizations 컬렉션. */
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  memberUids?: string[];
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type OutputType = 'prd_md' | 'pptx' | 'ia_md' | 'feature_spec_md' | 'prototype_url';

/** 프로젝트 산출물(다운로드/전달물). 향후 outputs 컬렉션. */
export interface ProjectOutput {
  id: string;
  projectId: string;
  type: OutputType;
  title: string;
  url?: string;
  content?: string;
  createdBy?: string;
  createdAt?: FirestoreTime;
}
