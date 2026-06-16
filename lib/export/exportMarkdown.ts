// 화면 단위 Markdown 기획서 내보내기
import type { Annotation, Project, Screen } from '@/types';
import { showToast } from '@/lib/utils';

const groupByContext = (annotations: Annotation[]): Record<string, Annotation[]> =>
  annotations.reduce<Record<string, Annotation[]>>((acc, ann) => {
    const ctx = ann.pageContext || 'default';
    (acc[ctx] ||= []).push(ann);
    return acc;
  }, {});

export const exportScreenMarkdown = (
  project: Project,
  screen: Screen,
  annotations: Annotation[],
) => {
  let md = `# ${project.name} - ${screen.name} 기획서\n\n`;
  const grouped = groupByContext(annotations);

  let pageCount = 1;
  for (const groupAnnotations of Object.values(grouped)) {
    groupAnnotations.sort((a, b) => (a.absoluteY ?? a.y) - (b.absoluteY ?? b.y));
    md += `## 화면 상태 ${pageCount++}\n\n`;
    md += `| No. | 구분/요소명 | 상세 정책 |\n|---|---|---|\n`;
    groupAnnotations.forEach((ann, idx) => {
      const cleanDesc = ann.description.replace(/\n/g, '<br>');
      md += `| ${idx + 1} | **${ann.title}** | ${cleanDesc} |\n`;
    });
    md += `\n\n`;
  }

  downloadTextFile(md, `JulyCanvas_${project.name}_${screen.name}_기획서.md`, 'text/markdown');
  showToast('Markdown 기획서가 다운로드 되었습니다.');
};

/** 임의 텍스트(마크다운 등)를 파일로 다운로드 */
export const downloadTextFile = (
  content: string,
  filename: string,
  mime = 'text/markdown',
) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
