// 공유 링크(shares 컬렉션) 로직 — S7-2A
// shareId 생성/share record CRUD(생성·활성토글)·실시간 구독·내부 딥링크 resolve.
// 이번 단계는 internal(로그인 멤버) 중심. 비로그인 public read는 후속(S7-2B).
import {
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { col, docRef } from './firestore';
import { shareHash } from './shareLinks';
import { getTime, nowMs } from './utils';
import type { ShareAccessType, ShareRecord, ShareTargetType } from '@/types';

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * 추측 불가 shareId 생성. crypto.getRandomValues 기반 base62.
 * ⚠️ 해시 라우팅(`_` 구분자) 호환을 위해 언더스코어를 쓰지 않는다.
 *    'sh' 프리픽스 + 22 base62 (예: shK7p2Qm...). Date.now 단독 사용 안 함.
 */
export const createShareId = (): string => {
  const len = 22;
  const out: string[] = [];
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) out.push(BASE62[buf[i] % 62]);
  } else {
    for (let i = 0; i < len; i++) out.push(BASE62[Math.floor(Math.random() * 62)]);
  }
  return 'sh' + out.join('');
};

export type ShareExpiry = 'none' | '7d' | '30d';

export const EXPIRY_OPTIONS: { value: ShareExpiry; label: string }[] = [
  { value: 'none', label: '만료 없음' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
];

/** 만료 옵션 → 만료 시각(ms) 또는 null. */
export const expiryToMs = (opt: ShareExpiry): number | null => {
  if (opt === '7d') return nowMs() + 7 * 24 * 60 * 60 * 1000;
  if (opt === '30d') return nowMs() + 30 * 24 * 60 * 60 * 1000;
  return null;
};

export interface CreateShareInput {
  projectId: string;
  targetType: ShareTargetType;
  targetId?: string;
  targetTitle?: string;
  accessType?: ShareAccessType; // 현 단계 기본 internal
  expiry?: ShareExpiry;
  createdBy: string;
}

/** share record 생성. shareId 반환. */
export const createShare = async (input: CreateShareInput): Promise<string> => {
  const shareId = createShareId();
  const expiresAt = expiryToMs(input.expiry ?? 'none');
  await addDoc(col('shares'), {
    shareId,
    projectId: input.projectId,
    targetType: input.targetType,
    ...(input.targetId ? { targetId: input.targetId } : {}),
    ...(input.targetTitle ? { targetTitle: input.targetTitle } : {}),
    accessType: input.accessType ?? 'internal',
    isEnabled: true,
    expiresAt: expiresAt, // null 또는 number(ms)
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return shareId;
};

/** 활성/비활성 토글. */
export const setShareEnabled = async (id: string, enabled: boolean): Promise<void> => {
  await updateDoc(docRef('shares', id), { isEnabled: enabled, updatedAt: serverTimestamp() });
};

/** 프로젝트의 공유 링크 실시간 구독 (createdAt 내림차순). */
export const subscribeProjectShares = (
  projectId: string,
  callback: (shares: ShareRecord[]) => void,
): Unsubscribe =>
  onSnapshot(query(col('shares'), where('projectId', '==', projectId)), (snap) => {
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ShareRecord)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    callback(data);
  });

/** 만료/비활성 여부 판정 (현재 활성인가). */
export const isShareActive = (share: ShareRecord): boolean => {
  if (!share.isEnabled) return false;
  const exp = share.expiresAt;
  if (exp === null || exp === undefined) return true;
  return getTime(exp) > nowMs();
};

/** share → 이동할 내부 딥링크 해시. */
export const resolveShareHash = (share: ShareRecord): string => {
  switch (share.targetType) {
    case 'document':
      return share.targetId ? shareHash.document(share.projectId, share.targetId) : shareHash.documents(share.projectId);
    case 'screen':
      return share.targetId ? shareHash.screen(share.targetId) : shareHash.project(share.projectId);
    case 'handoff_package':
      return shareHash.documents(share.projectId); // 패키지는 문서 탭에서 생성 → 문서 탭으로
    case 'project':
    default:
      return shareHash.project(share.projectId);
  }
};
