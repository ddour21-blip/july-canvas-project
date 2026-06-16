// 화면 단위 PDF 인쇄(브라우저 print) 내보내기
import type { Annotation, Project, Screen } from '@/types';
import { getDoc } from 'firebase/firestore';
import { docRef } from '@/lib/firestore';
import { hashCode, showToast } from '@/lib/utils';

export const exportScreenPdf = async (
  project: Project,
  screen: Screen,
  annotations: Annotation[],
) => {
  showToast('PDF 인쇄 창을 준비 중입니다...', 'success');
  let html = `
    <html><head><title>${project.name} 기획서</title>
    <style>
      body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 20px; color: #333; margin: 0; }
      .page { page-break-after: always; margin-bottom: 40px; }
      .header { border-bottom: 3px solid #ef4444; padding-bottom: 10px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
      .content { display: flex; gap: 30px; align-items: flex-start; }
      .img-container { flex: 0 0 45%; position: relative; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
      .img-container img { width: 100%; height: auto; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: block; }
      .marker { position: absolute; width: 24px; height: 24px; background: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; transform: translate(-50%, -50%); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
      .table-container { flex: 1; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
      th { background: #64748b; color: white; text-align: center; }
      .num { font-weight: bold; text-align: center; width: 40px; }
      .title { font-weight: bold; font-size: 14px; margin-bottom: 6px; display: block; color: #0f172a; }
      .desc { line-height: 1.6; color: #475569; white-space: pre-wrap; }
    </style></head><body>
  `;

  const grouped = annotations.reduce<Record<string, Annotation[]>>((acc, ann) => {
    const ctx = ann.pageContext || 'default';
    (acc[ctx] ||= []).push(ann);
    return acc;
  }, {});

  for (const [ctx, groupAnnotations] of Object.entries(grouped)) {
    groupAnnotations.sort((a, b) => (a.absoluteY ?? a.y) - (b.absoluteY ?? b.y));
    const pageHash = hashCode(ctx);
    const imageDocId = `${screen.id}_${pageHash}`;
    let imgData: string | null = null;
    let imgW = 1280;
    let imgH = 850;

    try {
      const imgSnap = await getDoc(docRef('screen_images', imageDocId));
      if (imgSnap.exists()) {
        const d = imgSnap.data() as { data: string; width?: number; height?: number };
        imgData = d.data;
        imgW = d.width || 1280;
        imgH = d.height || 850;
      }
    } catch {
      /* noop */
    }

    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.max(1, Math.ceil(groupAnnotations.length / ITEMS_PER_PAGE));

    for (let p = 0; p < totalPages; p++) {
      const chunk = groupAnnotations.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
      html += `<div class="page">
          <div class="header"><h1>${project.name} - ${screen.name} 기획서</h1></div>
          <div class="content">
              <div class="img-container">`;

      if (imgData) {
        html += `<img src="${imgData}" style="position: relative; z-index: 1;" />`;
        chunk.forEach((ann, chunkIdx) => {
          const globalIdx = p * ITEMS_PER_PAGE + chunkIdx;
          const absX = ann.absoluteX ?? ann.x;
          const absY = ann.absoluteY ?? ann.y;
          const percentX = (absX / imgW) * 100;
          const percentY = (absY / imgH) * 100;
          html += `<div class="marker" style="left: ${percentX}%; top: ${percentY}%; z-index: 2;">${globalIdx + 1}</div>`;
        });
      } else {
        html += `<div style="padding: 100px 20px; text-align: center; color: #94a3b8; background: #f1f5f9;">화면 캡처 데이터 없음</div>`;
      }

      html += `</div><div class="table-container"><table>
          <thead><tr><th>No.</th><th>Description</th></tr></thead><tbody>`;

      if (chunk.length > 0) {
        chunk.forEach((ann, chunkIdx) => {
          const globalIdx = p * ITEMS_PER_PAGE + chunkIdx;
          const cleanDesc = ann.description
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(
              /`(.*?)`/g,
              '<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;color:#2563eb;">$1</code>',
            )
            .replace(/\[(.*?)\]\(.*?\)/g, '<span style="color:#2563eb;text-decoration:underline;">$1</span>');
          html += `<tr>
              <td class="num">${globalIdx + 1}</td>
              <td><span class="title">[${ann.title}]</span><div class="desc">${cleanDesc}</div></td>
          </tr>`;
        });
      } else {
        html += `<tr><td colspan="2" style="text-align: center; padding: 40px; color: #94a3b8;">현재 화면 상태에 해당하는 정책이 없습니다.</td></tr>`;
      }

      html += `</tbody></table></div></div></div>`;
    }
  }
  html += `</body></html>`;

  const printWin = window.open('', '', 'width=1200,height=800');
  if (!printWin) {
    showToast('팝업이 차단되었습니다. 팝업을 허용해주세요.', 'error');
    return;
  }
  printWin.document.write(html);
  printWin.document.close();
  setTimeout(() => {
    printWin.focus();
    printWin.print();
  }, 1000);
};
