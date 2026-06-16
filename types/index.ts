// July Canvas - 데이터 모델 타입 정의
// 기존 프로토타입 구조를 유지하면서 기획 자동화 툴 고도화를 위한 타입을 추가합니다.

/** Firestore Timestamp 또는 number(ms) 또는 serverTimestamp sentinel 모두 허용 */
export type FirestoreTime =
  | number
  | { toMillis: () => number }
  | { seconds: number; nanoseconds?: number }
  | null
  | undefined;

export type ProjectStatus = 'draft' | 'active' | 'review' | 'approved' | 'handoff';

export type ProjectRole = 'owner' | 'editor' | 'viewer' | 'guest';

/** 프로젝트 활성화 시 입력받는 기획 정보 (브리프 + 제품화전략 원천 데이터) */
export interface ProjectActivation {
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

export interface Project {
  id: string;
  name: string;
  ownerId: string | null;
  status?: ProjectStatus;
  description?: string;
  /** 활성화 입력 데이터 (활성화 완료 시 채워짐) */
  activation?: ProjectActivation;
  activatedAt?: FirestoreTime;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type DocumentType =
  | 'brief'
  | 'market_research'
  | 'product_strategy'
  | 'ia'
  | 'feature_spec'
  | 'prd';

export type DocumentStatus = 'draft' | 'review' | 'approved';

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
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

/** 정책/기획 주석에 달리는 댓글 (기존: annotation 내부 배열) */
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
