// 경량 마크다운 → HTML 렌더러 (dangerouslySetInnerHTML 용)
// 굵게, 인라인 코드, 링크, @멘션을 지원합니다.

export const renderMarkdown = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 text-[13px] font-mono border border-gray-200">$1</code>',
    )
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" class="text-blue-500 hover:underline hover:text-blue-700 font-bold">$1</a>',
    )
    .replace(
      /@([^\s]+)/g,
      '<span class="text-blue-600 font-bold bg-blue-50 px-1 rounded">@$1</span>',
    );
};
