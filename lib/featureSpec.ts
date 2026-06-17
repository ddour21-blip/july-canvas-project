// 확정 프로토타입 + IA 기반 기능정의서(FEATURE_SPEC) 초안 역작성 (B6)
// 핵심 정책: 기능정의서는 아이디어만으로 생성하지 않는다. 확정 프로토타입(코드/화면/플로우)과 IA를 기준으로 역작성한다.
//
// AI/실행 없음. screen.code는 정적 문자열/패턴 기반으로만 추출(React 실행·AST 파싱·iframe 변경 없음).
// 외부 URL(source)은 fetch/크롤링하지 않는다(URL 분석 미수행 안내 포함).
import { resolveProjectMode } from './documents';
import { extractScreenHints, type IaTarget } from './informationArchitecture';
import type { PrototypeLock, Project, ProjectActivation, ProjectSource, Screen } from '@/types';

const f = (s: string | undefined, placeholder: string): string => (s && s.trim() ? s.trim() : `_(${placeholder})_`);
const dedupe = (arr: string[]): string[] => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

/** 기능정의서용 추가 정적 추출 (IA 힌트 + 입력/액션/상태). 모두 "추정". */
const extractFeatureHints = (code: string) => {
  const base = extractScreenHints(code);
  const c = code || '';
  const inputs = dedupe([...c.matchAll(/placeholder="([^"]{1,30})"/gi)].map((m) => m[1])).slice(0, 12);
  const hasInputEls = /<input|<select|<textarea/i.test(c);
  const actions: string[] = [];
  const actMap: Array<[RegExp, string]> = [
    [/저장|save/i, '저장'], [/수정|edit|update/i, '수정'], [/삭제|delete|remove/i, '삭제'],
    [/생성|등록|create|add|new/i, '생성/등록'], [/제출|submit|예약|신청|구매|결제/i, '제출/전송'],
    [/검색|search|filter|필터/i, '검색/필터'], [/로그인|login|sign-?in/i, '로그인'],
  ];
  actMap.forEach(([re, label]) => { if (re.test(c)) actions.push(label); });
  const states: string[] = [];
  if (/empty|비어|없습니다|no data/i.test(c)) states.push('빈 상태');
  if (/loading|로딩|spinner|skeleton/i.test(c)) states.push('로딩 상태');
  if (/error|에러|오류|실패/i.test(c)) states.push('에러 상태');
  return { ...base, inputs, hasInputEls, actions: dedupe(actions), states: dedupe(states) };
};

const commonBody = (
  project: Project,
  a: ProjectActivation,
  mode: 'idea_productization' | 'requirement_planning',
  basis: { title: string; type: string; iaRef: string; note: string; generatedAt: string },
  screenBlock: string,
): string => {
  const scopeSummary = mode === 'requirement_planning'
    ? `요구사항/RFP를 개발 전달 관점으로 정의합니다. 사용자 앱/관리자/플랫폼 기능을 구분하고 권한·상태·예외를 명시합니다.\n- 1차 범위(MVP): ${f(a.mvpScope, '미입력')}`
    : `시장 검증용 MVP 기준으로 핵심 가치 검증 기능과 CTA(문의/신청/구매) 흐름을 정의합니다.\n- 핵심 가치: ${f(a.value, '미입력')} / MVP: ${f(a.mvpScope, '미입력')}`;
  const roleRows = mode === 'requirement_planning'
    ? `| 일반 사용자 | 앱 핵심 기능 | 관리 기능 불가 | _(추정)_ |\n| 관리자 | 운영/관리 화면 | _(권한 범위 확인 필요)_ | _(추정)_ |`
    : `| 방문자 | 공개 화면 열람 | 핵심 기능 제한 | _(검증 단계)_ |\n| 사용자 | 핵심 기능/CTA | _(확인 필요)_ | _(추정)_ |`;
  const permPolicy = mode === 'requirement_planning'
    ? '- 사용자/관리자 권한 분리, 관리자 전용 화면·동작 보호, 역할별 노출 차이 _(확인 필요)_'
    : '- 검증 단계: 단순 권한(방문자/사용자). 정식 권한은 확정 후 정의 _(확인 필요)_';
  const adminFeat = mode === 'requirement_planning'
    ? '- 관리자: 데이터/회원/콘텐츠 관리, 목록·상세·운영 화면 _(확인 필요)_'
    : '- 검증 단계에서는 수동 운영 가능 영역으로 대체 가능 _(확인 필요)_';
  const qaCriteria = mode === 'requirement_planning'
    ? '- 사용자 앱/관리자 주요 플로우 통과, 권한별 접근 제한, 빈/로딩/에러 상태, 반응형'
    : '- 핵심 가치 전달, CTA 동작, 핵심 사용 흐름 1~3개 검증';

  return `# 기능정의서

## 1. 작성 기준
- 기준 프로토타입: ${basis.title}
- 기준 유형: ${basis.type}
- 참조 IA 문서: ${basis.iaRef}
- 생성 일시: ${basis.generatedAt}
- 주의사항: ${basis.note}

## 2. 기능 범위 요약
${scopeSummary}

## 3. 사용자 역할 및 권한
| 역할 | 접근 가능 기능 | 제한 사항 | 비고 |
|---|---|---|---|
${roleRows}

## 4. 화면별 기능 정의
${screenBlock}

## 5. 공통 기능
- 내비게이션 / 로그인 상태 처리 / 공통 레이아웃 _(확인 필요)_

## 6. 데이터 저장/조회 기준
- 주요 엔티티/필드와 저장·조회 방식 _(프로토타입 코드만으로는 단정 불가 — 확인 필요)_

## 7. 권한 정책
${permPolicy}

## 8. Empty / Loading / Error 상태
- 빈 상태 / 로딩 / 에러 처리 기준 _(확인 필요)_

## 9. 관리자/운영 기능
${adminFeat}

## 10. 알림/이메일/외부 연동 후보
- 후속 단계 후보(이번 단계 미구현): 멘션/승인/QA 결과 알림 등 _(확인 필요)_

## 11. QA 검증 기준
${qaCriteria}

## 12. 개발 시 주의사항
- React 코드는 실행/AST 파싱하지 않고 정적 추정만 반영됨 → 실제 동작·상태·예외는 확정 프로토타입에서 확인 필요.

## 13. 확인 필요 항목
- 정확한 버튼 동작/조건, 입력 검증 규칙, 상태 전이, 예외 처리, 데이터 모델, 권한 경계

## 14. 다음 단계
- 이 기능정의서를 검토한 뒤 PRD 및 개발 전달용 문서 패키지로 조립합니다.
`;
};

/** screen 확정 기반 기능정의서 */
const buildFromScreen = (project: Project, screen: Screen, iaRef: string, generatedAt: string): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const mode = resolveProjectMode(a);
  const h = extractFeatureHints(screen.code);
  const annCount = screen.annotations?.length ?? 0;

  const fnRows = h.actions.length
    ? h.actions.map((act) => `| ${act} | _(추정)_ | 사용자 액션 | _(확인 필요)_ | 코드 키워드 기반 |`).join('\n')
    : '| _(확인 필요)_ | | | | |';
  const btnRows = h.buttons.length
    ? h.buttons.map((b) => `| ${b} | _(추정)_ | _(확인 필요)_ | _(확인 필요)_ | 추정 |`).join('\n')
    : '| _(확인 필요)_ | | | | |';
  const inputRows = h.inputs.length
    ? h.inputs.map((i) => `| ${i} | _(추정)_ | _(확인 필요)_ | _(확인 필요)_ | placeholder 기반 |`).join('\n')
    : (h.hasInputEls ? '| _(입력 요소 있음 — 필드명 확인 필요)_ | | | | |' : '| _(입력 없음/확인 필요)_ | | | | |');
  const stateRows = h.states.length
    ? h.states.map((s) => `| ${s} | _(추정)_ | _(확인 필요)_ | _(확인 필요)_ |`).join('\n')
    : '| _(확인 필요)_ | | | |';

  const screenBlock = `### 4.1 ${screen.name}

#### 화면 목적
_(추정 — IA/프로토타입 기준 보완 필요)_

#### 진입 경로
_(확인 필요)_

#### 주요 기능
| 기능명 | 목적 | 사용자 액션 | 결과 | 비고 |
|---|---|---|---|---|
${fnRows}

#### 버튼 / CTA
| 버튼명 | 동작 | 조건 | 결과 | 비고 |
|---|---|---|---|---|
${btnRows}

#### 입력값
| 필드명 | 유형 | 필수 여부 | 검증 조건 | 비고 |
|---|---|---|---|---|
${inputRows}

#### 상태값
| 상태 | 설명 | 표시 조건 | 후속 액션 |
|---|---|---|---|
${stateRows}

#### 예외 처리
| 상황 | 처리 방식 | 사용자 안내 |
|---|---|---|
| _(확인 필요)_ | | |

> 화면 구조 힌트: ${h.structure.length ? h.structure.join(', ') : '없음'} / 역할 힌트: ${h.roles.length ? h.roles.join(', ') : '없음'} / 정책 주석 ${annCount}개 _(모두 추정, ScreenEditor에서 확인)_

---`;

  return commonBody(project, a, mode, {
    title: screen.name,
    type: '화면(코드) 프로토타입',
    iaRef,
    note: '코드 정적 분석 기반 초안 — 정확하지 않은 항목은 "추정"/"확인 필요"로 표시됨. React 코드는 실행/파싱하지 않음.',
    generatedAt,
  }, screenBlock);
};

