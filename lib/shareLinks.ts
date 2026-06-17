// 내부 공유 딥링크 빌더 (S7-1)
// 현재 해시 라우팅(`#{view}_{id}...`, `_` 구분자)을 그대로 따른다.
// CanvasApp 파서가 인식하는 형태만 생성한다. public share/shares 컬렉션은 후속(S7-2).

/** 해시 경로(앞의 #/origin 없이 라우트 문자열만). id에는 `_`가 없어야 한다(Firestore auto-id는 안전). */
export const shareHash = {
  /** 프로젝트 개요 */
  project: (projectId: string): string => `#project_${projectId}`,
  /** 프로젝트 문서 탭 */
  documents: (projectId: string): string => `#project_${projectId}_documents`,
  /** 특정 문서 선택 상태로 문서 탭 열기 */
  document: (projectId: string, documentId: string): string => `#project_${projectId}_document_${documentId}`,
  /** 프로토타입 화면(ScreenEditor) */
  screen: (screenId: string): string => `#screen_${screenId}`,
  /** 공유 링크 (shareId → 내부 딥링크 resolve, S7-2A). shareId에는 '_'가 없어야 함. */
  share: (shareId: string): string => `#share_${shareId}`,
};

/** 해시를 현재 origin/path 기준 절대 URL로. (서버 렌더 시 해시만 반환) */
export const toShareUrl = (hash: string): string =>
  typeof window === 'undefined' ? hash : `${window.location.origin}${window.location.pathname}${hash}`;
