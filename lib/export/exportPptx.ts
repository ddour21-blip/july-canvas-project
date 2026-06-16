// 화면 단위 PPTX 기획서 내보내기 (pptxgenjs + html2canvas)
import type { Annotation, Project, Screen } from '@/types';
import { getDoc } from 'firebase/firestore';
import { docRef } from '@/lib/firestore';
import { hashCode, showToast } from '@/lib/utils';

export const exportScreenPptx = async (
  project: Project,
  screen: Screen,
  annotations: Annotation[],
  iframeEl?: HTMLIFrameElement | null,
) => {
  try {
    showToast('PPTX 기획서를 생성 중입니다. 잠시만 기다려주세요...', 'success');

    const [{ default: html2canvas }, { default: PptxGenJS }] = await Promise.all([
      import('html2canvas'),
      import('pptxgenjs'),
    ]);

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

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

      if (!imgData && iframeEl?.contentDocument?.body) {
        const body = iframeEl.contentDocument.body;
        const htmlEl = iframeEl.contentDocument.documentElement;
        imgW = Math.max(body.scrollWidth, body.offsetWidth, htmlEl.clientWidth, htmlEl.scrollWidth, htmlEl.offsetWidth);
        imgH = Math.max(body.scrollHeight, body.offsetHeight, htmlEl.clientHeight, htmlEl.scrollHeight, htmlEl.offsetHeight);
        const canvas = await html2canvas(body, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f8fafc',
          width: imgW,
          height: imgH,
          windowWidth: imgW,
          windowHeight: imgH,
          logging: false,
          scale: 1,
        });
        let destCanvas = canvas;
        if (canvas.width > 1200) {
          destCanvas = document.createElement('canvas');
          const ratio = canvas.height / canvas.width;
          destCanvas.width = 1200;
          destCanvas.height = 1200 * ratio;
          destCanvas.getContext('2d')?.drawImage(canvas, 0, 0, destCanvas.width, destCanvas.height);
        }
        imgData = destCanvas.toDataURL('image/jpeg', 0.7);
      }

      const maxImgW = 4.8;
      const maxImgH = 4.2;
      const imgX = 0.4;
      const imgY = 1.0;
      let drawW = maxImgW;
      let drawH = maxImgH;
      let drawX = imgX;
      let drawY = imgY;

      if (imgData) {
        const imgRatio = imgW / imgH;
        const boxRatio = maxImgW / maxImgH;
        if (imgRatio > boxRatio) {
          drawW = maxImgW;
          drawH = maxImgW / imgRatio;
          drawY = imgY + (maxImgH - drawH) / 2;
        } else {
          drawH = maxImgH;
          drawW = maxImgH * imgRatio;
          drawX = imgX + (maxImgW - drawW) / 2;
        }
      }

      const ITEMS_PER_PAGE = 4;
      const totalPages = Math.max(1, Math.ceil(groupAnnotations.length / ITEMS_PER_PAGE));

      for (let p = 0; p < totalPages; p++) {
        const slide = pres.addSlide();
        slide.addText(`${project.name} - ${screen.name} 기획서`, {
          x: 0.4,
          y: 0.3,
          w: 9.2,
          h: 0.5,
          fontSize: 22,
          bold: true,
          color: '1e293b',
        });

        const chunk = groupAnnotations.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);

        if (imgData) {
          slide.addImage({ data: imgData, x: drawX, y: drawY, w: drawW, h: drawH });
          chunk.forEach((ann, chunkIdx) => {
            const globalIdx = p * ITEMS_PER_PAGE + chunkIdx;
            const displayNum = String(globalIdx + 1);
            const absX = ann.absoluteX ?? ann.x;
            const absY = ann.absoluteY ?? ann.y;
            const markerX = drawX + (absX / imgW) * drawW;
            const markerY = drawY + (absY / imgH) * drawH;
            const size = 0.25;
            slide.addShape(pres.ShapeType.ellipse, {
              x: markerX - size / 2,
              y: markerY - size / 2,
              w: size,
              h: size,
              fill: { color: 'ef4444' },
              line: { color: 'ffffff', width: 1.5 },
              shadow: { type: 'outer', opacity: 0.3, blur: 3, offset: 2, angle: 45, color: '000000' },
            });
            slide.addText(displayNum, {
              x: markerX - size / 2,
              y: markerY - size / 2,
              w: size,
              h: size,
              align: 'center',
              valign: 'middle',
              color: 'ffffff',
              fontSize: 11,
              bold: true,
              margin: 0,
            });
          });
        } else {
          slide.addShape(pres.ShapeType.rect, { x: 0.4, y: 1.0, w: 4.8, h: 4.2, fill: { color: 'f1f5f9' } });
          slide.addText('화면 캡처 데이터 없음', {
            x: 0.4,
            y: 1.0,
            w: 4.8,
            h: 4.2,
            color: '94a3b8',
            align: 'center',
            valign: 'middle',
          });
        }

        if (chunk.length > 0) {
          const tableHeader = [
            { text: 'No.', options: { fill: { color: '64748b' }, color: 'ffffff', bold: true, align: 'center' as const, valign: 'middle' as const, margin: 4 } },
            { text: 'Description', options: { fill: { color: '64748b' }, color: 'ffffff', bold: true, align: 'center' as const, valign: 'middle' as const, margin: 4 } },
          ];
          const tableRows = chunk.map((ann, chunkIdx) => {
            const globalIdx = p * ITEMS_PER_PAGE + chunkIdx;
            const cleanDesc = ann.description
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/`(.*?)`/g, '$1')
              .replace(/\[(.*?)\]\(.*?\)/g, '$1');
            return [
              { text: String(globalIdx + 1), options: { align: 'center' as const, valign: 'top' as const, bold: true, color: '1e293b', margin: 4 } },
              { text: `[${ann.title}]\n\n${cleanDesc}`, options: { valign: 'top' as const, color: '475569', margin: 4 } },
            ];
          });
          slide.addTable([tableHeader, ...tableRows], {
            x: 5.4,
            y: 1.0,
            w: 4.2,
            colW: [0.4, 3.8],
            border: { type: 'solid', color: 'cbd5e1', pt: 1 },
            fontSize: 10,
            valign: 'top',
          });
        }
      }
    }

    if (Object.keys(grouped).length === 0) {
      const slide = pres.addSlide();
      slide.addText(`${project.name} - ${screen.name} 기획서`, { x: 0.4, y: 0.3, w: 9.2, h: 0.5, fontSize: 22, bold: true, color: '1e293b' });
      slide.addText('작성된 정책이 없습니다.', { x: 0.4, y: 2.0, w: 9.2, align: 'center', color: '94a3b8' });
    }

    await pres.writeFile({ fileName: `JulyCanvas_${project.name}_${screen.name}_기획서.pptx` });
    showToast('PPTX 기획서 다운로드가 완료되었습니다.', 'success');
  } catch (error) {
    console.error('PPTX Export Error:', error);
    showToast('기획서 생성 중 오류가 발생했습니다.', 'error');
  }
};
