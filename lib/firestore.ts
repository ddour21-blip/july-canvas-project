// Firestore 경로 헬퍼
// 기존 구조 'artifacts/{appId}/public/data/{collection}' 를 그대로 유지합니다.

import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db, APP_ID } from './firebase';

const BASE = ['artifacts', APP_ID, 'public', 'data'] as const;

export type CollectionName =
  | 'projects'
  | 'screens'
  | 'members'
  | 'mockEmails'
  | 'documents'
  | 'screen_images'
  | 'app_urls'
  | 'config';

/** 컬렉션 레퍼런스 */
export function col(name: CollectionName): CollectionReference {
  return collection(db, ...BASE, name);
}

/** 문서 레퍼런스 */
export function docRef(name: CollectionName, id: string): DocumentReference {
  return doc(db, ...BASE, name, id);
}
