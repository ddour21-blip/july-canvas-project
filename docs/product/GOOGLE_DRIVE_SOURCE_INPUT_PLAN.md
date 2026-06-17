# July Canvas — Google Drive 입력 소스 연결 설계 (S4-Drive)

작성: S3(Firebase Storage 업로드 코드, `0f4c0c9`) 직후. **설계/제안 문서이며 코드 변경 없음.**
선행 문서: [`SOURCE_INPUT_AND_SHARE_URL_PLAN.md`](SOURCE_INPUT_AND_SHARE_URL_PLAN.md) · [`PROJECT_MODE_STRATEGY.md`](PROJECT_MODE_STRATEGY.md)

요구사항/RFP 모드에서 Google Drive에 있는 RFP·기획서·정책표·스크린샷·프로토타입 자료를 July Canvas **입력 소스**로 연결하는 방안을 설계한다.

> **방향 고정**: Google Drive를 Firebase Storage의 **완전 대체 저장소로 쓰지 않는다.** Drive는 "외부 입력 소스"(링크/파일 참조), Storage는 "앱 원본 저장소"로 **역할을 분리**한다. 파일 원본 저장은 Blaze 업그레이드 후 Storage로 재개한다.

---

## 0. 현재 구조 (코드 기준 사실)

- **Firebase Storage(S3)**: 코드·`storage.rules`는 구현 완료(`0f4c0c9`)이나, 해당 Firebase 프로젝트가 **Storage 미프로비저닝**(Blaze 필요)이라 라이브 업로드는 보류 상태. 업로드 시 버킷 없음으로 `net::ERR_FAILED`(OPTIONS 404) → `maxUploadRetryTime`(20s) 후 graceful 실패.
- **URL 등록(S2)**: `ProjectActivationWizard` 요구사항 모드에 이미 URL 등록 UI가 있다. 유형 셀렉트(기존 서비스/경쟁·레퍼런스/프로토타입/문서/기타)가 `projectSources.type`(`url`/`reference_url`/`prototype_url`) + `urlType`로 매핑된다. → **Drive 공유 링크는 지금도 "문서"(urlType=document)로 등록 가능**(스키마 변경 없이).
- **인증**: `lib/auth.tsx`는 `GoogleAuthProvider` + `signInWithPopup`, **추가 OAuth scope 없음**(기본 프로필/이메일만). → Drive Picker/API는 **scope 추가가 필요**한 별도 작업.
- **분석 레이어**: 아직 없음(S5 예정). Drive 링크/파일 분석은 후속 API/worker에서 처리.

---

## 1. Firebase Storage 보류 사유

- Firebase Storage 활성화는 **Blaze(종량제) 요금제 업그레이드**가 전제다(무료 Spark에서 기본 버킷 프로비저닝 불가).
- 현 시점에는 Blaze 업그레이드를 보류하므로 **Storage 직접 업로드 라이브 검증을 미룬다.** S3 코드/`storage.rules`는 **그대로 유지**(삭제·후퇴 없음), 업그레이드 시 즉시 재개.
- 그동안 요구사항/RFP 자료를 받을 **보조 경로**로 Google Drive 링크/파일 연결을 도입한다(원본 바이너리 저장이 아니라 **참조 등록**).

## 2. Google Drive를 대체 저장소로 쓸 수 있는가 — 판단

**결론: 완전 대체 저장소로는 부적합. "외부 입력 소스(참조)"로만 사용.**

- Drive 파일의 소유권·수명주기는 **사용자(또는 조직)에게** 있다. July Canvas가 앱 데이터로 신뢰·관리할 수 없다(사용자가 삭제/이동/권한변경 시 깨짐).
- 권한/공유/삭제/버전 관리가 앱 저장소 모델과 어긋난다.
- 따라서 Drive는 **링크/파일 참조를 등록**해 분석 입력으로만 쓰고, **앱이 보존해야 하는 원본**은 Blaze 후 Firebase Storage에 저장한다(역할 분리).

## 3. 방식 1 — Google Drive 공유 링크 등록 (안 A)

사용자가 Drive 파일의 공유 링크를 복사해 July Canvas URL 등록 영역에 붙여넣는다.

