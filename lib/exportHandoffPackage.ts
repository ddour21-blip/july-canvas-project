// 개발 전달 패키지 파일 내보내기 (B9)
// 클라이언트에서만 동작: 현재 생성된 패키지 내용을 파일로 다운로드한다.
// Firestore/Storage 저장 없음. 개별 MD = Blob, 전체 = ZIP(jszip, 동적 import로 lazy 로드).
import { downloadTextFile } from './export/exportMarkdown';
import type { HandoffFile } from './handoffPackage';

const MD_MIME = 'text/markdown;charset=utf-8';

/** 파일명에 안전한 문자열로 변환 (한글 유지, 그 외 비허용 문자는 '-'로 치환). */
export const safeFileBase = (name: string): string =>
  (name || 'project')
    .trim()
    .replace(/[^\w가-힣.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project';

/** 개별 MD 다운로드 (순수 content, 파일 구분선 없음, UTF-8). */
export const downloadHandoffFile = (file: HandoffFile): void => {
  downloadTextFile(file.content, file.name, MD_MIME);
};

/** 4종 MD를 ZIP 한 파일로 다운로드. jszip은 클릭 시점에 동적 로드. */
export const downloadHandoffZip = async (projectName: string, files: HandoffFile[]): Promise<void> => {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.content)); // jszip은 문자열을 UTF-8로 저장
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileBase(projectName)}_development_handoff.zip`;
  a.click();
  URL.revokeObjectURL(url);
};
