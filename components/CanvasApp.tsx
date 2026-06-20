'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { col, docRef } from '@/lib/firestore';
import { formatDateTime, getTime, showToast } from '@/lib/utils';
import { isShareActive, resolveShareHash } from '@/lib/shares';
import { Button } from '@/components/common/Button';
import { AdminTopbar } from '@/components/common/AdminTopbar';
import { WorkspaceSidebar } from '@/components/common/WorkspaceSidebar';
import { ShareModal, type ShareState } from '@/components/modals/ShareModal';
import { VirtualInboxModal, EmailSimulationModal } from '@/components/modals/InboxModals';
import DashboardHome from '@/components/views/DashboardHome';
import ProjectList from '@/components/views/ProjectList';
import MembersAdmin from '@/components/views/MembersAdmin';
import SettingsAdmin from '@/components/views/SettingsAdmin';
import AnonymousLanding from '@/components/views/AnonymousLanding';
import ShareFallback from '@/components/views/ShareFallback';
import ProjectDetail from '@/components/views/ProjectDetail';
import ScreenEditor from '@/components/views/ScreenEditor';

// 관리자 전용 도구(데이터 백업/복원)는 기본 숨김. NEXT_PUBLIC_ADMIN_TOOLS=1일 때만 사이드바에 노출.
const ADMIN_TOOLS = process.env.NEXT_PUBLIC_ADMIN_TOOLS === '1';
import type { Member, MockEmail, Project, ProjectDocument, Screen, ShareRecord, ToastDetail } from '@/types';

function FirebaseNotice() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
        <Database size={28} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Firebase 설정이 필요합니다</h2>
      <p className="text-gray-500 font-medium max-w-md leading-relaxed">
        프로젝트 루트에 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 font-mono text-sm">.env.local</code> 파일을 만들고{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 font-mono text-sm">NEXT_PUBLIC_FIREBASE_*</code> 환경변수를 입력한 뒤 새로고침하세요.
      </p>
    </div>
  );
}

