// 공용 유틸리티
import type { FirestoreTime } from '@/types';

/** 현재 시각(ms). Date.now 직접 호출에 대한 린트(purity) 경고를 피하고 시점 생성을 일원화합니다. */
export const nowMs = (): number => Date.now();

export const generateId = (): string => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
};

/** Firestore Timestamp / number / serverTimestamp 결과를 ms로 변환 */
export const getTime = (ts: FirestoreTime): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof (ts as { seconds?: number }).seconds === 'number') {
    return (ts as { seconds: number }).seconds * 1000;
  }
  return 0;
};

export const formatDateTime = (ts: FirestoreTime): string => {
  if (!ts) return '방금 전';
  const d = new Date(getTime(ts));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 전역 토스트 발행 */
export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

/** 문자열 해시 (페이지 컨텍스트 → 이미지 doc id 매핑용) */
export const hashCode = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

/** 클릭한 요소의 CSS selector 경로 추출 */
export const getCssSelector = (el: Element | null): string => {
  if (!el) return '';
  const path: string[] = [];
  let cur: Element | null = el;
  while (
    cur &&
    cur.nodeType === Node.ELEMENT_NODE &&
    cur.tagName.toLowerCase() !== 'html' &&
    cur.tagName.toLowerCase() !== 'body'
  ) {
    let selector = cur.tagName.toLowerCase();
    if (cur.id) {
      selector += '#' + cur.id;
      path.unshift(selector);
      break;
    }
    let sib: Element | null = cur;
    let nth = 1;
    while ((sib = sib.previousElementSibling)) {
      if (sib.tagName.toLowerCase() === selector) nth++;
    }
    selector += `:nth-of-type(${nth})`;
    path.unshift(selector);
    cur = cur.parentElement;
  }
  return path.join(' > ');
};

/** 화면 컨텍스트 지문 추출 (요소 수 + 본문 텍스트 기반) */
export const getPageContext = (doc: Document): string => {
  try {
    const elCount = doc.querySelectorAll('*').length;
    const text = (doc.body.innerText || doc.body.textContent || '')
      .replace(/\s+/g, '')
      .substring(0, 30);
    return `ctx_${elCount}_${text}`;
  } catch {
    return 'default';
  }
};

/** 클립보드 복사 (execCommand 폴백 포함) */
export const copyToClipboard = (text: string): boolean => {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};
