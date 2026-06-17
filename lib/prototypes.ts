// 프로토타입 등록 로직 (B3)
// 기존 구조를 재사용한다:
// - 프로토타입 URL  → projectSources (type: 'prototype_url', urlType: 'prototype')
// - 프로토타입 코드  → screens (name + code) → 기존 ScreenEditor가 렌더 (#screen_{id})
// 이번 단계는 "등록"까지만. 분석/IA 생성/기능정의서 역작성/코드 실행은 하지 않는다.
import { addDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { col } from './firestore';
import {
  createProjectSource,
  deleteProjectSource,
  subscribeProjectSources,
} from './projectSources';
import type { ProjectSource } from '@/types';

/** 프로토타입 도구 유형 (표시·분류용). */
export const PROTOTYPE_KINDS = [
  'Gemini Canvas',
  'Claude Artifact',
  'Vercel Preview',
  'HTML Prototype',
  'React Prototype',
  '기타',
] as const;

export interface RegisterPrototypeUrlInput {
  projectId: string;
  name: string;
  url: string;
  description?: string;
  kind: string;
  createdBy: string;
}

/** 프로토타입 URL 등록 → projectSources(prototype_url). 생성 id 반환. */
export const registerPrototypeUrl = async (input: RegisterPrototypeUrlInput): Promise<string> =>
  createProjectSource({
    projectId: input.projectId,
    type: 'prototype_url',
    urlType: 'prototype',
    status: 'pending',
    title: input.name.trim() || input.url,
    url: input.url.trim(),
    description: input.description?.trim() || undefined,
    prototypeKind: input.kind,
    createdBy: input.createdBy,
  });

/** 프로토타입 URL 삭제 (projectSources 메타 삭제). */
export const deletePrototypeUrl = (id: string): Promise<void> => deleteProjectSource(id);

/** 프로젝트의 프로토타입 URL 실시간 구독 (type === 'prototype_url'). */
export const subscribePrototypeUrls = (
  projectId: string,
  callback: (sources: ProjectSource[]) => void,
): Unsubscribe =>
  subscribeProjectSources(projectId, (all) => callback(all.filter((s) => s.type === 'prototype_url')));

/** 프로토타입 코드(HTML/React)를 screen으로 등록 → 기존 ScreenEditor가 렌더. 생성 screen id 반환. */
export const registerPrototypeScreen = async (input: {
  projectId: string;
  name: string;
  code: string;
  ownerId?: string | null;
}): Promise<string> => {
  const ref = await addDoc(col('screens'), {
    projectId: input.projectId,
    name: input.name.trim() || '프로토타입 화면',
    code: input.code,
    annotations: [],
    ownerId: input.ownerId ?? null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};
