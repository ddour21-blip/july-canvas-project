// 디자인 컨텍스트(design_context) 문서 생성기 — Pipeline MVP.
// 참고 URL/디자인 메모를 바탕으로 프로토타입에 반영할 "디자인 기준"을 문서화한다.
// ⚠️ URL을 직접 크롤링/분석하지 않는다. 활성화에 입력된 참고자료(references)와 메모만 힌트로 사용한다.
import type { Project, ProjectActivation, ProjectDocument } from '@/types';

const f = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

const HINT = '확인 필요 — 참고 자료/디자인 메모를 입력하거나 직접 보완하세요.';

/** 디자인 컨텍스트 문서(MVP 템플릿). references가 있으면 반영, 없으면 "확인 필요". */
export const buildDesignContext = (
  project: Project,
  _docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  // 활성화 단계에서 입력된 참고 URL/Drive 링크(있으면 디자인 참고로 재사용).
  const refs = (a.references ?? '').trim();

  return `# 디자인 컨텍스트

> ${project.name} · 생성 ${generatedAt}
> 참고 URL은 현재 직접 분석하지 않으며, 입력된 참고 자료와 메모를 기반으로 디자인 방향을 문서화합니다.

## 1. 디자인 목표
- 첫인상으로 주고 싶은 느낌: ${f(a.value, '신뢰감 / 전문성 / 속도감 / 친근함 중 우선순위를 정하세요.')}
- 서비스 톤: ${f(a.differentiator, '차별점을 시각 톤으로 어떻게 표현할지 한 줄로 정리하세요.')}
- 핵심 사용자: ${f(a.customer, HINT)}

## 2. 참고 디자인
- 참고 URL / Drive 링크:
${refs ? refs : `_(${HINT})_`}
- 참고 이미지/스크린샷: _(${HINT})_
- 참고할 레이아웃 특징: _(${HINT})_
- 그대로 복제하면 안 되는 요소(상표·로고·고유 카피·이미지): 복제 금지, 목적에 맞게 리믹스

## 3. 디자인 토큰 초안
- 주요 색상(primary): _(${HINT})_
- 배경 / 텍스트 / 보더 색상: _(${HINT})_
- 폰트 방향: _(${HINT})_
- spacing scale: 4 / 8 / 12 / 16 / 24 / 32 (예시 — 조정 가능)
- radius: sm / md / lg / pill (예시)
- shadow / elevation: 카드·모달 단계별 (예시)

## 4. 컴포넌트 규칙
- 버튼: primary / secondary / ghost, 비활성·로딩 상태
- 카드: 기본 / 강조(featured) / 클릭 가능
- 입력 필드: 기본 / 포커스 / 오류 / 비활성
- 테이블·리스트: 헤더 / 행 / 상태 뱃지
- 모달: 헤더 / 본문 / 액션
- empty / loading / error 상태 규칙 _(${HINT})_

## 5. 레이아웃 규칙 (프로토타입 모드별)
- mobile-app: 상단 앱바 + 하단 탭, 한 손 흐름
- web-landing: 상단 nav + 히어로 + 피처 + CTA, 와이드
- saas-dashboard: 사이드바 + 탑바 + KPI + 표/차트
- admin-console: 사이드바 + 필터 바 + 상태 뱃지 테이블 + 상세

## 6. 인터랙션 / 모션
- hover / focus 표현
- toast(더미 알림)
- modal 열기/닫기
- loading 표시
- transition 기준 _(${HINT})_

## 7. 프로토타입 반영 우선순위
- 반드시 반영할 것: ${f(a.mvpScope, HINT)}
- 가능하면 반영할 것: _(${HINT})_
- 이번 MVP에서 제외할 것: ${f(a.laterScope, HINT)}

## 8. 주의사항
- 참고 URL은 현재 직접 크롤링하지 않습니다(입력된 메모/링크 텍스트만 힌트로 사용).
- 상표 / 로고 / 고유 카피 / 이미지를 그대로 복제하지 마세요.
- 프로젝트 목적에 맞게 리믹스해 적용하세요.

---
_후속 자동화 예정: 참고 URL 자동 분석/디자인 토큰 자동 추출은 다음 단계에서 검토합니다._
`;
};
