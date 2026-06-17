// 입력 소스(projectSources) 컬렉션 로직 — 요구사항/RFP 모드의 파일/URL 메타 등록.
// S2 단계: 메타데이터 저장/조회/삭제만 담당한다. 파일 업로드·파싱·URL fetch·분석은 하지 않는다.
import {
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { col, docRef } from './firestore';
import { getTime } from './utils';
import type { ProjectSource } from '@/types';

/** projectSources 생성에 필요한 입력. id/createdAt/updatedAt은 자동 처리. */
export type CreateProjectSourceInput = Omit<ProjectSource, 'id' | 'createdAt' | 'updatedAt'>;

/** 입력 소스 메타 생성. 생성된 문서 id 반환. (Storage/분석 없음) */
export const createProjectSource = async (input: CreateProjectSourceInput): Promise<string> => {
  const ref = await addDoc(col('projectSources'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/** 입력 소스 삭제. */
export const deleteProjectSource = async (id: string): Promise<void> => {
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
