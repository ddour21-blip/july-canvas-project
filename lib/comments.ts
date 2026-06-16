// 댓글(comments) 컬렉션 로직 + 레거시(annotation.comments) 자동 마이그레이션
import { addDoc, deleteDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { col, docRef } from './firestore';
import { getTime, nowMs } from './utils';
import type { CommentDoc, CommentMention, Member, Screen } from '@/types';

export interface CommentAuthor {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface CreateCommentInput {
  projectId: string;
  screenId?: string;
  annotationId?: string;
  documentId?: string;
  parentCommentId?: string | null;
  body: string;
  author: CommentAuthor;
  mentions?: CommentMention[];
  source?: CommentDoc['source'];
}

/** 본문에서 @멘션 파싱 → 전역 멤버와 매칭 */
export const parseMentions = (body: string, members: Member[]): CommentMention[] => {
  const result: CommentMention[] = [];
  body.split(/\s/).forEach((w) => {
    if (!w.startsWith('@')) return;
    const nick = w.slice(1);
    const member = members.find((m) => m.nickname === nick);
    if (member && !result.some((r) => r.name === member.nickname)) {
      result.push({ name: member.nickname, email: member.email ?? undefined });
    }
  });
  return result;
};

/** 특정 화면의 댓글 실시간 구독 (status !== deleted, createdAt 오름차순) */
export const subscribeScreenComments = (
  screenId: string,
  callback: (comments: CommentDoc[]) => void,
): Unsubscribe => {
  return onSnapshot(query(col('comments'), where('screenId', '==', screenId)), (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CommentDoc[];
    callback(
      data
        .filter((c) => c.status !== 'deleted')
        .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt)),
    );
  });
};

/** 신규 댓글/답글 생성 (comments 컬렉션) — screens 문서를 건드리지 않음 */
export const createComment = async (input: CreateCommentInput): Promise<string> => {
  const ref = await addDoc(col('comments'), {
    organizationId: null,
    projectId: input.projectId,
    screenId: input.screenId ?? null,
    annotationId: input.annotationId ?? null,
    documentId: input.documentId ?? null,
    parentCommentId: input.parentCommentId ?? null,
    body: input.body,
    authorUid: input.author.uid,
    authorEmail: input.author.email ?? null,
    authorName: input.author.displayName ?? null,
    authorPhotoURL: input.author.photoURL ?? null,
    mentions: input.mentions ?? [],
    status: 'active',
    source: input.source ?? 'annotation',
    migratedFrom: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const createReply = (input: CreateCommentInput & { parentCommentId: string }) => createComment(input);

export const updateComment = (commentId: string, body: string) =>
  updateDoc(docRef('comments', commentId), { body, updatedAt: serverTimestamp() });

/** soft delete */
export const softDeleteComment = (commentId: string) =>
  updateDoc(docRef('comments', commentId), { status: 'deleted', updatedAt: serverTimestamp() });

/** hard delete (작성자/owner) */
export const deleteComment = (commentId: string) => deleteDoc(docRef('comments', commentId));

/** 레거시 댓글의 결정적 문서 ID (중복 마이그레이션 방지) */
export const legacyCommentDocId = (screenId: string, annotationId: string, legacyId: string): string =>
  `legacy_${screenId}_${annotationId}_${legacyId}`;

/**
 * 특정 화면의 annotation.comments(+replies)를 comments 컬렉션으로 마이그레이션.
 * - 결정적 ID로 setDoc → 중복 실행 안전(idempotent)
 * - existingIds에 이미 있으면 건너뜀(쓰기 최소화)
 * - 기존 annotation.comments는 삭제하지 않음
 * 반환: 새로 마이그레이션한 문서 수
 */
export const migrateScreenComments = async (
  screen: Screen,
  existingIds: Set<string>,
): Promise<number> => {
  const ann = screen.annotations || [];
  let migrated = 0;
  for (const a of ann) {
    const comments = a.comments || [];
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const parentId = legacyCommentDocId(screen.id, a.id, c.id);
      if (!existingIds.has(parentId)) {
        await setDoc(docRef('comments', parentId), {
          organizationId: null,
          projectId: screen.projectId,
          screenId: screen.id,
          annotationId: a.id,
          parentCommentId: null,
          body: c.text,
          authorUid: '',
          authorEmail: null,
          authorName: c.author ?? null,
          authorPhotoURL: null,
          mentions: [],
          status: 'active',
          source: 'annotation',
          migratedFrom: { screenId: screen.id, annotationId: a.id, legacyCommentIndex: i, legacyCommentId: c.id },
          createdAt: getTime(c.createdAt) || nowMs(),
          updatedAt: getTime(c.createdAt) || nowMs(),
        });
        migrated++;
      }
      // 답글
      const replies = c.replies || [];
      for (let j = 0; j < replies.length; j++) {
        const r = replies[j];
        const replyId = legacyCommentDocId(screen.id, a.id, r.id);
        if (existingIds.has(replyId)) continue;
        await setDoc(docRef('comments', replyId), {
          organizationId: null,
          projectId: screen.projectId,
          screenId: screen.id,
          annotationId: a.id,
          parentCommentId: parentId,
          body: r.text,
          authorUid: '',
          authorEmail: null,
          authorName: r.author ?? null,
          authorPhotoURL: null,
          mentions: [],
          status: 'active',
          source: 'annotation',
          migratedFrom: { screenId: screen.id, annotationId: a.id, legacyCommentIndex: j, legacyCommentId: r.id },
          createdAt: getTime(r.createdAt) || nowMs(),
          updatedAt: getTime(r.createdAt) || nowMs(),
        });
        migrated++;
      }
    }
  }
  return migrated;
};
