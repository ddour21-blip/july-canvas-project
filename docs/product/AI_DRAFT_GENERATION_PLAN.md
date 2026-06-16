# AI 초안 생성 + 보강 필드 자동 분해 (B1)

작성: 2차-FLOW 로드맵 B1 구현 직후. 커밋 `feat: generate activation draft from project idea`.

## 1. 목표
ProjectActivationWizard에서 사용자가 아이디어를 자유롭게 입력하면, AI가 (1) 보강 정보 10개 필드를 자동 분해해 채우고 (2) 시장조사·제품화전략·프로젝트 브리프 초안을 생성한다. 사용자는 자동 입력값을 검토/수정한 뒤 활성화한다. **기존 Firestore 데이터 모델(ProjectActivation, documents 6종)은 변경하지 않는다.**

## 2. 사용자 흐름
```
아이디어 입력(1단계, 필수 1칸)
→ 보강 정보 단계(2단계) 상단 'AI로 초안 생성' 클릭
→ /api/generate/activation-draft 호출
→ 응답 fields로 보강 정보 textarea 자동 입력 (사용자 수정 가능)
→ 응답 documents는 hidden state(draftDocs)에 보관 (AI 모드일 때만)
→ 활성화 완료 → draft→active 전환 + documents 3종 저장
   - AI 모드: AI 문서 그대로 저장
   - 템플릿/폴백 모드: 최종 입력 필드로 문서 재생성(사용자 수정 반영)
```

## 3. API 구조
- 엔드포인트: `app/api/generate/activation-draft/route.ts` (POST, `runtime='nodejs'`, `dynamic='force-dynamic'`)
- 생성 로직: `lib/aiGeneration.ts` → `generateActivationDraft({idea, currentFields, projectName})`
- 템플릿 생성기: `lib/documents.ts` (`generateBrief`/`generateMarketResearch`/`generateProductStrategy`, 스켈레톤 상수 `MARKET_RESEARCH_SKELETON`/`PRODUCT_STRATEGY_SKELETON`)
- 모델: **Claude Opus 4.8** (`claude-opus-4-8`), adaptive thinking + effort:high, **structured outputs(json_schema)** + streaming(`finalMessage`)로 긴 출력 수신. SDK `@anthropic-ai/sdk`.
- **route는 Firestore에 쓰지 않는다.** 클라이언트가 기존 권한 흐름(활성화 submit)으로 저장.

## 4. request / response schema
요청:
```ts
POST /api/generate/activation-draft
{ idea: string; currentFields?: Partial<ProjectActivation>; projectName?: string }
```
응답(`ActivationDraftResult`):
```ts
{
  ok: true;
  mode: 'ai' | 'template';
  reason?: string;            // template 모드 사유 (키 없음/오류)
  fields: ProjectActivation;  // intent/problem/customer/value/differentiator/revenue/market/mvpScope/laterScope/references
  documents: { projectBrief: string; marketResearch: string; productStrategy: string };
}
```

## 5. fallback 정책 (graceful-skip)
- `ANTHROPIC_API_KEY` 미설정 → `mode:'template'`, `reason:'ANTHROPIC_API_KEY is not configured'`.
- AI 호출 실패(파싱/네트워크/오류) → `mode:'template'`, `reason:<error>`. **항상 `ok:true`** 로 반환해 앱이 깨지지 않음.
- 템플릿 모드 fields: `intent`=아이디어, 비어 있는 9개는 편집형 가이드 문구로 채움(textarea가 비지 않도록). 문서는 `lib/documents` 템플릿(빈 곳은 "조사 필요"/EMPTY_HINT).
- 클라이언트는 template 모드일 때 "AI 초안 생성을 사용할 수 없어 기본 초안을 만들었습니다" 안내.

## 6. 보강 필드 자동 분해 기준 (AI 모드)
intent=요약+의도 / problem=문제 / customer=핵심 고객 / value=핵심 가치 / differentiator=차별점 / revenue=수익 구조 / market=최초 진입·세분화 시장 / mvpScope=MVP 범위 / laterScope=추가 기능 / references=참고·경쟁·조사 레퍼런스. `currentFields`(사용자 기입)는 우선 존중. 빈 문자열 금지.

## 7. 시장조사 문서 템플릿 기준
`# 시장 조사 전략 및 방법` — 핵심 원칙 / 0. 철학 / 1. 시장 세분화 / 2. 시장 조사 항목 / 3. 상품 전략 정의(필드 매핑) / 4. MVP 범위 / 5. 최소 거래 페이지 / 6. 콘텐츠 검증 / 7. 고객 수락 체인 / 8. 첫 3명 확보 / 9. 검증할 것 / 10. 마지막에 할 것 / 11. 초기 전략 / 12. 하지 말 순서 / 13. 가장 중요한 질문 / 14. 제품 철학. (14 섹션, `MARKET_RESEARCH_SKELETON`)

## 8. 제품화 전략 문서 템플릿 기준
`# 아이디어 제품화 전략` — 1. 원칙 / 2. 프로젝트 개요(필드 매핑) / 3. 제품 전략 구조 / 4. 시스템 구조 / 5. AI 에이전트 역할 / 6. 개발 우선순위(Stage 1~6) / 7. MVP 우선순위 / 8. 정책·리스크 / 9. 먼저 확인할 파일 / 10. /goal 후보 3개(복사 가능 수준) / 11. 범용 기능 템플릿 / 12. 최적 전략 / 13. MVP 철학. (13 섹션, `PRODUCT_STRATEGY_SKELETON`)

## 9. 보안 주의사항
- `ANTHROPIC_API_KEY`는 **서버 전용**. `process.env`로만 접근, 클라이언트 노출 금지, `.env.local` 커밋 금지.
- route handler는 Node 런타임. 클라이언트는 `/api/...`만 호출(키 미노출).
- API route가 Firestore에 직접 쓰지 않음 → 기존 Rules/권한 흐름 우회 없음.
- 키 없거나 실패해도 앱 정상 동작(graceful).

## 10. 다음 단계
- (선택) AI 모드를 실제 키로 라이브 검증(현재 환경은 키 미설정이라 template 폴백만 라이브 확인).
- IA/FEATURE_SPEC/PRD 초안도 AI 생성 확장(현재 정책 유지, B2 이후).
- 클arifying questions(부족 정보만 역질문) UI.
- C단계: QA Automation 연결(스펙→시나리오), 이후 2차-6 알림/이메일.
