# 체크포인트 — S7-2B public_readonly 완료 + 로컬 QA 안정화

> 작성: 2026-06-17. S7-2C(public_review) 착수 직전 기준점.
> 큰 기능 착수 전 "지금까지 확정된 것"을 한 곳에 고정한다.

## 1. S7-2B public_readonly 완료 상태

| 단계 | 내용 | 커밋 |
|------|------|------|
| **B-1 인프라** | `firebase-admin` 의존성 + `lib/firebaseAdmin.ts`(서버 전용 lazy init, 서비스 계정 env 3종 `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`, `\n` 복원, env 누락 시 명확한 에러, `adminCol()` 경로 헬퍼). Rules 무변경. | `7c2ad32` |
| **B-2 API + sanitizer** | `GET /api/share/[shareId]`(nodejs): shareId 형식 → `isEnabled` → `expiresAt` → `accessType==='public_readonly'` 검증 → targetType별 sanitize 반환. `lib/publicShareSanitizer.ts`(화이트리스트). | `2d686d3` |
| **B-3 public viewer UI** | `app/share/[shareId]/page.tsx`(서버, noindex) + `components/share/ShareViewer.tsx`(`'use client'`) — `/api/share`만 호출, targetType별 read-only 렌더 + 상태별 안내. screen.code는 `<pre>` 텍스트로만. | `07a0f89` |
| **B-4 생성 UI** | ShareModal 내부/외부 접근 토글 + 외부 안내. public=`/share/{shareId}`, internal=`#share_` 딥링크(배지 구분). owner/editor만. | `54c855f` |

**전체 라이브 검증 완료**: project/document/screen/handoff 4종 viewer 정상, 민감 필드 누출 0, internal/disabled/expired/404/400 차단, screen.code 미실행.

## 2. 로컬 QA 안정화 완료 상태

| 항목 | 상태 | 커밋 |
|------|------|------|
| 새 프로젝트 생성 버튼 회귀(비-소유자 숨김) 수정 | ✅ | `d31c2a4` |
| 로그아웃 시 protected subscription cleanup(permission-denied 제거) | ✅ | `3a8ebfb` |
| **프로젝트 생성은 Google 로그인 사용자만** (익명 차단: UI + 함수 + 모달 게이트) | ✅ | `5b66f39` |
| 익명 폴백 유지(생성만 차단), 익명엔 Google 로그인 CTA | ✅ | `5b66f39` |
| 보강정보 파일 업로드/URL 등록 **상단 이동**(요구사항 모드 detail) | ✅ | `5b66f39` |
| 프로토타입 코드 입력 → 화면 노출(iframe 렌더·새로고침 유지·목록 반영) | ✅ 정상(재현됨) | — |
| internal share / public_readonly share 회귀 | ✅ 없음 | — |
| 로컬 Google 세션 최종 확인(로그인 생성/유지, 로그아웃 에러 없음, 익명 숨김) | ✅ 사용자 확인 | — |

## 3. 확정 정책 (변경 시 별도 합의)

- **Firestore의 public read/write 를 직접 열지 않는다.** 모든 외부(비로그인) 접근은 서버 매개(firebase-admin)로만.
- public viewer(`/share/[shareId]`)는 Firebase client를 쓰지 않고 **`/api/share/[shareId]` 만** 호출한다.
- **screen.code 는 텍스트로만 표시**(React 텍스트, `dangerouslySetInnerHTML`/실행 iframe 금지). 실행 미리보기는 보류(필요 시 `sandbox=""` srcdoc 별도 검토).
- **완전 로그아웃(익명 폴백 제거) 정책 변경은 보류** — 익명 폴백은 KAKE/기존 익명 데이터 호환을 위해 유지. 단, 익명 사용자의 프로젝트 생성은 차단.
- **팀/멤버십 기반 타인 프로젝트 열람 확장은 보류** — 현재는 단계 A(`read: if signedIn()`). 비멤버는 Viewer로 보임. 멤버십 read(단계 B)는 구독 리팩터 후.
- `.env.local`/서비스 계정 키는 커밋 금지.

## 4. 다음 단계

- **S7-2C: public_review (비로그인 코멘트)** — `/share/{shareId}` viewer에서 비로그인 사용자가 코멘트 작성. Firestore Rules 무변경, 서버 API(firebase-admin) 매개. (이 문서 작성 직후 착수.)
