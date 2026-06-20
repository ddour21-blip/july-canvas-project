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
import { getAuth, type Auth } from 'firebase-admin/auth';
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

/** Admin 초기화 단계(자격증명 파싱/cert)에서 발생한 실패. 라우트에서 ADMIN_INIT_FAILED로 분류한다. */
export class AdminInitError extends Error {
  readonly code = 'ADMIN_INIT_FAILED' as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AdminInitError';
  }
}

/**
 * FIREBASE_PRIVATE_KEY 값을 실제 PEM 문자열로 정규화한다.
 * 다양한 배포 환경(.env 파서 / Vercel UI / base64 주입)에서 들어오는 형태를 방어적으로 처리한다:
 *  - 양끝을 감싼 따옴표(" 또는 ') 제거
 *  - escape된 개행 \\n / \\r\\n → 실제 개행, 실제 \r\n → \n 정규화
 *  - PEM 헤더가 없으면 통째로 base64 인코딩됐을 가능성 → 디코드 시도(성공 시에만 채택)
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // 양끝 따옴표 제거(전체를 감싼 경우만; 키 내부 문자는 보존).
  if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1);
  }

  // escape된 개행 복원 후 CRLF 정규화. (\\r\\n 을 먼저 처리해야 \\n 치환과 충돌하지 않음)
  key = key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  // PEM 헤더가 없다면 base64 전체 인코딩으로 주입됐을 수 있음 → 디코드 시도(검증 통과 시에만 채택).
  if (!key.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN') && decoded.includes('PRIVATE KEY')) {
        key = decoded.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
      }
    } catch {
      /* base64 가 아니면 원본 유지 */
    }
  }

  return key.trim();
}

/**
 * env에서 서비스 계정 자격증명을 읽어 검증한다.
 * - 누락된 변수는 한 번에 모아 명확한 에러 메시지로 던진다.
 * - FIREBASE_PRIVATE_KEY는 normalizePrivateKey로 실제 PEM 으로 복원한다.
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

  const privateKey = normalizePrivateKey(rawPrivateKey!);
  // 정규화 후에도 PEM 형식이 아니면 cert() 전에 명확히 실패시킨다(원인 분류 정확도↑).
  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
    throw new AdminInitError(
      '[firebaseAdmin] FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다(PEM 헤더 없음). 따옴표/개행(\\n) escape를 확인하세요.',
    );
  }

  return { projectId: projectId!, clientEmail: clientEmail!, privateKey };
}

// HMR/중복 초기화 방지를 위해 모듈 스코프에 캐시한다(lazy: getter 호출 시점에만 init).
let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/** Admin App 반환(없으면 lazy 초기화). 서버에서만 호출. 초기화 실패는 AdminInitError로 던진다. */
export function getAdminApp(): App {
  if (adminApp) return adminApp;
  // 같은 프로세스에서 이미 초기화된 default app이 있으면 재사용(중복 init 예외 방지).
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }
  try {
    const { projectId, clientEmail, privateKey } = readServiceAccount();
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
  } catch (err) {
    // 자격증명 파싱/cert 실패 → 호출부(라우트)에서 ADMIN_INIT_FAILED 로 분류 가능하도록 래핑.
    if (err instanceof AdminInitError) throw err;
    throw new AdminInitError('[firebaseAdmin] Admin 초기화에 실패했습니다(자격증명 확인 필요).', { cause: err });
  }
}

/** Admin Firestore 반환(없으면 lazy 초기화). 서버에서만 호출. */
export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;
  adminDb = getFirestore(getAdminApp());
  return adminDb;
}

/** Admin Auth 반환(ID 토큰 검증용). 서버에서만 호출. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
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

/** Admin 초기화 가능 여부를 분류한다(설정 누락 vs 자격증명 파싱 실패 vs 정상). 라우트의 에러코드 매핑용. */
export function getAdminInitError(): 'ADMIN_NOT_CONFIGURED' | 'ADMIN_INIT_FAILED' | null {
  if (!isAdminConfigured()) {
    // 어떤 변수가 누락됐는지 서버 로그로만 남긴다(값은 노출하지 않음). Vercel Runtime Log에서 원인 추적용.
    const missing = [ENV_PROJECT_ID, ENV_CLIENT_EMAIL, ENV_PRIVATE_KEY].filter((k) => !process.env[k]);
    console.error(`[firebaseAdmin] ADMIN_NOT_CONFIGURED — 누락된 서버 env: ${missing.join(', ') || '(알 수 없음)'}`);
    return 'ADMIN_NOT_CONFIGURED';
  }
  try {
    getAdminApp();
    return null;
  } catch (err) {
    // ADMIN_INIT_FAILED: env는 있으나 cert/PEM 파싱 실패(따옴표/개행 escape 등). 상세는 AdminInitError 메시지에 포함.
    console.error('[firebaseAdmin] ADMIN_INIT_FAILED', err);
    return 'ADMIN_INIT_FAILED';
  }
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
