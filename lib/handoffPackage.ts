// 개발 전달용 MD 문서 패키지 생성 (B7/B8)
// 기존 문서(brief/market/strategy/ia/feature_spec) + activation + 확정 프로토타입(lock) + 내부 딥링크를
// "조립"해 개발 전달용 MD 4종을 만든다. AI 없음. Firestore 저장 없음(로컬 생성 → 복사).
//
// 중요: 기존 PRD 조립 로직(generatePRD)·문서 content를 변경하지 않는다. 새 DocumentType/컬렉션 없음.
import { resolveProjectMode } from './documents';
import type { DocumentType, Project, ProjectActivation, ProjectDocument } from '@/types';

const MISSING = '_(아직 생성되지 않았습니다. 해당 문서를 먼저 생성하거나 수동으로 보완해주세요.)_';
const f = (s: string | undefined, placeholder: string): string => (s && s.trim() ? s.trim() : `_(${placeholder})_`);

/** 문서 content (없으면 fallback) */
const contentOf = (docs: ProjectDocument[], type: DocumentType): string | undefined =>
  docs.find((d) => d.type === type)?.content?.trim() || undefined;

/** content의 `## ` 헤딩만 요약 추출 */
const headingsOf = (content: string | undefined): string => {
  if (!content) return MISSING;
  const hs = (content.match(/^##\s+.+$/gm) || []).map((h) => `- ${h.replace(/^##\s+/, '')}`);
  return hs.length ? hs.join('\n') : '_(요약할 섹션이 없습니다)_';
};

export interface HandoffPrototype {
  name: string;
  type: 'screen' | 'source';
  link?: string; // 내부 딥링크(screen) 또는 외부 URL(source)
  url?: string; // 외부 URL (source)
}

export interface HandoffReadiness {
  brief: boolean;
  market: boolean;
  strategy: boolean;
  ia: boolean;
  featureSpec: boolean;
  prototype: boolean;
}

export interface HandoffFile {
  name: string;
  content: string;
}

export interface HandoffPackage {
  files: HandoffFile[];
  readiness: HandoffReadiness;
}

const prototypeBlock = (proto?: HandoffPrototype): string => {
  if (!proto) return '- 확정된 프로토타입이 없습니다. 기준 프로토타입을 확정한 뒤 다시 생성하세요.';
  const lines = [
    `- 기준 프로토타입: ${proto.name}`,
    `- 기준 유형: ${proto.type === 'screen' ? '화면(코드) 프로토타입' : 'URL 프로토타입'}`,
  ];
  if (proto.type === 'screen' && proto.link) lines.push(`- 내부 링크: ${proto.link}`);
  if (proto.url) lines.push(`- 외부 URL: ${proto.url}`);
  return lines.join('\n');
};

const FILE_NAMES = ['DEVELOPMENT_HANDOFF.md', 'PRD.md', 'USER_APP_UI_SPEC.md', 'ADMIN_UI_SPEC.md'];

export const buildHandoffPackage = (
  project: Project,
  documents: ProjectDocument[],
  opts: { prototype?: HandoffPrototype; generatedAt: string },
): HandoffPackage => {
  const a = project.activation ?? ({} as ProjectActivation);
  const mode = resolveProjectMode(a);
  const isReq = mode === 'requirement_planning';
  const brief = contentOf(documents, 'brief');
  const market = contentOf(documents, 'market_research');
  const strategy = contentOf(documents, 'product_strategy');
  const ia = contentOf(documents, 'ia');
  const featureSpec = contentOf(documents, 'feature_spec');
  const proto = opts.prototype;

  // 관리자 영역 존재 신호 (요구사항 모드 + 문서에 관리자 언급)
  const hasAdmin = isReq || /관리자|admin|어드민|운영/i.test(`${ia ?? ''}${featureSpec ?? ''}${a.market ?? ''}`);

  // ---- 1. DEVELOPMENT_HANDOFF.md ----
  const handoff = `# DEVELOPMENT_HANDOFF

> ${project.name} · 생성 ${opts.generatedAt} · 모드: ${isReq ? '요구사항/RFP 기반' : '아이디어 제품화'}

## 1. 문서 읽는 순서
1. DEVELOPMENT_HANDOFF.md (본 문서)
2. PRD.md
3. USER_APP_UI_SPEC.md
4. ADMIN_UI_SPEC.md${hasAdmin ? '' : ' (관리자 미정의 — 참고)'}

## 2. 프로젝트 개요
${f(a.intent, project.description || '개요 미입력')}

## 3. 최상위 기준 문서
- 제품/정책 기준: PRD.md
- 사용자 화면 기준: USER_APP_UI_SPEC.md
- 관리자 화면 기준: ADMIN_UI_SPEC.md
- 정보 구조: IA / 기능 상세: FEATURE_SPEC (확정 프로토타입 기반 역작성)

## 4. 구현 범위
${f(a.mvpScope, '1차 구현 범위 미입력')}

## 5. 제외 범위
${f(a.laterScope, '제외/후속 범위 미입력')}

## 6. 확정 프로토타입
${prototypeBlock(proto)}

## 7. 문서 우선순위
DEVELOPMENT_HANDOFF → PRD → USER_APP_UI_SPEC → ADMIN_UI_SPEC

## 8. 절대 수정 금지 / 주의 정책
- IA / 기능정의서는 **확정 프로토타입을 기준으로 역작성**된 문서입니다. 프로토타입과 어긋나게 임의 변경하지 마세요.
- 확정 프로토타입(기준)을 임의로 교체하지 마세요(변경 시 문서 재작성 필요).
- ${isReq ? '사용자 앱/관리자 경계와 권한 정책을 임의로 합치지 마세요.' : 'MVP 검증 범위를 임의로 확장하지 마세요(과한 기능 추가 금지).'}

## 9. 개발 진행 원칙
${isReq
  ? '- 요구사항을 충족하는지 화면/플로우 단위로 확인하며 구현\n- 사용자 앱 → 관리자 순, 권한·상태·예외를 함께 구현'
  : '- 시장 검증이 목표 — 핵심 가치/CTA가 동작하는 최소 구현 우선\n- 수동 운영 가능한 영역은 자동화보다 검증 우선'}

## 10. QA 체크리스트 기준
- FEATURE_SPEC의 QA 검증 기준 + ${isReq ? '권한별 접근/상태/예외/반응형' : '핵심 가치 전달·CTA 동작'}

## 11. 미확정 / 확인 필요 항목
- IA/FEATURE_SPEC의 "확인 필요" 항목 일체
- ${proto?.type === 'source' ? '외부 URL 프로토타입은 코드 분석 미수행 — 실제 화면 구조 확인 필요' : '코드 정적 분석 기반 추정 항목 검증 필요'}
`;

  // ---- 2. PRD.md ----
  const prd = `# PRD

> ${project.name} · 생성 ${opts.generatedAt}
> (정식 PRD 문서는 July Canvas 문서 탭의 PRD에서 별도 관리됩니다. 본 문서는 전달 패키지용 요약/조립본입니다.)

## 1. 제품 개요
${f(a.intent, project.description || '미입력')}

## 2. 문제 정의
${f(a.problem, '미입력')}

## 3. 타겟 사용자
${f(a.customer, '미입력')}

## 4. 핵심 가치
${f(a.value, '미입력')}

## 5. MVP 범위
${f(a.mvpScope, '미입력')}

## 6. 제외 범위
${f(a.laterScope, '미입력')}

## 7. 주요 기능
${featureSpec ? '기능정의서(FEATURE_SPEC) 기준. 상세는 USER_APP_UI_SPEC / ADMIN_UI_SPEC 참조.' : MISSING}

## 8. IA 요약
${headingsOf(ia)}

## 9. 기능정의 요약
${headingsOf(featureSpec)}

## 10. 권한/상태/예외 정책
${isReq ? '- 사용자/관리자 권한 분리, 상태(빈/로딩/에러), 예외 처리 — FEATURE_SPEC 기준' : '- 검증 단계 단순 권한 — FEATURE_SPEC 기준'}

## 11. 확정 프로토타입
${prototypeBlock(proto)}

## 12. 개발 기준
- 확정 프로토타입 + IA + FEATURE_SPEC을 기준으로 구현. 차별점: ${f(a.differentiator, '미입력')}

## 13. QA 기준
- FEATURE_SPEC QA 검증 기준 참조
`;

  // ---- 3. USER_APP_UI_SPEC.md ----
  const userSpec = `# USER_APP_UI_SPEC

> ${project.name} · 생성 ${opts.generatedAt}

## 1. 사용자 앱 범위
${f(a.mvpScope, '미입력')}
${isReq ? '- 일반 사용자(앱 이용자) 대상 화면/기능' : '- 방문자/사용자 대상 검증용 화면/기능'}

## 2. 사용자 IA
${ia ? '아래는 확정 프로토타입 기반 IA입니다.\n\n' + ia : MISSING}

## 3. 사용자 화면 목록
- IA "화면 목록" 및 FEATURE_SPEC "화면별 기능 정의" 참조 (사용자 영역)

## 4. 화면별 UI 동작
${featureSpec ? '아래는 확정 프로토타입 기반 기능정의서입니다.\n\n' + featureSpec : MISSING}

## 5. 주요 플로우
- ${isReq ? '로그인/진입 → 핵심 기능 → 완료' : '진입(랜딩) → 핵심 가치/기능 → CTA(문의/신청/구매)'}

## 6. 버튼/CTA
- FEATURE_SPEC "버튼 / CTA" 표 참조

## 7. 입력값
- FEATURE_SPEC "입력값" 표 참조

## 8. 상태값
- FEATURE_SPEC "상태값" 표 참조

## 9. Empty / Loading / Error
- FEATURE_SPEC "Empty / Loading / Error 상태" 참조

## 10. 권한/접근 제한
- ${isReq ? '사용자 권한 범위(관리 기능 제외)' : '검증 단계 단순 접근'}

## 11. 사용자 앱 QA 체크리스트
- 핵심 플로우 동작, ${isReq ? '입력 검증·상태·예외' : '핵심 가치 전달·CTA'} 확인
`;

  // ---- 4. ADMIN_UI_SPEC.md ----
  const adminSpec = hasAdmin
    ? `# ADMIN_UI_SPEC

> ${project.name} · 생성 ${opts.generatedAt}

## 1. 관리자 범위
- 운영자/관리자가 데이터·회원·콘텐츠를 관리하는 영역
- 적용 환경: ${f(a.market, '미입력')}

## 2. 관리자 IA
${ia ? 'IA에서 관리자 영역을 분리해 정의하세요. (전체 IA는 USER_APP_UI_SPEC §2 참조)\n\n' + headingsOf(ia) : MISSING}

## 3. 관리자 화면 목록
- 관리 목록 / 상세 / 운영 화면 _(FEATURE_SPEC 관리자 기능 기준 — 확인 필요)_

## 4. 운영 기능
${featureSpec ? 'FEATURE_SPEC "관리자/운영 기능" 섹션 기준.' : MISSING}

## 5. 데이터 관리 기능
- 생성/수정/삭제/조회 _(확인 필요)_

## 6. 권한 정책
- 관리자 전용 화면·동작 보호, 역할별 노출 차이 _(확인 필요)_

## 7. 상태 관리
- 목록 빈/로딩/에러 상태 _(확인 필요)_

## 8. 예외 처리
- 권한 없음/실패 처리 _(확인 필요)_

## 9. 관리자 QA 체크리스트
- 권한 분리, 관리 기능 동작, 상태/예외 확인
`
    : `# ADMIN_UI_SPEC

> ${project.name} · 생성 ${opts.generatedAt}

이 프로젝트에는 별도 관리자 페이지가 명확히 정의되지 않았습니다.
필요 시 운영/관리 기능은 후속 단계에서 정의해야 합니다.
`;

  const files: HandoffFile[] = [
    { name: FILE_NAMES[0], content: handoff },
    { name: FILE_NAMES[1], content: prd },
    { name: FILE_NAMES[2], content: userSpec },
    { name: FILE_NAMES[3], content: adminSpec },
  ];

  return {
    files,
    readiness: {
      brief: !!brief,
      market: !!market,
      strategy: !!strategy,
      ia: !!ia,
      featureSpec: !!featureSpec,
      prototype: !!proto,
    },
  };
};
