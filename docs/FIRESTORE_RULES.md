# Firestore 보안 규칙 — 설계 및 적용 절차

July Canvas의 owner/editor/viewer 권한을 **서버(Firestore Rules)에서 강제**하기 위한 문서입니다.
실제 규칙 코드는 [`firestore.rules`](../firestore.rules) 입니다.

> ⚠️ 이 문서를 끝까지 읽고 적용하세요. 잘못 적용하면 앱이 즉시 깨질 수 있습니다.
>
> 📦 **Storage Rules는 별개입니다.** 파일 업로드(S3)용 **Firebase Storage 규칙**은 [`storage.rules`](../storage.rules)이며, 콘솔의 **Storage > Rules**에 게시합니다(Firestore Rules와 혼동/교차 붙여넣기 금지). Storage 사용 전 콘솔에서 **Firebase Storage 활성화**(기본 버킷 생성)도 필요합니다.

---

## 1. 실제 데이터 경로

모든 컬렉션은 다음 경로 아래에 있습니다 (`lib/firestore.ts`의 `BASE` 기준):

```
artifacts/{appId}/public/data/{collection}/{docId}
```

`{appId}` = `NEXT_PUBLIC_APP_ID` (기본값 `july-canvas-app`).

사용 컬렉션: `projects`, `screens`, `documents`, `projectMembers`, `projectSources`, `comments`, `members`(전역), `mockEmails`, `screen_images` / 예약: `organizations`, `outputs`, (예정) `notifications`.

> ⚠️ **`projectSources`(S2 신규)**: 요구사항/RFP 입력 소스 메타 컬렉션. `firestore.rules`에 단계 A 스타일 규칙(read=로그인, create/update/delete=projectId 기반 owner|editor)이 추가되어 있습니다. **이 규칙을 콘솔에 게시하기 전에는 앱에서 등록/목록/삭제가 permission-denied로 동작하지 않습니다.** 아래 6번 절차대로 `firestore.rules` 전체를 다시 붙여넣어 게시하세요.

기존 QA 규칙은 아래처럼 느슨합니다:

```
match /artifacts/{appId}/public/data/{document=**} {
  allow read, write: if request.auth != null;
}
```

---

## 2. ⚠️ 핵심 제약: 컬렉션 통째 구독과 `list` 규칙

현재 앱은 컬렉션을 **필터 없이 통째로 구독**합니다:

- `CanvasApp`: `onSnapshot(col('projects'))`, `screens`, `members`, `mockEmails`, `documents`
- `ProjectDetail`: `onSnapshot(col('documents'))`, `onSnapshot(col('projectMembers'))` (클라이언트에서 projectId로 필터)

Firestore의 `list`(쿼리) 규칙은 **결과를 필터링하지 않고, 규칙을 만족하지 못할 가능성이 있으면 쿼리 전체를 거부**합니다.
따라서 `read`를 "멤버만"으로 좁히면 위 통째 구독이 **전부 실패**하여 대시보드/문서/멤버 목록이 안 보이게 됩니다.

→ 그래서 **2단계 적용 전략**을 사용합니다.

---

## 3. 적용 전략 (2단계)

### 단계 A — 지금 적용 가능 (쓰기 역할 강제 / 읽기 로그인 기반)

`firestore.rules`의 현재 내용입니다.

- **write(create/update/delete)**: 개별 문서 연산이라 `list` 문제 없음 → 역할 기반으로 안전하게 강제.
- **read**: 통째 구독 호환을 위해 `signedIn()` 유지 (로그인 사용자는 read 가능).

효과: viewer의 모든 쓰기 차단, editor의 삭제·승인·잠금·멤버관리 차단, 비멤버의 프로젝트 데이터 쓰기 차단. (read 차단은 단계 B)

### 단계 B — 앱 쿼리 리팩터 후 (멤버십 read 강제, 비멤버 차단)

`read`를 멤버십 기반으로 강제하려면 앱의 통째 구독을 **필터드 쿼리**로 바꿔야 합니다.

필요한 앱 변경:

1. `projects` 구독:
   ```ts
   query(col('projects'), where('memberUids', 'array-contains', uid))
   ```
   규칙: `allow read: if uidv() in resource.data.memberUids;`
   (신규 프로젝트는 이미 `memberUids: [ownerId]`를 저장 — 본 단계에서 코드 보완 완료.)
2. `documents` / `projectMembers` / `screens` 구독: 활성 프로젝트 기준 `where('projectId','==', activeProjectId)` 로 변경하고, 규칙에서 `isMember(resource.data.projectId)` 로 read 제한.
   - 또는 각 하위 문서에 `memberUids`를 비정규화하여 `array-contains` 쿼리.
3. 멤버 추가/제거 시 `projects.memberUids` 동기화 로직 추가 (멤버 관리 기능 — 향후 단계).
4. 복합 인덱스 필요 시 콘솔 안내에 따라 생성.

단계 B는 멤버 관리 UI(초대/권한변경)와 함께 진행하는 것이 자연스럽습니다.

---

## 4. 권한 판정 로직

우선순위 (규칙 `roleFor(projectId)`):