/** source(URL) 확정 기반 기능정의서 — URL 분석 미수행 */
const buildFromSource = (project: Project, source: ProjectSource, iaRef: string, generatedAt: string): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const mode = resolveProjectMode(a);
  const screenBlock = `### 4.1 ${source.title || source.url || '외부 프로토타입'}

> 외부 URL 프로토타입은 아직 코드 분석을 수행하지 않았습니다. 실제 버튼, 입력값, 상태값, 예외 처리는 URL 확인 후 보완이 필요합니다.

#### 화면 목적
- 프로토타입 URL: ${f(source.url, '미입력')}
- 설명: ${f(source.description, '없음')}

#### 주요 기능 / 버튼 / 입력값 / 상태값 / 예외 처리
_(URL 확인 후 보완 — 코드 미분석)_

---`;
  return commonBody(project, a, mode, {
    title: source.title || source.url || '외부 프로토타입',
    type: 'URL 프로토타입',
    iaRef,
    note: '외부 URL은 코드 분석 미수행 — 버튼·입력·상태·예외는 URL 확인 후 보완 필요.',
    generatedAt,
  }, screenBlock);
};

/** 확정 프로토타입(lock) + IA 기준 기능정의서 초안 markdown 생성. */
export const buildFeatureSpec = (
  project: Project,
  lock: PrototypeLock,
  target: IaTarget,
  iaRef: string,
  generatedAt: string,
): string =>
  target.kind === 'screen'
    ? buildFromScreen(project, target.screen, iaRef, generatedAt)
    : buildFromSource(project, target.source, iaRef, generatedAt);