function CanvasAppInner() {
  // 인증은 AuthProvider(useAuth)에서 관리. firebaseUser를 기존 user 변수로 사용.
  const { user: authUser, firebaseUser: user, loading, signInWithGoogle, signOutUser } = useAuth();
  // Google 로그인 사용자만 협업 UI(알림/동기화 상태/워크스페이스 사이드바)를 노출. 익명은 랜딩에 집중.
  const isGoogleUser = !!authUser && !authUser.isAnonymous;
  const [projects, setProjects] = useState<Project[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [globalMembers, setGlobalMembers] = useState<Member[]>([]);
  const [mockEmails, setMockEmails] = useState<MockEmail[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [sharesLoaded, setSharesLoaded] = useState(false);

  const [toast, setToast] = useState<ToastDetail | null>(null);
  const [shareState, setShareState] = useState<ShareState>({ isOpen: false, type: '', id: '' });
  const [backupOpen, setBackupOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('#');
  const [collapsed, setCollapsed] = useState(false);

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);

  // 해시 라우팅
  useEffect(() => {
    const handleHashChange = () => setCurrentRoute('#' + window.location.hash.replace('#', ''));
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 토스트
  useEffect(() => {
    const handler = (e: Event) => {
      setToast((e as CustomEvent<ToastDetail>).detail);
      setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  // 실시간 구독
  useEffect(() => {
    if (!user) return;
    const unsubProjects = onSnapshot(
      col('projects'),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Project[];
        data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        setProjects(data);
      },
      (err) => console.error('Firestore Error:', err),
    );
    const unsubScreens = onSnapshot(
      col('screens'),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Screen[];
        data.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
        setScreens(data);
      },
      (err) => console.error('Firestore Error:', err),
    );
    const unsubMembers = onSnapshot(
      col('members'),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Member[];
        data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        setGlobalMembers(data);
      },
      (err) => console.error('Firestore Error:', err),
    );
    const unsubEmails = onSnapshot(
      col('mockEmails'),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockEmail[];
        data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        setMockEmails(data);
      },
      (err) => console.error('Firestore Error:', err),
    );
    const unsubDocuments = onSnapshot(
      col('documents'),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectDocument[];
        setDocuments(data);
      },
      (err) => console.error('Firestore Error:', err),
    );
    const unsubShares = onSnapshot(
      col('shares'),
      (snap) => {
        setShares(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ShareRecord[]);
        setSharesLoaded(true);
      },
      (err) => console.error('Firestore Error:', err),
    );
    return () => {
      unsubProjects();
      unsubScreens();
      unsubMembers();
      unsubEmails();
      unsubDocuments();
      unsubShares();
    };
  }, [user]);

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  // 공유 링크 resolve (S7-2A): #share_{shareId} → 활성/만료 확인 후 내부 딥링크로 이동.
  // 유효하지 않으면 홈으로 보내지 않고 그 자리에 fallback 안내(ShareFallback)를 렌더한다(빈 화면 방지).
  useEffect(() => {
    const parts = currentRoute.replace('#', '').split('_');
    const rest = parts[0] === 'ws' ? parts.slice(2) : parts;
    if (rest[0] !== 'share' || !rest[1]) return;
    if (!sharesLoaded) return; // 구독 도착 전엔 대기
    const share = shares.find((s) => s.shareId === rest[1]);
    if (share && isShareActive(share)) {
      navigate(resolveShareHash(share));
    }
    // 없거나 비활성/만료 → navigate 하지 않고 render 분기에서 ShareFallback 표시
  }, [currentRoute, shares, sharesLoaded]);

  const unreadCount = mockEmails.filter((e) => !e.isRead).length;

  if (!isFirebaseConfigured) return <FirebaseNotice />;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // 라우트 파싱. `ws_{id}` 프리픽스를 떼어낸 뒤 동일 규칙으로 해석(프리픽스 유무 모두 지원).
  const routeParts = currentRoute.replace('#', '').split('_');
  let activeWorkspaceId = 'main';
  let rest = routeParts;
  if (routeParts[0] === 'ws') {
    activeWorkspaceId = routeParts[1] || 'main';
    rest = routeParts.slice(2);
  }

  const viewType = rest[0] || 'dashboard';
  const viewId: string | null = rest[1] ?? null;
  // 화면 주석 딥링크: screen_{id}_ann_{annId}
  const extraParam: string | null = rest[2] === 'ann' ? (rest[3] ?? null) : null;

  // 프로젝트 내부 딥링크: project_{id}_{overview|documents|screens|handoff} / project_{id}_document_{docId}
  // (기존 'documents'/'document_{docId}' 딥링크는 그대로 동작 — 하위 호환 유지)
  let projectInitialTab: 'overview' | 'documents' | 'screens' | 'handoff' | undefined;
  let projectInitialDocId: string | null = null;
  let projectInitialScreenNew = false;
  if (viewType === 'project') {
    const seg = rest[2];
    if (seg === 'documents' || seg === 'screens' || seg === 'handoff' || seg === 'overview') {
      projectInitialTab = seg;
      // project_{id}_screens_new → 프로토타입 탭 진입 + 새 화면 추가 모달 자동 오픈(문서 탭 CTA 연결).
      if (seg === 'screens' && rest[3] === 'new') projectInitialScreenNew = true;
    } else if (seg === 'document') {
      projectInitialTab = 'documents';
      projectInitialDocId = rest[3] ?? null;
    }
  }

  // 사이드바: 로그인 사용자의 admin 뷰에서만 노출. 화면 편집(전체화면)/공유 로딩에선 숨김.
  const showSidebar = isGoogleUser && viewType !== 'screen' && viewType !== 'share';

  // 비로그인(익명): 마케팅 랜딩을 자체 header/footer로 전체화면 노출 (admin topbar/shell 없이).
  // 단, 공개 share 로딩(#share_)·화면 딥링크(screen)는 기존 처리를 유지.
  if (!isGoogleUser && viewType !== 'screen' && viewType !== 'share') {
    return <AnonymousLanding onSignIn={() => signInWithGoogle().catch((e) => console.error('Google 로그인 실패:', e))} />;
  }

  return (
    // min-w-[1024px]: 본문 최소 너비 확보. 더 좁은 뷰포트에서는 페이지 가로 스크롤로 전환되어
    // 레이아웃이 글자 단위로 무너지지 않도록 안정화한다.
    <div className="jca-shell min-w-[1024px]" data-collapsed={collapsed ? 'true' : 'false'}>
      {toast && (
        <div className="jca-toast-region">
          <div className={`jca-toast${toast.type === 'success' ? ' jca-toast--success' : toast.type === 'error' ? ' jca-toast--danger' : ''}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}

      <ShareModal
        isOpen={shareState.isOpen}
        type={shareState.type}
        id={shareState.id}
        projectId={shareState.projectId}
        documentId={shareState.documentId}
        screenId={shareState.screenId}
        project={shareState.projectId ? projects.find((p) => p.id === shareState.projectId) ?? null : null}
        onClose={() => setShareState({ ...shareState, isOpen: false })}
      />

      <VirtualInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        emails={mockEmails}
        onOpenEmail={async (email) => {
          setSelectedEmail(email);
          setIsInboxOpen(false);
          if (!email.isRead) {
            try {
              await updateDoc(docRef('mockEmails', email.id), { isRead: true });
            } catch {
              /* noop */
            }
          }
        }}
      />
      <EmailSimulationModal isOpen={!!selectedEmail} data={selectedEmail} onClose={() => setSelectedEmail(null)} navigate={navigate} />

      {backupOpen && (
        <BackupModal
          onClose={() => setBackupOpen(false)}
          projects={projects}
          screens={screens}
          members={globalMembers}
          emails={mockEmails}
          documents={documents}
        />
      )}

      <AdminTopbar
        isGoogleUser={isGoogleUser}
        authUser={authUser}
        unreadCount={unreadCount}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        onOpenInbox={() => setIsInboxOpen(true)}
        onSignIn={() => signInWithGoogle().catch((e) => console.error('Google 로그인 실패:', e))}
        onSignOut={() => signOutUser()}
        onHome={() => navigate('#')}
      />

      <div className="jca-shell__row">
        {showSidebar && (
          <WorkspaceSidebar
            navigate={navigate}
            currentRoute={currentRoute}
            collapsed={collapsed}
            adminTools={ADMIN_TOOLS}
            onOpenBackup={() => setBackupOpen(true)}
          />
        )}
        <main className="jca-shell__main">
          {viewType === 'screen' ? (
            <ScreenEditor
              screenId={viewId}
              extraParam={extraParam}
              projects={projects}
              screens={screens}
              navigate={navigate}
              setShareState={setShareState}
              user={user}
              globalMembers={globalMembers}
              workspaceId={activeWorkspaceId}
            />
          ) : viewType === 'share' ? (
            sharesLoaded && !shares.some((s) => s.shareId === viewId && isShareActive(s)) ? (
              <ShareFallback
                onHome={() => navigate('#')}
                onSignIn={!isGoogleUser ? () => signInWithGoogle().catch((e) => console.error('Google 로그인 실패:', e)) : undefined}
              />
            ) : (
              <div className="jca-loading">
                <div className="jca-spinner" />
                <p>공유 링크를 확인하는 중...</p>
              </div>
            )
          ) : !isGoogleUser ? (
            <AnonymousLanding onSignIn={() => signInWithGoogle().catch((e) => console.error('Google 로그인 실패:', e))} />
          ) : viewType === 'project' ? (
            <ProjectDetail
              projectId={viewId}
              projects={projects}
              screens={screens}
              navigate={navigate}
              setShareState={setShareState}
              user={user}
              initialTab={projectInitialTab}
              initialDocId={projectInitialDocId}
              initialScreenNew={projectInitialScreenNew}
            />
          ) : (
            <div className="jca-content">
              {viewType === 'projects' ? (
                <ProjectList projects={projects} screens={screens} documents={documents} user={user} navigate={navigate} />
              ) : viewType === 'members' ? (
                <MembersAdmin globalMembers={globalMembers} navigate={navigate} />
              ) : viewType === 'settings' ? (
                <SettingsAdmin navigate={navigate} />
              ) : (
                <DashboardHome
                  projects={projects}
                  documents={documents}
                  globalMembers={globalMembers}
                  user={user}
                  navigate={navigate}
                  onOpenMembers={() => navigate('#members')}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CanvasApp() {
  return (
    <AuthProvider>
      <CanvasAppInner />
    </AuthProvider>
  );
}

// --- 데이터 백업/복원 모달 ---
function BackupModal({
  onClose,
  projects,
  screens,
  members,
  emails,
  documents,
}: {
  onClose: () => void;
  projects: Project[];
  screens: Screen[];
  members: Member[];
  emails: MockEmail[];
  documents: ProjectDocument[];
}) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="text-blue-600" /> 데이터 백업 및 복원
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-5 border border-gray-200 rounded-2xl bg-gray-50">
            <h3 className="font-bold text-gray-800 mb-2">현재 작업 파일로 내보내기</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              프로젝트, 화면, 작성된 모든 기획서를 JSON 파일로 다운로드하여 보관합니다.
            </p>
            <Button
              icon={Download}
              className="w-full"
              onClick={() => {
                const exportData = { projects, screens, members, emails, documents, timestamp: Date.now() };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `july_canvas_backup_${formatDateTime(Date.now()).replace(/[:.\s]/g, '')}.json`;
                a.click();
              }}
            >
              백업 파일 다운로드
            </Button>
          </div>

          <div className="p-5 border border-blue-100 rounded-2xl bg-blue-50/30">
            <h3 className="font-bold text-gray-800 mb-2">백업 파일 불러오기</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              이전에 다운로드한 JSON 백업 파일을 업로드하여 데이터를 복원합니다.
            </p>
            <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 cursor-pointer w-full">
              <Upload size={18} /> 백업 파일 업로드
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const data = JSON.parse(String(event.target?.result));
                      if (!data.projects || !data.screens) throw new Error('Invalid');
                      const batch = writeBatch(db);
                      data.projects.forEach((p: Project) => batch.set(docRef('projects', p.id), p));
                      data.screens.forEach((s: Screen) => batch.set(docRef('screens', s.id), s));
                      data.members?.forEach((m: Member) => batch.set(docRef('members', m.id), m));
                      data.documents?.forEach((d: ProjectDocument) => batch.set(docRef('documents', d.id), d));
                      await batch.commit();
                      onClose();
                    } catch {
                      /* invalid file */
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