1. `projectMembers/{projectId}_{uid}` 문서의 `role` (결정적 ID — 본 단계 코드 보완 완료)
2. 없으면 `projects/{projectId}.roleByUid[uid]`
3. 없으면 `projects/{projectId}.ownerId == uid` → `owner`
4. 그 외 → 없음(비멤버)

> 레거시 KAKE 프로젝트는 `projectMembers`/`roleByUid`가 없어 `ownerId` 폴백으로만 판정됩니다. (테스트용, 마이그레이션 안 함)

---

## 5. 권한표

| 작업 | owner | editor | viewer | 비멤버 |
|---|---|---|---|---|
| projects read | ✅ | ✅ | ✅ | 단계A: ✅(로그인) / 단계B: ❌ |
| projects create | 본인 owner로 생성 | — | — | ❌ |
| projects update | ✅ 전체 | ✅ (roleByUid·ownerId·memberUids 제외) | ❌ | ❌ |
| projects delete | ✅ | ❌ | ❌ | ❌ |
| screens read | ✅ | ✅ | ✅ | 단계A: ✅ / 단계B: ❌ |
| screens create/update | ✅ | ✅ | ❌ | ❌ |
| screens delete | ✅ | ✅¹ | ❌ | ❌ |
| documents read | ✅ | ✅ | ✅ | 단계A: ✅ / 단계B: ❌ |
| documents create/update | ✅ | ✅ | ❌ | ❌ |
| documents 승인/잠금(status=approved, locked) | ✅ | ❌ | ❌ | ❌ |
| documents delete | ✅ | ❌ | ❌ | ❌ |
| projectMembers read | ✅ | ✅ | ✅ | 단계A: ✅ / 단계B: ❌ |
| projectMembers create/update/delete | ✅ | ❌ | ❌ | ❌ |
| projectSources read | ✅ | ✅ | ✅ | 단계A: ✅ / 단계B: ❌ |
| projectSources create/update/delete | ✅ | ✅ | ❌ | ❌ |
| comments read (예정) | ✅ | ✅ | ✅ | ❌ |
| comments create (예정) | ✅ | ✅ | ✅² | ❌ |
| comments update/delete (예정) | 작성자/owner | 작성자 | 작성자 | ❌ |
| notifications (예정) | 본인 read/update, 생성은 서버만 | | | ❌ |

¹ 현재 UI상 editor도 화면 삭제 가능 → 규칙도 editor 허용. owner-only로 강화하려면 UI도 함께 제한.
² viewer 댓글 작성은 정책상 허용(원하면 차단 가능).

---

## 6. Firebase 콘솔 적용 방법

1. Firebase 콘솔 → **Firestore Database → 규칙(Rules)** 탭.
2. [`firestore.rules`](../firestore.rules) **전체 내용**을 복사해 붙여넣기.
3. **시뮬레이터**로 검증(아래 7번 시나리오) 후 **게시(Publish)**.
4. 게시 직후 앱에서 8번 회귀 체크.

> (선택) Firebase CLI 사용 시: 프로젝트 루트에 `firebase.json`의 `"firestore": { "rules": "firestore.rules" }` 설정 후 `firebase deploy --only firestore:rules`. 현재 레포에는 CLI 설정이 없으므로 콘솔 붙여넣기를 권장합니다.

---

## 7. 적용 전 주의사항

- **단계 A 규칙만 지금 게시하세요.** 단계 B(멤버십 read)는 앱 쿼리 리팩터 전에는 게시하지 마세요 — 게시 시 대시보드/문서/멤버 목록이 비어 보입니다.
- 익명 폴백 로그인 사용자도 `request.auth != null` 이므로 단계 A read/write가 동작합니다.
- 게시 전 **현재 QA 규칙을 따로 복사해 두세요**(롤백용).
- KAKE 등 레거시 데이터는 별도 처리하지 않습니다.

### 롤백
문제가 생기면 콘솔 규칙을 아래 QA 규칙으로 되돌리고 게시:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 8. 검증 시나리오 (게시 후)

테스트용 프로젝트를 새로 만들어 (검증 후 삭제) 다음을 확인:

- **owner**: 프로젝트 read/update/delete, 화면 create/update, 문서 create/update/승인, projectMembers create/update — 모두 성공
- **editor**(roleByUid 임시 부여): 프로젝트 read·update, 화면/문서 create/update 성공 / 프로젝트 delete·멤버 관리·PRD 승인 **실패**
- **viewer**: read 성공 / 모든 write **실패**
- **비멤버**(단계 B 적용 시): 프로젝트 및 하위 read/write 실패

콘솔 **규칙 시뮬레이터**로 경로 `artifacts/july-canvas-app/public/data/documents/{id}` 등에 대해 위 역할별 read/write를 시뮬레이션하면 게시 전 확인 가능합니다.

---

## 9. 코드 측 보완 (본 단계 완료)

- `projectMembers` 문서 ID를 `{projectId}_{uid}` 결정적 ID로 생성 → 규칙 `get()` 판정 가능.
- 신규 프로젝트에 `memberUids: [ownerId]` 저장 → 단계 B의 `array-contains` read 쿼리 대비.
- `screens`/`documents`는 이미 `projectId` 필드 보유 (규칙 판정 가능).
