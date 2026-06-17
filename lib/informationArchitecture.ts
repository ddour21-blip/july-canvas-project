// 확정 프로토타입 기반 IA(정보 구조도) 초안 생성 (B5)
// 핵심 정책: IA는 아이디어만으로 생성하지 않는다. 확정된 프로토타입(project.prototypeLock)을 기준으로 역작성한다.
//
// AI/실행 없음. screen.code는 "정적 문자열/패턴" 기반으로만 힌트를 추출한다(React 실행·파싱·iframe 변경 없음).
// 외부 URL(source)은 fetch/크롤링하지 않는다(URL 분석 미수행 안내 포함).
import { resolveProjectMode } from './documents';
import type { PrototypeLock, Project, ProjectActivation, ProjectSource, Screen } from '@/types';

const f = (s: string | undefined, placeholder: string): string => (s && s.trim() ? s.trim() : `_(${placeholder})_`);
const dedupe = (arr: string[]): string[] => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

/** screen.code 정적 분석 (실행/파싱 없음, 문자열 패턴만). 부정확할 수 있어 모두 "추정"으로 표시. */
export interface ScreenHints {
  structure: string[];
  buttons: string[];
  headings: string[];
  roles: string[];
}

export const extractScreenHints = (code: string): ScreenHints => {
  const c = code || '';
  const lc = c.toLowerCase();
  const has = (re: RegExp) => re.test(lc);
  const structure: string[] = [];
  if (has(/<nav|navbar|sidebar|side-bar/)) structure.push('내비게이션/사이드바');
  if (has(/<header|app-bar|appbar|topbar/)) structure.push('헤더/상단바');
  if (has(/<footer/)) structure.push('푸터');
  if (has(/role="tab"|\btab\b|tablist/)) structure.push('탭');
  if (has(/<nav|menu|<ul|drawer/)) structure.push('메뉴');
  if (has(/<form|<input|<select|<textarea|placeholder=/)) structure.push('폼/입력');
  if (has(/<table|role="grid"|data-grid|<li|list/)) structure.push('목록/테이블');
  if (has(/modal|dialog|popup|overlay/)) structure.push('모달/다이얼로그');
  if (has(/login|sign-?in|로그인|회원가입|sign-?up/)) structure.push('로그인/회원가입');
  if (has(/card|<section/)) structure.push('카드/섹션');

  // 버튼/CTA·링크 텍스트 (실행 없이 텍스트만)
  const buttons = dedupe(
    [...c.matchAll(/<(?:button|a)\b[^>]*>([^<>{}]{1,30})<\/(?:button|a)>/gi)].map((m) => m[1]),
  ).slice(0, 12);
  // 화면 섹션 헤딩
  const headings = dedupe(
    [...c.matchAll(/<h[1-6]\b[^>]*>([^<>{}]{1,40})<\/h[1-6]>/gi)].map((m) => m[1]),
  ).slice(0, 12);

  const roles: string[] = [];
  if (/admin|관리자|운영|어드민/i.test(c)) roles.push('관리자/운영자');
  if (/user|사용자|회원|고객|member/i.test(c)) roles.push('일반 사용자');

  return { structure: dedupe(structure), buttons, headings, roles };
};

const list = (items: string[], emptyHint: string): string =>
  items.length ? items.map((i) => `- ${i} _(추정)_`).join('\n') : `_(${emptyHint})_`;

const roleSection = (mode: 'idea_productization' | 'requirement_planning', roles: string[]): string => {
  const main = mode === 'requirement_planning' ? '일반 사용자(앱 이용자)' : '방문자 / 핵심 고객';
  const admin = mode === 'requirement_planning'
    ? f(roles.includes('관리자/운영자') ? '관리자/운영자 화면 확인됨 _(추정)_' : '', '관리자 영역이 있으면 보완')
    : '_(검증 단계에서는 단순 유지 — 필요 시 보완)_';
  return `### 3.1 주요 사용자
- ${main}

### 3.2 관리자/운영자
${admin}

### 3.3 기타 역할
_(게스트/비로그인 등 — 확인 필요)_`;
};

const commonBody = (
  project: Project,
  a: ProjectActivation,
  mode: 'idea_productization' | 'requirement_planning',
  hints: ScreenHints | null,
  basis: { title: string; type: string; note: string; generatedAt: string },
  screenRow: string,
  confirmed: string,
  needConfirm: string,
): string => {
  const summary = mode === 'requirement_planning'
    ? `요구사항/RFP를 화면으로 검증한 프로토타입 기준. 사용자 앱과 관리자 영역을 구분해 개발 전달을 고려합니다.\n- 요구사항 요약: ${f(a.intent, '미입력')}`
    : `시장 검증용 프로토타입 기준. 핵심 가치 전달과 진입→체험→CTA 흐름을 강조합니다.\n- 서비스 요약: ${f(a.intent, '미입력')}`;
  const flow = mode === 'requirement_planning'
    ? '- 사용자 앱: 로그인/진입 → 핵심 기능 → 완료\n- 관리자: 로그인 → 관리 목록 → 상세/운영'
    : '- 진입(랜딩) → 핵심 가치/기능 체험 → CTA(문의/신청/구매)';
  const access = mode === 'requirement_planning'
    ? '- 일반 사용자: 앱 핵심 기능 접근\n- 관리자: 운영/관리 화면 접근 (권한별 노출 차이) _(확인 필요)_'
    : '- 방문자: 공개 화면\n- 사용자: 핵심 기능 _(검증 단계 단순 유지)_';
  const menu = hints && hints.structure.length
    ? list(hints.structure, '')
    : '_(프로토타입에서 메뉴/내비게이션 구조 확인 필요)_';

  return `# 정보 구조도 IA

## 1. 생성 기준
- 기준 프로토타입: ${basis.title}
- 기준 유형: ${basis.type}
- 생성 일시: ${basis.generatedAt}
- 주의사항: ${basis.note}

## 2. 서비스 구조 요약
${summary}

## 3. 사용자 역할
${roleSection(mode, hints?.roles ?? [])}

## 4. 화면 목록
| 화면 ID | 화면명 | 목적 | 주요 기능 | 비고 |
|---|---|---|---|---|
${screenRow}

## 5. 메뉴 구조
${menu}

## 6. 화면 간 이동 흐름
${flow}

## 7. 주요 사용자 시나리오
${mode === 'requirement_planning'
  ? '- 사용자: 로그인 → 핵심 기능 수행\n- 관리자: 데이터/회원/콘텐츠 관리'
  : `- 핵심 고객이 ${f(a.value, '핵심 가치')}를 확인하고 행동(문의/신청/구매)`}

## 8. 권한별 접근 구조
${access}

## 9. 프로토타입에서 확인된 정보
${confirmed}

## 10. 프로토타입에서 확인이 필요한 정보
${needConfirm}

## 11. 향후 확장 가능한 IA
- 후속 확장 범위: ${f(a.laterScope, '미입력')}

## 12. 다음 단계
- 기능정의서는 이 IA와 확정 프로토타입 코드를 기준으로 작성합니다.
`;
};

