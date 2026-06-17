// 프로젝트 관련 공용 로직
import { getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { col, docRef } from './firestore';
import { deleteSourceStorageFile } from './projectSources';
import type { ProjectSource } from '@/types';

/**
 * 프로젝트와 하위 데이터를 일괄 삭제 (orphan 방지).
 * - projects 문서
 * - screens (projectId 일치) — 레거시 annotation.comments는 screen 내부 배열이라 함께 삭제됨
 * - documents (projectId 일치)
 * - projectMembers (projectId 일치)
 * - comments (projectId 일치) — 별도 컬렉션 분리(5단계) 후 포함
 * - projectSources (projectId 일치) — 요구사항/RFP 입력 소스 메타(S2) + Storage 파일(S3).
 *
 * Storage 파일 삭제는 best-effort다. 실패해도 console.warn 후 Firestore 메타 삭제를 계속 진행한다
 * (프로젝트 삭제를 막지 않음 — orphan Storage 파일은 후속 정리/수명주기 규칙으로 처리 가능).
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(docRef('projects', projectId));

  // projectSources: Storage 파일을 먼저 best-effort 삭제한 뒤 메타를 배치에 포함.
  const sourcesSnap = await getDocs(query(col('projectSources'), where('projectId', '==', projectId)));
  await Promise.all(
    sourcesSnap.docs.map(async (d) => {
      const path = (d.data() as ProjectSource).storagePath;
      if (path) {
        try {
          await deleteSourceStorageFile(path);
        } catch (err) {
          console.warn(`[deleteProjectCascade] Storage 파일 삭제 실패(메타 삭제는 계속): ${path}`, err);
        }
      }
      batch.delete(d.ref);
    }),
  );

  for (const name of ['screens', 'documents', 'projectMembers', 'comments'] as const) {
    const snap = await getDocs(query(col(name), where('projectId', '==', projectId)));
    snap.forEach((d) => batch.delete(d.ref));
  }

  await batch.commit();
}
