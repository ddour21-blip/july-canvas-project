# S7-3 운영 배포 준비 (Production Readiness)

> 작성: 2026-06-17. S7-2 공유/리뷰/모더레이션/스팸 방지(2A~2H) **코드 완료** 후, 실제 운영 배포 전
> 필요한 **수동 설정 / env / Firebase Console / Turnstile / 최종 smoke QA / 롤백**을 한 문서로 확정한다.
>
> ⚠️ 이 문서는 **체크리스트/운영 가이드**다. 새 기능·코드 변경은 포함하지 않는다.
> 상세 구현 이력은 `docs/product/S7_CHECKPOINT_PUBLIC_SHARE_AND_QA.md` 참조.

---

## 1. 현재 완료 상태 요약 (코드 기준)

| 단계 | 내용 | 상태 |
|------|------|------|
| S7-2A | internal share (로그인 멤버 딥링크) | ✅ 코드 완료 |
| S7-2B | public_readonly 공유 (서버 매개 viewer) | ✅ 코드 완료 |
| S7-2C | 비로그인 댓글 (public_review) | ✅ 코드 완료 |
| S7-2D | 내부 리뷰 관리 (owner/editor) | ✅ 코드 완료 |
| S7-2E | 댓글 모더레이션 (pending/approve/hide/delete) | ✅ 코드 완료 |
| S7-2F | 레이트리밋 + CAPTCHA env-gated | ✅ 코드 완료 |
| S7-2G | CAPTCHA 위젯(Turnstile) 연결 + 운영 마감 | ✅ 코드 완료 |
| S7-2H | rateLimits TTL(Timestamp) 하드닝 | ✅ 코드 완료 |

핵심 보안 원칙(전 단계 공통):
- **Firestore Rules 변경 없음** — `shares`/`publicReviews`/`rateLimits`는 클라이언트 직접 접근 불가(Rules 미등록=기본 거부), 모든 접근은 **firebase-admin 서버 API 경유**.
- 비로그인 read/write는 **public read/write를 열지 않고** 서버 API로만.
- **raw IP/UA/uid 미저장**(레이트리밋은 IP+UA HMAC 해시만). `screen.code`는 텍스트로만(실행 미리보기 없음). 댓글은 React 텍스트 렌더만(XSS 실행 불가).

→ **남은 것은 코드가 아니라 운영 콘솔/키/env 설정**(이 문서 §3~§5).

---

## 2. 운영 필수 env

### 2-1. 서버 전용 (절대 `NEXT_PUBLIC_` 접두사 금지)
| env | 용도 |
|-----|------|
| `FIREBASE_PROJECT_ID` | Firebase Admin 서비스 계정 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin 서비스 계정 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin 서비스 계정 (개행은 `\n`으로 escape, 코드에서 복원) |
| `PUBLIC_REVIEW_HASH_SECRET` | 레이트리밋 clientHash(IP+UA HMAC) secret |
| `PUBLIC_REVIEW_CAPTCHA_ENABLED` | CAPTCHA 활성 스위치 (`1`/`true`) |
| `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY` | Turnstile siteverify 비밀키 |

### 2-2. public (클라이언트 노출 — `NEXT_PUBLIC_`)
| env | 용도 |
|-----|------|
| `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY` | Turnstile 위젯 site key (이게 있을 때만 viewer에 위젯 노출) |
| `NEXT_PUBLIC_FIREBASE_*` / `NEXT_PUBLIC_APP_ID` | (기존) Firebase 클라이언트 SDK 설정 |

> ⚠️ `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY`는 **서버 전용** — `NEXT_PUBLIC_` 접두사를 붙이면 비밀키가 클라이언트에 노출된다. 절대 금지.

### 2-3. 절대 금지
- **실제 secret 값을 이 문서/저장소/커밋에 넣지 않는다.** `.env.local`에만(커밋 금지 — `.gitignore`의 `.env*`로 무시됨).
- **service account JSON 파일을 커밋하지 않는다.**
- 값 채우기는 `.env.local.example`을 복사해 `.env.local`로 사용.

---

## 3. Firebase Console 수동 설정

1. **Firestore Rules 최신 게시본 확인**
   - 저장소 `firestore.rules`가 콘솔 게시본과 일치하는지 확인. S7-2 동안 Rules는 **변경하지 않았다** → 기존 단계 A 규칙(read=signedIn, write=역할 기반)이 게시되어 있어야 함.
   - `shares` / `publicReviews` / `rateLimits` 는 **Rules에 public read/write를 추가하지 않는다**(미등록=기본 거부 유지, admin만 접근).

