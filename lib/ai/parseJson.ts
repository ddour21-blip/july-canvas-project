// Claude CLI stdout에서 JSON 객체를 견고하게 추출/파싱한다 (서버 전용).
// CLI 출력에 코드펜스나 부가 텍스트가 섞일 수 있으므로 첫 '{' ~ 마지막 '}' 구간을 파싱한다.

/** raw 텍스트에서 최상위 JSON 객체를 추출해 파싱한다. 실패 시 throw. */
export function extractJsonObject(raw: string): unknown {
  if (!raw || !raw.trim()) throw new Error('empty output');
  let s = raw.trim();

  // ```json ... ``` 또는 ``` ... ``` 코드펜스가 있으면 내부만 취한다.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim()) s = fence[1].trim();

  // 첫 '{' ~ 마지막 '}' 구간으로 슬라이스(앞뒤 설명문 제거).
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('no JSON object found');
  }
  return JSON.parse(s.slice(start, end + 1));
}