- **장점**: 구현 최소(현 S2 URL 등록 재사용), OAuth/Picker 불필요, Blaze 불필요, 즉시 가능.
- **단점**: 비공개 파일은 분석 불가(사용자가 공유 권한을 직접 설정해야 함), 서버 접근 시 공개/공유 링크 처리 정책 필요.
- **현 상태와의 관계**: 이미 `urlType=document`로 등록 가능 → **D1은 사실상 "문구·가이드 개선"** 수준(예: "Google Drive 공유 링크도 등록할 수 있어요. 링크 보기 권한을 '링크가 있는 모든 사용자'로 설정해야 분석됩니다").
- **MVP 권장 진입점.**

## 4. 방식 2 — Google Drive 파일 선택 Picker (안 B)

July Canvas 안에서 Google Picker로 Drive 파일을 직접 선택한다.

- **장점**: UX 우수, 파일명/`mimeType`/`fileId`를 안정적으로 저장, 사용자가 링크를 복사하지 않아도 됨.
- **단점**: Google Picker API 설정 필요, **OAuth scope 추가 필요**(현재 scope 없음 → `drive.file` 등 추가), 토큰/권한/Google 검증(verification) 이슈, 서버 분석 시 Drive 파일 읽기 권한 정책 필요.
- **권장 scope**: 전체 Drive 접근(`drive`/`drive.readonly`) **금지**. **`drive.file`**(앱이 생성/선택한 파일만) + Picker로 최소 권한.
- **도입 시점**: 안 A 안정화 후, 분석 API(S5)와 함께.

## 5. 방식 3 — Google Drive를 앱 저장소처럼 사용 (한계)

July Canvas가 Drive에 파일을 업로드하고 `fileId`를 관리하는 방식.

- **한계**: 앱 저장소로 부적합 / 권한·소유권·삭제·공유 관리 복잡 / 사용자가 Drive에서 삭제하면 깨짐 / 제품화 시 유지보수 리스크 큼.
- **결론**: **1차 MVP 비추천.** 개인 실험용 fallback으로만 고려. 앱 원본 저장은 Firebase Storage(Blaze 후)로 일원화.

---

## 6. projectSources 모델 확장안

현재 `type`: `text | file | screenshot | url | reference_url | prototype_url`, 보조 `urlType: service | reference | prototype | document | other`.

### 안 A — 기존 url/document 타입 재사용 (MVP, 스키마 변경 없음)
```ts
{
  type: 'url',
  urlType: 'document',          // 또는 'reference'
  url: 'https://drive.google.com/file/d/.../view',
  title: '<사용자 입력 또는 링크>',
  status: 'pending',
}
```
- **장점**: 타입·UI·Rules 변경 0. 지금 바로 동작.
- 분석 단계(S5)에서 `url`이 Drive 도메인인지 보고 Drive 처리 분기.

### 안 B — Drive 전용 source type 추가 (Picker 도입 시)
```ts
// 제안 — 이번 단계에서 types/index.ts에 추가하지 않음
type ProjectSourceType = ... | 'drive_file';

interface ProjectSource {
  // ...
  googleDriveFileId?: string;
  googleDriveMimeType?: string;
  googleDriveWebUrl?: string;
}
```
- Picker 결과(`fileId`/`mimeType`/`webViewLink`)를 구조적으로 저장 → 분석 API가 Drive API로 안정적 접근.
- `storagePath`/`downloadUrl`(Storage)과 **공존**: Drive는 외부 참조, Storage는 앱 원본.

**권장 경로**: **MVP는 안 A**(문구 개선만), **Picker/API 붙이는 시점에 안 B로 확장**(optional 필드 추가, 기존 데이터 무영향).

---

## 7. 분석 API에서 고려할 것 (S5, 이번 미구현)

Drive 링크/파일 분석 시:
1. 공개 접근 가능한 링크인지(권한 확인).
2. Google Docs/Sheets/Slides인지(export 필요) vs 업로드된 PDF/DOCX/XLSX 원본인지.
3. export 가능한 문서 유형인지(Google 문서 → `files.export`, 바이너리 → `files.get?alt=media`).
4. 다운로드/복사 제한이 걸려 있는지.
5. 권한 오류·접근 불가 → `status: 'skipped'`(+사유), 앱은 깨지지 않음(graceful).
6. 파일 크기 제한(분석 비용/시간 보호).
7. 민감 문서 본문/추출 텍스트의 **로그 저장 금지**, 분석 결과만 `analysisResult`에.
8. 링크 유형 식별: `drive.google.com/file/d/{id}` / `docs.google.com/document|spreadsheets|presentation/d/{id}` 패턴 파싱.

