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
 * 사용자의 프로젝트 역할 계산 (순수 함수, 훅 아님 — 목록/맵에서도 사용 가능).
 * - roleByUid가 있으면 그 값 사용 (신규 프로젝트)
 * - 없으면(레거시: KAKE 등) 기존 규칙: ownerId 없음/일치 → owner, 그 외 → viewer
 */
export function getRole(
  project: Project | null | undefined,
  uid: string | null | undefined,
): ProjectRole | null {
  if (!project || !uid) return null;
  if (project.roleByUid && project.roleByUid[uid]) return project.roleByUid[uid];
  if (!project.ownerId || project.ownerId === uid) return 'owner';
  return 'viewer';
}

export interface ProjectPermissions {
  role: ProjectRole | null;
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
  /** owner|editor: 문서/프로토타입/정책 편집 */
  canEdit: boolean;
  /** owner: 프로젝트 삭제 */
  canDelete: boolean;
  /** owner: 최종 승인/잠금 */
  canApprove: boolean;
  /** owner: 멤버 관리 */
  canManageMembers: boolean;
  /** owner: 초대/공유 */
  canInvite: boolean;
  /** owner|editor: 화면 추가/수정/삭제 */
  canCreateScreen: boolean;
  /** owner|editor: 문서 생성/수정 */
  canEditDocument: boolean;
  /** 모든 멤버: 다운로드 */
  canDownload: boolean;
  /** 모든 멤버: 댓글 작성 */
  canComment: boolean;
  /** owner|editor: 백업/복원 */
  canBackup: boolean;
}

export function permissionsFor(role: ProjectRole | null): ProjectPermissions {
  const isOwner = role === 'owner';
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';
  const canEdit = isOwner || isEditor;
  const isMember = isOwner || isEditor || isViewer;
  return {
    role,
    isOwner,
    isEditor,
    isViewer,
    canEdit,
    canDelete: isOwner,
    canApprove: isOwner,
    canManageMembers: isOwner,
    canInvite: isOwner,
    canCreateScreen: canEdit,
    canEditDocument: canEdit,
    canDownload: isMember,
    canComment: isMember,
    canBackup: canEdit,
  };
}

/** 순수 함수 버전 (훅 아님): 목록/맵에서 카드별 권한 계산용 */
export function getPermissions(
  project: Project | null | undefined,
  uid: string | null | undefined,
): ProjectPermissions {
  return permissionsFor(getRole(project, uid));
}

/** 현재 로그인 사용자의 프로젝트 권한 (훅) */
export function useRole(project: Project | null | undefined): ProjectPermissions {
  const { user } = useAuth();
  return permissionsFor(getRole(project, user?.uid ?? null));
}

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
  guest: 'Guest',
};
export const roleLabel = (role: ProjectRole | null): string => (role ? ROLE_LABEL[role] : '-');
