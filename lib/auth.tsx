'use client';

// Google 로그인 기반 인증 컨텍스트.
// - Google 로그인을 1차 인증으로 제공
// - 로그인 사용자가 없으면 익명 로그인으로 자동 폴백 (개발/QA 용)
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import type { AuthUser, Project, ProjectRole } from '@/types';

interface AuthContextValue {
  /** 표시용 사용자 정보 (uid/email/displayName/photoURL/isAnonymous) */
  user: AuthUser | null;
  /** Firestore/기존 컴포넌트 전달용 원본 Firebase User */
  firebaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toAuthUser = (u: User | null): AuthUser | null =>
  u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, isAnonymous: u.isAnonymous } : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // 로그인 사용자가 없으면 익명 로그인으로 폴백 (다음 콜백에서 사용자 세팅됨)
        signInAnonymously(auth).catch((e) => console.error('Anonymous fallback error:', e));
        return;
      }
      setFirebaseUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOutUser = async () => {
    // signOut 시 onAuthStateChanged(null) → 익명 폴백으로 재로그인되어 QA 모드 유지
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user: toAuthUser(firebaseUser), firebaseUser, loading, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * 현재 사용자의 프로젝트 역할 반환.
 * - roleByUid가 있으면 그 값 사용 (신규 프로젝트)
 * - 없으면(레거시: KAKE 등) 기존 규칙: ownerId 없음/일치 → owner, 그 외 → viewer
 */
export function useRole(project: Project | null | undefined): ProjectRole | null {
  const { user } = useAuth();
  if (!project || !user) return null;
  if (project.roleByUid && project.roleByUid[user.uid]) return project.roleByUid[user.uid];
  if (!project.ownerId || project.ownerId === user.uid) return 'owner';
  return 'viewer';
}