## 8. 보안 / 권한 주의사항

- **전체 Drive 접근 scope(`drive`, `drive.readonly`) 금지.** 가능한 한 **`drive.file`** 또는 Picker 기반 최소 권한.
- 공개 링크 분석은 **사용자가 명시적으로 등록한 링크만** 처리(임의 크롤링 금지, SSRF·도메인 allow-list 적용 — Drive 도메인 한정).
- 비공개 링크는 권한 없으면 분석하지 않고 `skipped` 처리.
- **OAuth 토큰을 Firestore에 저장하지 않는다.** 서버 분석이 필요하면 토큰 저장/갱신 정책을 **별도 문서화**(가능하면 단기 토큰·서버 메모리·Secret Manager, 클라이언트/Firestore 노출 금지).
- 등록 자체(안 A)는 **링크 문자열 저장**일 뿐이라 추가 권한이 필요 없다(분석 단계에서만 접근 권한 이슈 발생).

---

## 9. 구현 로드맵 (D1~D5)

| 단계 | 내용 | 의존/위험 |
|---|---|---|
| **D1 ✅** | Drive **링크 등록 정책·문구 개선** — URL 등록 영역에 Drive 공유 링크 안내문구 + 공유 권한 가이드, 유형 라벨 "문서·Drive 링크"(urlType=document 유지), Drive 링크 감지 안내(drive/docs.google.com). **OAuth/스키마 변경 없음**(`chore: clarify drive link source input`). | 없음(문구·UI) |
| D2 | Drive **링크 분석 API**(S5 일부) — 공개 Drive 링크만 처리, 접근 불가 시 `skipped`, 문서 유형별 텍스트 추출 분기 | API route/worker, 도메인 allow-list |
| D3 | Google **Picker 검토** — OAuth scope(`drive.file`), `fileId` 저장 설계, 사용자 권한·서버 분석 권한, Google 검증 절차 | OAuth scope 추가(인증 변경) |
| D4 | Drive **파일 선택 UI** — 요구사항/RFP 모드에 "Google Drive에서 선택" 버튼, 선택 결과를 `projectSources`(안 B)에 저장 | Picker + 안 B 스키마 |
| D5 | **Firebase Storage 재개** — Blaze 업그레이드 후 직접 업로드 저장소로 사용. **Drive=외부 입력 소스, Storage=앱 원본 저장소**로 역할 분리 | Blaze |

각 단계 독립 커밋 + 검증 + graceful(연결/키 없어도 기존 흐름 유지) + KAKE 무손상 원칙.

## 10. 추천 결론

- **지금(코드 변경 시): 안 A(D1)** — 현 S2 URL 등록을 Drive 링크 수용으로 **문구만 확장**. OAuth·Picker·Storage 불필요, 즉시 가능, 스키마 무변경.
- **다음: D2(공개 Drive 링크 분석)** — 분석 레이어(S5)와 함께, 비공개는 `skipped`.
- **그 다음: D3/D4(Picker + `drive.file` + 안 B)** — UX 향상이 필요할 때, 최소 권한으로.
- **Drive를 앱 저장소로 쓰는 방식(방식 3)은 비추천.** 앱 원본 저장은 **D5(Blaze 후 Firebase Storage)** 로 일원화하고 Drive는 외부 입력 소스로만 유지.

---

## 부록. 변경 금지 / 주의 (본 단계)

- 코드 수정 금지 · Google Drive API/OAuth scope/Picker/파일 다운로드/Drive 분석 API 구현 금지.
- **Firebase Storage 코드(S3)·`storage.rules` 삭제 금지**(Blaze 후 재개). Firestore Rules 변경 금지. QA/알림/이메일 금지.
- `activation` 구조 유지, `projectSources` 안 A는 스키마 무변경. KAKE·`.env.local` 불변.