2. **`rateLimits` 컬렉션 TTL 설정** (Console > Firestore Database > TTL)
   - 대상 컬렉션: **`rateLimits`**
   - TTL 필드: **`expiresAt`** (타입: **Firestore Timestamp**, S7-2H에서 보강 완료)
   - 효과: 윈도우 만료된 레이트리밋 문서 자동 삭제. 미설정 시 문서가 누적되나 PII 없음(해시/카운트만).
   - ⚠️ 경로 주의: 실제 데이터 경로는 `artifacts/{appId}/public/data/rateLimits`. (앱 데이터 네임스페이스)

3. **`publicReviews`는 TTL 대상 아님** — 외부 피드백 보존. 모더레이션 `deleted`는 소프트 삭제로 유지.

---

## 4. Cloudflare Turnstile 설정

1. Cloudflare 대시보드 > **Turnstile** > 위젯 추가 → **site key** + **secret key** 발급.
2. **운영 도메인(hostname) 등록** — 운영 도메인(필요 시 스테이징 포함). 미등록 도메인에서는 위젯이 동작하지 않는다.
3. env 설정:
   - `NEXT_PUBLIC_PUBLIC_REVIEW_CAPTCHA_SITE_KEY` = site key (public)
   - `PUBLIC_REVIEW_CAPTCHA_SECRET_KEY` = secret key (서버 전용)
   - `PUBLIC_REVIEW_CAPTCHA_ENABLED` = `1`
4. 배포 후 확인:
   - public viewer 댓글 폼에 보안 확인 위젯 노출 → 실제 토큰 발급.
   - 댓글 제출 시 서버 siteverify 통과 → `201`(pending 저장).
   - 토큰 없음/만료/실패 시 `403 CAPTCHA_REQUIRED` / `CAPTCHA_FAILED`.
5. ⚠️ **로컬 테스트 키와 운영 키를 혼동하지 말 것.**
   - 로컬 테스트(always-pass): site `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` → **운영에 절대 사용 금지**.

---

## 5. 배포 후 smoke QA 체크리스트

배포 후 운영 환경에서 아래를 실제 클릭으로 1회씩 확인:

- [ ] Google 로그인 가능
- [ ] 익명 상태에서 프로젝트 생성 불가 (새 프로젝트 버튼 미노출 + Google CTA)
- [ ] Google 로그인 상태에서 프로젝트 생성 가능 + 새로고침 후 유지
- [ ] 로그아웃 후 콘솔 permission-denied 없음
- [ ] 보강정보 파일 업로드 / URL 등록이 보강 단계 상단에 노출 (요구사항 모드)
- [ ] 프로토타입 코드 등록 후 화면(ScreenEditor)에 노출 + 새로고침 유지
- [ ] 고유 접속 링크 복사 후 새 탭에서 접속(resolve) 정상
- [ ] 접속 코드 복사 후 입장(resolve) 정상
- [ ] 팀원 직접 입장 가이드 안내 ↔ 실제 동작 일치
- [ ] internal share 생성 / 복사 / `#share_` resolve 정상
- [ ] public_readonly share 생성 / `/share/{shareId}` 복사 / viewer 정상
- [ ] public viewer 댓글 제출 시 pending 저장 ("검토 후 공개" 안내)
- [ ] pending 댓글이 public viewer에 미노출
- [ ] owner/editor 승인 후 public viewer에 노출
- [ ] 숨김 / 삭제 후 public viewer에서 미노출
- [ ] rate limit 초과 시 `429` + "잠시 후 다시 시도해주세요." 안내
- [ ] Turnstile 활성 상태에서 token 검증 정상(없음/실패 시 차단)
- [ ] 응답/화면에 민감 필드(ownerId/memberUids/roleByUid/createdBy/uid/IP 등) 노출 없음
- [ ] `screen.code`는 텍스트로만 표시(실행 미리보기 없음)
- [ ] B라인: 활성화 → 문서 생성 → 프로토타입 → IA/기능정의서 → 개발 전달 패키지(PRD 조립/buildHandoffPackage) 정상
- [ ] KAKE 프로젝트 무손상

