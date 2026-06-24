// 서비스 구조 설계(service_structure) 문서 생성기 — Pipeline MVP (Eraser-like 구조 설계).
// ⚠️ 기능 목록이 아니라 레이어/데이터 흐름/권한/외부 연동/상태/리스크 중심의 "구조" 문서다.
// 기능정의서(feature_spec)와 역할이 다르다(기능정의서=무엇을, 구조설계=어떻게 흐르고 어디에 사는가).
// AI 호출 없음(템플릿 기반). 외부 의존 없음.
import type { Project, ProjectActivation, ProjectDocument, DocumentType } from '@/types';

const f = (v: string | undefined, placeholder: string): string =>
  v && v.trim() ? v.trim() : `_(${placeholder})_`;

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

const HINT = '확인 필요 — 프로토타입/상위 문서를 참고해 보완하세요.';

/** 서비스 구조 설계 문서(MVP, 구조 중심). */
export const buildServiceStructure = (
  project: Project,
  docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const a = project.activation ?? ({} as ProjectActivation);
  const upstream = [
    has(docs, 'ia') ? 'IA' : null,
    has(docs, 'feature_spec') ? '기능정의서' : null,
    has(docs, 'design_context') ? '디자인 컨텍스트' : null,
    project.prototypeLock ? '확정 프로토타입' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `# 서비스 구조 설계

> ${project.name} · 생성 ${generatedAt} · 참고: ${upstream || '상위 문서 미작성(가정으로 보완)'}
> 이 문서는 기능 목록이 아니라 **레이어·데이터 흐름·권한·외부 연동·상태·리스크** 중심의 구조 설계입니다.

## 1. 구조 설계 요약
- 한 줄 정의: ${f(a.intent || project.description, '이 서비스가 어떤 구조로 동작하는지 한 줄로 정리하세요.')}
- 핵심 사용자 요청 흐름: 사용자 → 화면 → API/서버 → 데이터 → 결과 화면 (아래 4번에서 구체화)
- 핵심 가치: ${f(a.value, HINT)}

## 2. 아키텍처 레이어
- **Client Layer**: Web App(필수) / Mobile Web·App 여부 _(${HINT})_
- **Application Layer**: 주요 화면·모듈 (예: 대시보드, 입력 폼, 결과, 설정) _(${HINT})_
- **API / Server Layer**: API route 또는 backend service 후보 _(${HINT})_
- **Data Layer**: 주요 DB / 컬렉션 / 테이블 (3번 데이터 객체 참고)
- **External Integration Layer**: 인증 / 결제 / 이메일 / AI API / 분석 / 기타 외부 API _(${HINT})_
- **Operations Layer**: 로그 / 모니터링 / 배포 / 권한·보안

## 3. 주요 데이터 객체
- User — 인증/역할/프로필
- Project — 서비스의 작업 단위
- Document — 산출물(브리프~운영 리포트)
- Prototype — 화면/코드/확정(lock)
- Review / Feedback — 공개 리뷰·댓글
- Share Link — 외부 공개 링크
- (후보) Payment / Subscription — 결제·구독
- (후보) Operation Report — 운영 지표
- 각 객체의 주요 속성/관계(1:N, N:M)를 표로 정리하세요. _(${HINT})_

## 4. 화면 → API → 데이터 흐름
| 화면 | 사용자 액션 | API 후보 | 데이터 객체 | 결과 상태 |
| --- | --- | --- | --- | --- |
| 입력 화면 | 제출 | POST /api/... | Document | 생성됨(draft) |
| 결과 화면 | 조회 | GET /api/... | Document/Prototype | 표시 |
| 공유 | 링크 생성 | POST /api/share | Share Link | 공개됨 |
_(행을 프로젝트에 맞게 추가/수정하세요. ${HINT})_

## 5. 권한 / 역할 구조
- owner: 전체 관리·승인·멤버 관리
- editor: 문서/프로토타입 작성·수정
- viewer: 조회·제한적 다운로드
- public reviewer: 공개 링크로 리뷰/댓글
- anonymous / public access: 공개 공유 페이지 한정 접근
- 권한 경계(서버 측 규칙 포함)를 명확히 하세요. _(${HINT})_

## 6. 상태값 구조
- project status: draft / active / review / approved / archived / handoff
- document status: draft / review / approved
- pipeline step status: not_started / ready / in_progress / needs_review / approved / needs_regen
- prototype lock: 확정 대상(screen|source) / lockedAt
- review status: 공개/비공개·해결 여부 _(${HINT})_

## 7. 구조도 초안 (Mermaid)
\`\`\`mermaid
flowchart LR
  User[User] --> Web[Web App]
  Web --> API[API Routes]
  API --> DB[(Firestore)]
  API --> AI[AI Provider]
  Web --> Share[Public Share Page]
  API --> Ext[External APIs]
\`\`\`
_(프로젝트 구조에 맞게 노드/엣지를 수정하세요.)_

## 8. 비기능 요구사항
- 보안: 인증/권한, 민감정보 마스킹, 공개 링크 범위 제한
- 성능: 핵심 화면 응답시간 기준
- 확장성: 데이터/트래픽 증가 대응 여지
- 접근성: 키보드/대비/반응형
- 배포 안정성: 롤백 기준, 무중단 여부
- 로그 / 마스킹: 비밀값 미노출 _(${HINT})_

## 9. 구조상 리스크
- 인증/권한 리스크 (권한 우회·과다 노출)
- 외부 공개 URL 리스크 (비공개 데이터 노출)
- AI 생성 실패 리스크 (타임아웃·파싱 실패 대체 경로)
- 데이터 정합성 리스크 (상태 불일치·orphan)
- 운영/배포 리스크 (환경변수 누락·롤백 부재) _(${HINT})_

## 10. 다음 단계 연결
- 위 구조를 **개발 계획(development_plan)** 의 구현 순서/작업 단위/API 후보/데이터 모델로 변환합니다.
- 검증이 필요한 구조적 항목은 **QA 기준(qa_criteria)** 으로 넘깁니다.

---
_후속 자동화 예정: 구조도/데이터 모델 자동 생성은 다음 단계에서 검토합니다._
`;
};