/** screen 확정 기반 IA */
const buildIaFromScreen = (project: Project, lock: PrototypeLock, screen: Screen, generatedAt: string): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const mode = resolveProjectMode(a);
  const hints = extractScreenHints(screen.code);
  const annCount = screen.annotations?.length ?? 0;

  const screenRow = `| ${screen.id.slice(0, 6)} | ${screen.name} | _(추정)_ | ${hints.buttons.length ? hints.buttons.slice(0, 4).join(', ') + ' 등 _(추정)_' : '_(확인 필요)_'} | 정책 주석 ${annCount}개 |`;

  const confirmed = [
    `- 화면명: ${screen.name}`,
    `- 화면 구조 힌트: ${hints.structure.length ? hints.structure.join(', ') : '명확한 구조 키워드 없음'} _(코드 정적 분석, 추정)_`,
    `- 버튼/CTA 텍스트: ${hints.buttons.length ? hints.buttons.join(', ') : '확인 안 됨'} _(추정)_`,
    `- 화면 섹션(헤딩): ${hints.headings.length ? hints.headings.join(', ') : '확인 안 됨'} _(추정)_`,
    `- 역할 힌트: ${hints.roles.length ? hints.roles.join(', ') : '확인 안 됨'} _(추정)_`,
    annCount ? `- 정책 주석 ${annCount}개가 등록되어 있습니다(ScreenEditor에서 확인).` : '- 등록된 정책 주석이 없습니다.',
  ].join('\n');

  const needConfirm = [
    '- 화면 간 정확한 이동/플로우 (코드만으로는 단정 불가)',
    '- 권한별 노출 차이 / 예외·빈/에러 상태',
    '- 정확한 데이터 모델·필드',
    '- 추가 화면(현재 1개 화면만 확정됨일 수 있음)',
  ].join('\n');

  return commonBody(project, a, mode, hints,
    { title: screen.name, type: '화면(코드) 프로토타입', note: '코드 정적 분석 기반 초안 — 정확하지 않은 항목은 "추정"으로 표시됨. React 코드는 실행/파싱하지 않음.', generatedAt },
    screenRow, confirmed, needConfirm);
};

/** source(URL) 확정 기반 IA — URL 분석 미수행 */
const buildIaFromSource = (project: Project, lock: PrototypeLock, source: ProjectSource, generatedAt: string): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const mode = resolveProjectMode(a);
  const screenRow = `| - | ${source.title || source.url || '외부 프로토타입'} | _(URL 확인 후 보완)_ | _(URL 확인 후 보완)_ | 외부 URL |`;
  const confirmed = [
    `- 프로토타입 이름: ${f(source.title, '미입력')}`,
    `- URL: ${f(source.url, '미입력')}`,
    `- 도구 유형: ${f(source.prototypeKind, '미지정')}`,
    `- 설명: ${f(source.description, '없음')}`,
  ].join('\n');
  const needConfirm = [
    '> 외부 URL 프로토타입은 아직 코드 분석을 수행하지 않았습니다. 실제 화면 구조는 URL 확인 후 보완이 필요합니다.',
    '- 화면 목록 / 메뉴 구조 / 이동 흐름',
    '- 역할별 접근 / 권한 구조',
    '- 데이터 모델·예외 상태',
  ].join('\n');

  return commonBody(project, a, mode, null,
    { title: source.title || source.url || '외부 프로토타입', type: 'URL 프로토타입', note: '외부 URL은 코드 분석 미수행 — 화면 구조는 URL 확인 후 보완 필요.', generatedAt },
    screenRow, confirmed, needConfirm);
};

export type IaTarget =
  | { kind: 'screen'; screen: Screen }
  | { kind: 'source'; source: ProjectSource };

/** 확정 프로토타입(lock) 기준 IA 초안 markdown 생성. */
export const buildInformationArchitecture = (
  project: Project,
  lock: PrototypeLock,
  target: IaTarget,
  generatedAt: string,
): string =>
  target.kind === 'screen'
    ? buildIaFromScreen(project, lock, target.screen, generatedAt)
    : buildIaFromSource(project, lock, target.source, generatedAt);