> Google OAuth 인터랙티브 항목은 운영 도메인 OAuth 설정 후 실제 계정으로 확인.

---

## 6. 롤백 / 비활성화 방법 (Rules를 열지 않고 대응)

> 원칙: **문제 발생 시 Firestore Rules를 public으로 열지 말 것.** env / API / UI / 데이터(share·review 상태) 레벨에서 차단한다.

| 상황 | 대응 |
|------|------|
| **CAPTCHA 비활성화** | `PUBLIC_REVIEW_CAPTCHA_ENABLED`를 비우거나 제거 후 재배포 → 검증 통과(위젯 미노출). 다시 활성화는 `=1`. |
| **CAPTCHA 강제 활성** | `PUBLIC_REVIEW_CAPTCHA_ENABLED=1` + site/secret 설정 후 재배포. |
| **댓글 스팸 급증(레이트 강화)** | `lib/rateLimit.ts`의 `RATE_LIMITS` 상수 하향 후 재배포(코드 상수). 즉시성 필요 시 CAPTCHA 활성으로 1차 차단. |
| **특정 share 비활성화** | 해당 share의 `isEnabled=false`(ShareModal 비활성화 버튼) 또는 만료. → viewer/API 모두 `403`. |
| **모든 public_readonly 임시 차단** | 운영 정책상 가장 빠른 차단은 해당 share들 `isEnabled=false`. (대량이면 admin 스크립트로 일괄 토글 — 데이터 레벨.) |
| **부적절 댓글 즉시 제거** | 내부 "외부 피드백"에서 **숨김**(hidden) 또는 **삭제**(soft delete) → public viewer 즉시 미노출. |
| **신규 댓글 전면 보류** | 신규 댓글은 기본 `pending`(승인 전 미노출)이므로 승인을 보류하면 외부 노출 0. 추가 차단 필요 시 share `isEnabled=false`. |
| **rateLimits 누적** | Firestore TTL(`expiresAt`) 설정으로 자동 정리. 급할 경우 admin으로 컬렉션 비우기(데이터 레벨, PII 없음). |

⚠️ 어떤 경우에도 `shares`/`publicReviews`/`rateLimits`에 **public read/write Rules를 추가하지 않는다.**

---

## 7. 운영 전 보류 / 주의 항목

- **Firebase Storage(파일 업로드 라이브)**: Blaze 업그레이드 전까지 보류. S3 코드/`storage.rules`는 유지(업그레이드 후 재개). 현재 파일 메타 등록은 동작하나 실제 업로드는 버킷 미프로비저닝 시 graceful 실패.
- **Google Drive**: 외부 입력 소스(링크/참조)로만. 앱 저장소 아님.
- **rateLimits Native TTL**: 코드(Timestamp) 보강은 완료. **콘솔 TTL 정책 설정은 수동**(§3-2).
- **완전 로그아웃(익명 폴백 제거)**: 보류 — 익명 폴백은 KAKE/기존 익명 데이터 호환을 위해 유지. 단, 익명의 프로젝트 생성은 차단됨.
- **멤버십 기반 read(단계 B)**: 보류 — 현재 단계 A(read=signedIn). 비멤버는 Viewer로 보임.
- **모더레이션 알림**: 신규 pending 댓글 알림은 후속 후보(미구현).
- **데이터 위생**: 과거 검증 중 만들어진 undeletable orphan 프로젝트(`qa6_ptest`, `s72aview...` 등)는 Firebase 콘솔에서 수동 삭제 대상(앱/REST 삭제 불가). KAKE(`8DH3maHooF9WkhnZO81c`)는 삭제 금지.

---

## 8. 참고 커밋 (S7-2 시리즈)

```
40df588 chore: harden rate limit ttl for production            # S7-2H
699fd42 feat: connect captcha widget and finalize public share   # S7-2G
4362480 feat: add public review spam protection                # S7-2F
8d3d0a7 feat: add public review moderation                       # S7-2E
d95e581 feat: add internal review management for owner editor   # S7-2D
fe3fd0b feat: add public review comments for readonly shares     # S7-2C
07a0f89 feat: add public readonly share viewer                   # S7-2B-3
2d686d3 feat: add public readonly share api                      # S7-2B-2
7c2ad32 chore: add firebase admin infrastructure                 # S7-2B-1
c7953a2 feat: add share records for internal share links         # S7-2A
```
