'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Database,
  Download,
  Layout,
  LogOut,
  Upload,
  X,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { col, docRef } from '@/lib/firestore';
import { formatDateTime, getTime } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { ShareModal, type ShareState } from '@/components/modals/ShareModal';
import { ExportZipModal } from '@/components/modals/ExportZipModal';
import { VirtualInboxModal, EmailSimulationModal } from '@/components/modals/InboxModals';
import Dashboard from '@/components/views/Dashboard';
import ProjectDetail from '@/components/views/ProjectDetail';
import ScreenEditor from '@/components/views/ScreenEditor';
import type { Member, MockEmail, Project, ProjectDocument, Screen, ToastDetail } from '@/types';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [globalMembers, setGlobalMembers] = useState<Member[]>([]);
  const [mockEmails, setMockEmails] = useState<MockEmail[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  const [toast, setToast] = useState<ToastDetail | null>(null);
  const [shareState, setShareState] = useState<ShareState>({ isOpen: false, type: '', id: '' });
  const [backupOpen, setBackupOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('#');

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
    return () => {
      unsubProjects();
      unsubScreens();
      unsubMembers();
      unsubEmails();
      unsubDocuments();
    };
  }, [user]);

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  const unreadCount = mockEmails.filter((e) => !e.isRead).length;

  if (!isFirebaseConfigured) return <FirebaseNotice />;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // 라우트 파싱
  const routeParts = currentRoute.replace('#', '').split('_');
  let activeWorkspaceId = 'main';
  let viewType = 'dashboard';
  let viewId: string | null = null;
  let extraParam: string | null = null;

  if (routeParts[0] === 'ws') {
    activeWorkspaceId = routeParts[1];
    viewType = routeParts[2] || 'dashboard';
    viewId = routeParts[3] ?? null;
    extraParam = routeParts[4] === 'ann' ? routeParts[5] : null;
  } else {
    viewType = routeParts[0] || 'dashboard';
    viewId = routeParts[1] ?? null;
    extraParam = routeParts[2] === 'ann' ? routeParts[3] : null;
  }

  return (
    // min-w-[1024px]: 본문 최소 너비 확보. 더 좁은 뷰포트에서는 페이지 가로 스크롤로 전환되어
    // 레이아웃이 글자 단위로 무너지지 않도록 안정화한다.
    <div className="min-h-screen min-w-[1024px] bg-gray-50 text-gray-900 font-sans">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg bg-gray-800 text-white animate-in slide-in-from-top-4 fade-in font-medium whitespace-nowrap">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-green-400" />
          ) : (
            <AlertCircle size={18} className="text-red-400" />
          )}
          {toast.message}
        </div>
      )}

      <ShareModal
        isOpen={shareState.isOpen}
        type={shareState.type}
        id={shareState.id}
        onClose={() => setShareState({ ...shareState, isOpen: false })}
        workspaceId={activeWorkspaceId}
      />
      <ExportZipModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />

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

      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 cursor-pointer" onClick={() => navigate('#')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Layout size={18} />
          </div>
          <span>July 캔버스</span>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-4 font-medium">
          <button
            onClick={() => setIsInboxOpen(true)}
            className="relative flex items-center gap-1.5 hover:bg-gray-200 transition-colors bg-gray-100 px-3 py-1.5 rounded-full text-gray-700"
          >
            <BellRing size={16} className="text-blue-600" /> 알림
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" /> 실시간 동기화 중
          </div>
          {/* Google 로그인/로그아웃 */}
          {authUser && !authUser.isAnonymous ? (
            <div className="flex items-center gap-2">
              {authUser.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={authUser.photoURL} alt="" className="w-7 h-7 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  {(authUser.displayName || authUser.email || '?').charAt(0)}
                </span>
              )}
              <span className="text-gray-700 font-bold max-w-[140px] truncate">{authUser.displayName || authUser.email}</span>
              <button
                onClick={() => signOutUser()}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-full text-gray-700"
                title="로그아웃"
              >
                <LogOut size={15} /> 로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle().catch((e) => console.error('Google 로그인 실패:', e))}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-1.5 rounded-full text-white font-bold"
            >
              Google 로그인
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px]">
        {viewType === 'dashboard' && (
          <Dashboard
            projects={projects}
            navigate={navigate}
            user={user}
            globalMembers={globalMembers}
            setBackupOpen={setBackupOpen}
            setExportModalOpen={setExportModalOpen}
          />
        )}
        {viewType === 'project' && (
          <ProjectDetail
            projectId={viewId}
            projects={projects}
            screens={screens}
            navigate={navigate}
            setShareState={setShareState}
            user={user}
          />
        )}
        {viewType === 'screen' && (
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
        )}
      </main>
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
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
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
