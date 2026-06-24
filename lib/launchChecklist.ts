// 배포 준비 체크리스트(launch_checklist) 문서 생성기 — Pipeline MVP.
// 개발 계획/QA 기준을 참고한 릴리즈 준비 템플릿. AI 호출 없음.
// 보안 주의: 실제 환경변수 값/시크릿은 문서에 적지 않는다(키 이름·존재 여부만).
import type { Project, ProjectDocument, DocumentType } from '@/types';

const has = (docs: ProjectDocument[], t: DocumentType): boolean =>
  !!docs.find((d) => d.type === t)?.content?.trim();

/** 배포 준비 체크리스트 문서(MVP 템플릿). */
export const buildLaunchChecklist = (
  project: Project,
  docs: ProjectDocument[],
  generatedAt: string,
): string => {
  const upstream = [
    has(docs, 'development_plan') ? '개발 계획' : null,
    has(docs, 'qa_criteria') ? 'QA 기준' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `# 배포 준비 체크리스트

> ${project.name} · 생성 ${generatedAt} · 참고: ${upstream || '상위 문서 미작성(가정으로 보완)'}

## 1. 배포 전 확인사항
- [ ] QA 기준의 릴리즈 전 체크리스트 통과
- [ ] 빌드/타입체크 통과
- [ ] 주요 화면 스모크 확인(데스크톱·모바일)

## 2. 환경변수 확인
- [ ] 필요한 환경변수 키가 배포 환경에 모두 설정됨 (값은 문서에 적지 않음)
- [ ] 운영/개발 환경 분리 확인
- [ ] 비밀키/토큰은 코드·문서·로그에 노출되지 않음

## 3. 권한 / 보안 확인
- [ ] 인증/세션 동작 확인
- [ ] 역할별 접근 제어(서버 측 규칙 포함) 확인
- [ ] 민감정보 마스킹/미노출 확인

## 4. 기본 SEO / OG 확인
- [ ] 타이틀/설명 메타 설정
- [ ] OG 이미지/카드 기본값 설정
- [ ] 정규 URL(canonical) 확인

## 5. 에러 페이지 확인
- [ ] 404 / 500 / 권한 없음 페이지 동작
- [ ] 빈 상태/로딩 상태 처리

## 6. 로그 / 모니터링 확인
- [ ] 에러 로깅 수집 경로 확인
- [ ] 핵심 지표(접속/전환/오류율) 측정 경로 확인

## 7. 롤백 기준
- [ ] 직전 안정 버전으로 되돌리는 절차 정의
- [ ] 롤백 트리거 기준(치명 오류·핵심 흐름 실패) 정의

---
_후속 자동화 예정: 배포 파이프라인/자동 롤백 연동은 다음 단계에서 검토합니다._
`;
};
