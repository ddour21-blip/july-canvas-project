# 체크포인트 — S7-2 공유 시리즈(2A~2D) + 로컬 QA 안정화

> 최종 갱신: 2026-06-17. S7-2 공유 기능 전체와 QA 안정화 결과를 한 곳에 고정한다.
> 다음 큰 기능 착수 전 기준점.

## 1. S7-2A — internal share (로그인 멤버 공유 링크) ✅

- `shares` 컬렉션 + 추측 불가 `shareId`('sh' + 22 base62, `_` 없음).
- ShareModal에서 링크 생성/비활성·재활성/만료(없음·7일·30일)/복사.
- `#share_{shareId}` → 활성/만료 확인 후 **내부 딥링크로 resolve**(로그인 멤버).
- `lib/shares.ts`, `lib/shareLinks.ts`. owner/editor만 생성·관리, viewer는 미노출.
- 커밋: `c7953a2`.

## 2. S7-2B — public_readonly (비로그인 읽기 전용 공유) ✅

| 단계 | 내용 | 커밋 |
|------|------|------|
| **B-1 인프라** | `firebase-admin` + `lib/firebaseAdmin.ts`(서버 lazy init, 서비스 계정 env 3종, `\n` 복원, `adminCol()`). Rules 무변경. | `7c2ad32` |
| **B-2 API + sanitizer** | `GET /api/share/[shareId]`: shareId 형식 → `isEnabled` → `expiresAt` → `public_readonly` 검증 → targetType별 sanitize. `lib/publicShareSanitizer.ts`. | `2d686d3` |
| **B-3 public viewer** | `app/share/[shareId]/page.tsx`(noindex) + `components/share/ShareViewer.tsx` — `/api/share`만 호출, project/document/screen/handoff 4종 read-only 렌더 + 상태별 안내. | `07a0f89` |
| **B-4 생성 UI** | ShareModal 내부/외부 토글 + 안내. public=`/share/{shareId}`, internal=`#share_`(배지 구분). owner/editor만. | `54c855f` |

- 라이브 검증: 4종 viewer 정상, internal/disabled/expired/404/400 차단, 민감 필드 누출 0, screen.code 미실행.

## 3. S7-2C — 비로그인 댓글 (public_review) ✅

- `publicReviews` 컬렉션(**서버 전용, Rules 미등록 = 클라 기본 거부 + admin만**). 필드: shareId/projectId/targetType/targetId?/authorName/content/status/createdAt/updatedAt. **uid·IP 미저장**.
- ⚠️ **상태 정책 변경(S7-2E)**: S7-2C는 초기 `status:'visible'` 즉시 공개였으나, **S7-2E에서 신규 댓글 기본값을 `pending`(검토 대기)으로 변경**. public viewer에는 `visible`만 노출되며, owner/editor 승인 후 공개된다. viewer 등록 성공 안내도 "댓글이 제출되었습니다. 검토 후 공개될 수 있습니다."로 변경됨.
- `GET/POST /api/share/[shareId]/reviews`(firebase-admin): `resolveActivePublicShare`로 share 활성·public_readonly 검증. content 1~1000자, authorName ≤40자(기본 '익명'), 빈/초과 차단.
- ShareViewer에 댓글 영역(이름 선택/내용/등록/목록). **React 텍스트 렌더만**(dangerouslySetInnerHTML 금지).
- `lib/shareServer.ts`(공유 검증 헬퍼, B-2 라우트는 회귀 방지 위해 미변경).
- 라이브 검증: 4종 타깃 등록, internal/disabled/expired 차단, 빈/긴/잘못된 shareId 차단, XSS 미실행, 민감 필드 누출 0.
- 커밋: `fe3fd0b`.

## 4. S7-2D — 내부 리뷰 관리 (owner/editor) ✅

- `GET /api/projects/[projectId]/reviews`(firebase-admin): **Firebase ID token 검증 + owner/editor 권한 확인**(`lib/authServer.ts` `requireProjectEditor`, Rules `roleFor`와 동일 우선순위). 비로그인/무효 → 401, viewer/비멤버 → 403.
- ProjectDetail 개요 탭 "외부 피드백" 섹션(`components/views/ProjectReviews.tsx`, `canEdit`만): targetType 필터(전체/project/document/screen/handoff_package) + 작성자/내용/일시/대상/shareId. **React 텍스트 렌더만**. "v1 즉시 공개, 승인/숨김/삭제 후속" 안내.
- 라이브 검증: owner 200 / 비멤버 403 / 토큰 없음·오류 401, targetType 4종 구분, XSS 미실행, 민감 필드 누출 0, 공개 댓글과 동일 컬렉션 연동.
- 커밋: `d95e581`.

## 4-1. S7-2E — 댓글 모더레이션 (owner/editor) ✅

- **상태 정책**: 신규 댓글 기본 `pending`. public viewer는 `visible`만 노출. 관리 UI는 pending/visible/hidden 확인(소프트 삭제 `deleted`는 모든 목록 제외).
- **모더레이션 API**: `PATCH /api/projects/[projectId]/reviews/[reviewId]` body `{action}` — approve→`visible` / hide→`hidden` / delete→`deleted`(소프트 삭제). `requireProjectEditor` 재사용(owner/editor만), 대상 리뷰가 해당 projectId 소속인지 확인(교차 조작 방지). 비로그인 401 / viewer·비멤버 403.
- **관리 UI 확장**(`ProjectReviews.tsx`): 상태 필터(전체/대기/공개/숨김) + 대상 필터, 카드별 승인/숨김/삭제 액션 버튼 + 처리중 표시 + 액션 후 목록 갱신. content는 계속 React 텍스트 렌더만.
- 라이브 검증: POST→pending(공개 미노출)·승인→공개 노출·숨김→공개 사라짐·삭제→관리/공개 모두 제외·타 프로젝트 PATCH 403·토큰 없음 401·XSS 미실행·민감 필드 누출 0. UI 승인 클릭 → 배지 공개 전환 + viewer 노출.
- 커밋: `feat: add public review moderation` (본 갱신 커밋).

