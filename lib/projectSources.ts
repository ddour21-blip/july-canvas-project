// 입력 소스(projectSources) 컬렉션 로직 — 요구사항/RFP 모드의 파일/URL 메타 등록.
// S2 단계: 메타데이터 저장/조회/삭제만 담당한다. 파일 업로드·파싱·URL fetch·분석은 하지 않는다.
import {
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { col, docRef } from './firestore';
import { storage, APP_ID } from './firebase';
import { getTime } from './utils';
import type { ProjectSource } from '@/types';

/** projectSources 생성에 필요한 입력. id/createdAt/updatedAt은 자동 처리. */
export type CreateProjectSourceInput = Omit<ProjectSource, 'id' | 'createdAt' | 'updatedAt'>;

// ---- 파일 업로드 제한 정책 (초기 MVP) ----
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** 허용 MIME (확장자가 빈 type을 반환하는 환경 대비, 확장자도 함께 본다) */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/csv',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const ALLOWED_EXT = new Set(['pdf', 'docx', 'xlsx', 'csv', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp']);

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
};

/** 업로드 전 파일 검증. 허용/거부 사유 반환. */
export const validateSourceFile = (file: File): { ok: boolean; reason?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: `파일이 너무 큽니다 (최대 10MB). ${file.name}` };
  }
  const ext = extOf(file.name);
  // 일부 브라우저/타입에서 file.type이 비어 있을 수 있어 확장자로 보완 판정.
  const mimeOk = file.type ? ALLOWED_MIME.has(file.type) : true;
  const extOk = ALLOWED_EXT.has(ext);
  if (!mimeOk || !extOk) {
    return { ok: false, reason: `허용되지 않는 파일 형식입니다: ${file.name}` };
  }
  return { ok: true };
};

/** Storage path에 안전한 파일명으로 변환 (경로 구분자/제어문자 제거, 확장자 보존). */
const safeFileName = (name: string): string => {
  const cleaned = name.replace(/[/\\]/g, '_').replace(/[^\w.\-가-힣]/g, '_').replace(/_+/g, '_');
  return cleaned || 'file';
};

/**
 * Storage 저장 경로. Firestore 네임스페이스와 동일하게 artifacts/{appId} 하위에 둔다.
 * sourceId를 포함해 같은 파일명 충돌을 방지한다.
 */
export const buildSourceStoragePath = (projectId: string, sourceId: string, fileName: string): string =>
  `artifacts/${APP_ID}/projectSources/${projectId}/${sourceId}/${safeFileName(fileName)}`;

/** 입력 소스 메타 생성. 생성된 문서 id 반환. (Storage/분석 없음) */
export const createProjectSource = async (input: CreateProjectSourceInput): Promise<string> => {
  const ref = await addDoc(col('projectSources'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/** 입력 소스 부분 업데이트 (업로드 완료/실패 상태 반영 등). */
export const updateProjectSource = async (
  id: string,
  patch: Partial<Omit<ProjectSource, 'id' | 'createdAt'>>,
): Promise<void> => {
  await updateDoc(docRef('projectSources', id), { ...patch, updatedAt: serverTimestamp() });
};

/**
 * 파일을 Storage에 업로드한다. storagePath 반환.
 * downloadUrl은 토큰 URL(규칙 우회 공개 접근 가능)이라 Firestore에 저장하지 않는다 —
 * 표시/다운로드는 후속 단계에서 인증 컨텍스트로 getDownloadURL 처리.
 */
export const uploadSourceFileToStorage = async (
  projectId: string,
  sourceId: string,
  file: File,
): Promise<{ storagePath: string }> => {
  const path = buildSourceStoragePath(projectId, sourceId, file.name);
  await uploadBytes(storageRef(storage, path), file, { contentType: file.type || 'application/octet-stream' });
  return { storagePath: path };
};

/** (후속 단계용) 인증 컨텍스트에서 임시 다운로드 URL 발급. Firestore에는 저장하지 않음. */
export const getSourceDownloadUrl = async (storagePath: string): Promise<string> =>
  getDownloadURL(storageRef(storage, storagePath));

/** Storage 파일 삭제. 객체 없음(이미 삭제됨 등)은 성공으로 간주. */
export const deleteSourceStorageFile = async (storagePath: string): Promise<void> => {
  try {
    await deleteObject(storageRef(storage, storagePath));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'storage/object-not-found') return; // 이미 없음 → 무시
    throw err;
  }
};

/** 입력 소스 삭제. storagePath가 있으면 Storage 파일 먼저 삭제 후 Firestore 메타 삭제. */
export const deleteProjectSource = async (id: string, storagePath?: string): Promise<void> => {
  if (storagePath) {
    await deleteSourceStorageFile(storagePath);
  }
  await deleteDoc(docRef('projectSources', id));
};

/** 프로젝트의 입력 소스 1회 조회 (createdAt 오름차순). */
export const getProjectSourcesByProjectId = async (projectId: string): Promise<ProjectSource[]> => {
  const snap = await getDocs(query(col('projectSources'), where('projectId', '==', projectId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectSource)
    .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
};

/** 프로젝트의 입력 소스 실시간 구독 (createdAt 오름차순). */
export const subscribeProjectSources = (
  projectId: string,
  callback: (sources: ProjectSource[]) => void,
): Unsubscribe => {
  return onSnapshot(query(col('projectSources'), where('projectId', '==', projectId)), (snap) => {
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ProjectSource)
      .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
    callback(data);
  });
};
