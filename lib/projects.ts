// 프로젝트 관련 공용 로직
import { getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { col, docRef } from './firestore';

/**
 * 프로젝트와 하위 데이터를 일괄 삭제 (orphan 방지).
 * - projects 문서
 * - screens (projectId 일치) — 레거시 annotation.comments는 screen 내부 배열이라 함께 삭제됨
 * - documents (projectId 일치)
 * - projectMembers (projectId 일치)
 * - comments (projectId 일치) — 별도 컬렉션 분리(5단계) 후 포함
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(docRef('projects', projectId));

  for (const name of ['screens', 'documents', 'projectMembers', 'comments'] as const) {
    const snap = await getDocs(query(col(name), where('projectId', '==', projectId)));
    snap.forEach((d) => batch.delete(d.ref));
  }

  await batch.commit();
}
