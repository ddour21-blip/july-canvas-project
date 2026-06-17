// Firebase Admin 초기화 (서버 전용) — S7-2B-1 인프라
//
// 목적: 비로그인 public 공유(S7-2B 이후)에서 Firestore Rules의 public read를 열지 않고,
//       서버 라우트가 Admin 권한으로 매개 읽기를 하기 위한 기반.
//       (Admin SDK는 Rules를 우회하므로 firestore.rules는 signedIn() 그대로 유지된다.)
//
// ⚠️ 서버 전용. 클라이언트 코드/번들에서 절대 import 하지 말 것.
//    서비스 계정 자격증명은 NEXT_PUBLIC_ 접두사 없는 서버 env로만 주입한다(.env.local, 커밋 금지).
//
// 이번 단계(S7-2B-1) 범위: lazy init + env 누락 시 명확한 에러. 실제 share 조회/API는 후속 단계.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import {
  getFirestore,
  type CollectionReference,
  type Firestore,
} from 'firebase-admin/firestore';

/** 서버 전용 서비스 계정 자격증명 env 변수명 (개별 3종). */
const ENV_PROJECT_ID = 'FIREBASE_PROJECT_ID';
const ENV_CLIENT_EMAIL = 'FIREBASE_CLIENT_EMAIL';
const ENV_PRIVATE_KEY = 'FIREBASE_PRIVATE_KEY';

interface ServiceAccountCredential {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * env에서 서비스 계정 자격증명을 읽어 검증한다.
 * - 누락된 변수는 한 번에 모아 명확한 에러 메시지로 던진다.
 * - FIREBASE_PRIVATE_KEY는 .env에 한 줄로 저장되며 줄바꿈이 "\\n" 으로 escape되므로
 *   실제 줄바꿈으로 복원한다(따옴표로 감싼 경우의 바깥 따옴표도 제거).
 */
function readServiceAccount(): ServiceAccountCredential {
  const projectId = process.env[ENV_PROJECT_ID];
  const clientEmail = process.env[ENV_CLIENT_EMAIL];
  const rawPrivateKey = process.env[ENV_PRIVATE_KEY];

  const missing: string[] = [];
  if (!projectId) missing.push(ENV_PROJECT_ID);
  if (!clientEmail) missing.push(ENV_CLIENT_EMAIL);
  if (!rawPrivateKey) missing.push(ENV_PRIVATE_KEY);
  if (missing.length > 0) {
    throw new Error(
      `[firebaseAdmin] 서비스 계정 환경변수가 누락되었습니다: ${missing.join(', ')}. ` +
        `.env.local 에 ${ENV_PROJECT_ID} / ${ENV_CLIENT_EMAIL} / ${ENV_PRIVATE_KEY} 를 설정하세요(.env.local.example 참고).`,
    );
  }

  // "\\n" → 실제 줄바꿈 복원. 일부 환경(.env 파서)에서 키를 따옴표로 감싸 들어오는 경우도 정리.
  const privateKey = rawPrivateKey!
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  return { projectId: projectId!, clientEmail: clientEmail!, privateKey };
}

// HMR/중복 초기화 방지를 위해 모듈 스코프에 캐시한다(lazy: getter 호출 시점에만 init).
let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/** Admin App 반환(없으면 lazy 초기화). 서버에서만 호출. */
export function getAdminApp(): App {
  if (adminApp) return adminApp;
  // 같은 프로세스에서 이미 초기화된 default app이 있으면 재사용(중복 init 예외 방지).
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  const { projectId, clientEmail, privateKey } = readServiceAccount();
  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return adminApp;
}

/** Admin Firestore 반환(없으면 lazy 초기화). 서버에서만 호출. */
export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;
  adminDb = getFirestore(getAdminApp());
  return adminDb;
}

/**
 * 서비스 계정 env가 모두 설정되었는지 여부(초기화 시도 없이 확인).
 * 후속 API에서 "키 미설정" 안내/가드 용도. 값 자체는 노출하지 않는다.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env[ENV_PROJECT_ID] && process.env[ENV_CLIENT_EMAIL] && process.env[ENV_PRIVATE_KEY],
  );
}

// ---- Firestore 경로 (클라이언트 lib/firestore.ts 와 동일 구조: artifacts/{appId}/public/data/{collection}) ----
// 클라이언트 lib/firestore.ts 를 import 하면 클라이언트 firebase SDK가 서버 번들로 끌려오므로,
// 서버용 경로 헬퍼를 여기(Admin 전용)에 별도로 둔다. APP_ID 기본값은 lib/firebase.ts 와 일치시킨다.
const ADMIN_APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'july-canvas-app';

/** Admin Firestore 컬렉션 레퍼런스 (artifacts/{appId}/public/data/{name}). 서버 전용. */
export function adminCol(name: string): CollectionReference {
  return getAdminDb()
    .collection('artifacts')
    .doc(ADMIN_APP_ID)
    .collection('public')
    .doc('data')
    .collection(name);
}