## 5. QA 안정화 완료 항목 ✅

| 항목 | 상태 | 비고/커밋 |
|------|------|-----------|
| 보강정보 파일 업로드/URL 등록 **상단 이동**(요구사항 모드 detail) | ✅ | `5b66f39` |
| 프로토타입 코드 입력 → 화면 노출(iframe 렌더·새로고침 유지·목록 반영) | ✅ 정상(재현됨) | 코드 버그 아님 |
| 고유 접속 링크 복사 → 새 탭 접속(`#ws_main_project_{id}` resolve) | ✅ 정상(재현됨) | 비멤버는 Viewer |
| 코드 복사 → 입장(`project_{id}` → handleJoinByCode → resolve) | ✅ 정상(재현됨) | — |
| 팀원 직접 입장 가이드(링크/코드 안내 ↔ 실제 동작 일치) | ✅ 정상(재현됨) | — |
| internal share 회귀 | ✅ 없음 | — |
| public_readonly share 회귀 | ✅ 없음 | — |
| B라인 핵심 플로우 회귀(활성화→문서→프로토타입→IA/FS→전달패키지) | ✅ 없음 | — |
| 로그아웃 시 permission-denied 해결(protected subscription cleanup) | ✅ | `3a8ebfb` |
| **Google 로그인 사용자만 프로젝트 생성 가능** | ✅ | `5b66f39` |
| **익명 사용자는 프로젝트 생성 불가**(UI + 함수 + 모달 게이트) | ✅ | `5b66f39` |
| 새 프로젝트 버튼 회귀(비-소유자 숨김) 수정 | ✅ | `d31c2a4` |

> 참고: 위 "정상(재현됨)" 항목들은 신선한 세션의 실제 브라우저 클릭으로 동작 확인됨. 로컬에서 실패 시 **stale dev 빌드/캐시**가 가장 유력 — hard reload / dev 서버 재시작 권장. Google OAuth 인터랙티브 경로(로그인 생성·로그아웃 클릭)는 사용자 로컬 세션에서 최종 확인 완료.

## 6. 확정 정책 (변경 시 별도 합의)

- **Firestore Rules 변경 없음** — S7-2 전 단계에서 Rules 미변경.
- **public read/write 직접 오픈 금지** — 모든 비로그인 접근/쓰기는 서버 매개.
- **Firebase Admin API 경유 유지** — `shares`/`publicReviews` 등은 firebase-admin(Rules 우회)으로만 읽고 쓴다. 클라이언트 직접 접근 없음.
- **screen.code 실행 미리보기 보류** — public viewer/관리 UI 모두 텍스트로만 표시(`dangerouslySetInnerHTML`/실행 iframe 금지). 필요 시 `sandbox=""` srcdoc 별도 검토.
- **익명 폴백 유지** — KAKE/기존 익명 데이터 호환. 단, 익명의 프로젝트 생성은 차단.
- **완전 로그아웃 정책 변경 보류** — 로그아웃 시 익명 폴백 복귀(별도 로그인 전용 화면 없음). 전이 구간 protected read는 cleanup으로 차단됨.
- 팀/멤버십 기반 타인 프로젝트 열람 확장 보류(현재 단계 A: `read: if signedIn()`).
- **댓글 모더레이션(S7-2E)**: 신규 댓글 `pending` → owner/editor 승인 시 공개. 삭제는 소프트 삭제(`deleted`). 모든 모더레이션은 서버 API + firebase-admin + ID token(owner/editor)만.
- `.env.local`/서비스 계정 키 커밋 금지.

## 7. 최신 커밋 목록 (S7-2 시리즈 + QA, 최신순)

```
<본 커밋> feat: add public review moderation                     # S7-2E (모더레이션 + 정책 pending 전환)
fbe1fd9 docs: update checkpoint with full s7-2 share series and qa
d95e581 feat: add internal review management for owner editor   # S7-2D
fe3fd0b feat: add public review comments for readonly shares     # S7-2C
e4c8fd8 docs: add public share and qa stabilization checkpoint   # (본 문서 초판)
5b66f39 fix: restrict project creation to google users and surface source inputs  # QA: 생성권한+보강UI
3a8ebfb fix: tear down protected subscriptions on sign-out       # QA: 로그아웃
d31c2a4 fix: allow any signed-in user to create projects         # QA: 생성버튼 회귀(이후 5b66f39에서 Google 전용으로 강화)
54c855f feat: enable public readonly share creation              # S7-2B-4
07a0f89 feat: add public readonly share viewer                   # S7-2B-3
2d686d3 feat: add public readonly share api                      # S7-2B-2
7c2ad32 chore: add firebase admin infrastructure                 # S7-2B-1
c7953a2 feat: add share records for internal share links         # S7-2A
```

## 8. 워킹트리 상태

- 본 체크포인트 갱신 시점 기준 **clean**. 모든 변경은 위 커밋으로 반영됨.
- KAKE(`8DH3maHooF9WkhnZO81c`) 무손상, 테스트 데이터/임시 스크립트 정리 완료.

## 9. 다음 단계 후보

- **S7-2F 스팸 방지**: reCAPTCHA/레이트리밋 (**운영 전 필수** — `reviews` POST 라우트에 TODO 명시). 모더레이션(S7-2E) 완료 후 다음 우선순위.
- (필요 시) 멤버십 기반 read(단계 B) / 완전 로그아웃 화면 / 모더레이션 알림.
