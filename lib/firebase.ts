// Firebase 초기화 (환경변수 기반)
// 기존 코드는 Canvas 전용 전역변수(__firebase_config 등)에 의존했으나,
// 실제 Next.js 배포에서 동작하도록 NEXT_PUBLIC_FIREBASE_* 환경변수를 사용합니다.
//
// .env.local 예시:
//   NEXT_PUBLIC_FIREBASE_API_KEY=...
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
//   NEXT_PUBLIC_FIREBASE_APP_ID=...
//   NEXT_PUBLIC_APP_ID=july-canvas   (Firestore 경로 네임스페이스, 선택)

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Firestore 경로 네임스페이스. 기존 'artifacts/{appId}/...' 구조를 유지. */
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'july-canvas-app';

/** 필수 설정이 채워졌는지 여부 (미설정 시 안내 화면 표시) */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

// HMR/중복 초기화 방지
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 미설정 상태에서 getAuth는 invalid-api-key 예외를 던지므로, 설정된 경우에만 초기화합니다.
// (미설정 시 CanvasApp이 안내 화면을 표시하고 auth/db 사용 경로는 모두 가드됩니다.)
export const auth: Auth = isFirebaseConfigured ? getAuth(app) : (undefined as unknown as Auth);
export const db: Firestore = getFirestore(app);
export default app;
