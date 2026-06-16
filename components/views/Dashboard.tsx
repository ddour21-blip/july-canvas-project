'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { ChevronRight, Database, Folder, Globe, Layout, Plus, Trash2, Users, X } from 'lucide-react';
import type { Member, Project, ProjectStatus, Screen } from '@/types';

const STATUS_LABEL: Record<ProjectStatus, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-gray-100 text-gray-600' },
  active: { label: '활성', cls: 'bg-blue-100 text-blue-700' },
  review: { label: '리뷰', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', cls: 'bg-green-100 text-green-700' },
  handoff: { label: '전달됨', cls: 'bg-purple-100 text-purple-700' },
};

interface DashboardProps {
  projects: Project[];
  screens: Screen[];
  navigate: (hash: string) => void;
  user: User | null;
  globalMembers: Member[];
  setBackupOpen: (v: boolean) => void;
  setExportModalOpen: (v: boolean) => void;
}

export default function Dashboard({
  projects,
  screens,
  navigate,
  user,
  globalMembers,
  setBackupOpen,
  setExportModalOpen,
}: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });

  const isGlobalEditor = projects.length === 0 || projects.some((p) => !p.ownerId || p.ownerId === user?.uid);
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const ref = await addDoc(col('projects'), {
        name: newProjectName,
        ownerId: user?.uid || null,
        status: 'draft' as ProjectStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setNewProjectName('');
      navigate(`#project_${ref.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    navigate(`#${accessCode.trim().replace(/^#/, '')}`);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await addDoc(col('members'), {
        nickname: newMemberName.trim(),
        email: newMemberEmail.trim() || null,
        createdAt: serverTimestamp(),
      });
      setNewMemberName('');
      setNewMemberEmail('');
      showToast('팀원이 추가되었습니다. 이제 모든 프로젝트에서 멘션할 수 있습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setConfirmState({
      isOpen: true,
      title: '팀원 삭제',
      msg: '이 팀원을 삭제하시겠습니까?',
      action: async () => {
        await deleteDoc(docRef('members', memberId));
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('팀원이 삭제되었습니다.');
      },
    });
  };

  const handleDeleteProjectClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: '프로젝트 삭제',
      msg: `'${project.name}' 프로젝트와 하위 화면이 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`,
      action: async () => {
        const projectScreens = screens.filter((s) => s.projectId === project.id);
        await deleteDoc(docRef('projects', project.id));
        if (projectScreens.length > 0) {
          const batch = writeBatch(db);
          projectScreens.forEach((s) => batch.delete(docRef('screens', s.id)));
          await batch.commit();
        }
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('프로젝트가 삭제되었습니다.');
      },
    });
  };

  return (
    <div className="p-10">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">내 프로젝트</h1>
          <p className="text-gray-500 mt-2">기획 문서와 프로토타입을 관리할 프로젝트를 선택하거나 접속 코드로 입장하세요.</p>
        </div>
        <div className="flex gap-4 items-center">
          <form
            onSubmit={handleJoinByCode}
            className="flex bg-white border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-sm h-[44px] transition-shadow"
          >
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="접속 코드 (예: project_123)"
              className="px-4 py-2 outline-none w-56 text-sm font-medium text-gray-800"
            />
            <button
              type="submit"
              className="bg-gray-50 hover:bg-blue-50 hover:text-blue-600 px-5 py-2 text-sm font-bold text-gray-600 border-l border-gray-300 transition-colors"
            >
              바로 입장
            </button>
          </form>
          {isGlobalEditor && (
            <>
              <Button variant="outline" icon={Globe} onClick={() => setExportModalOpen(true)} className="h-[44px] px-5 shadow-sm text-gray-700 bg-white border-gray-300 hover:bg-gray-50">
                배포 안내
              </Button>
              <Button variant="secondary" icon={Database} onClick={() => setBackupOpen(true)} className="h-[44px] px-5 shadow-sm">
                데이터 백업/복원
              </Button>
              <Button variant="secondary" icon={Users} onClick={() => setIsMemberModalOpen(true)} className="h-[44px] px-5 shadow-sm">
                팀원 관리 ({globalMembers.length})
              </Button>
              <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="h-[44px] px-6 shadow-sm">
                새 프로젝트
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {myProjects.map((project) => {
          const status = STATUS_LABEL[project.status ?? 'draft'];
          return (
            <div
              key={project.id}
              onClick={() => navigate(`#project_${project.id}`)}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer transition-all group relative"
            >
              <button
                onClick={(e) => handleDeleteProjectClick(e, project)}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-100"
                title="프로젝트 삭제"
              >
                <Trash2 size={16} />
              </button>
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Folder size={28} />
                </div>
                <h2 className="text-xl font-bold truncate pr-12">{project.name}</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                <p className="text-sm font-medium text-gray-500 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                  입장 <ChevronRight size={16} />
                </p>
              </div>
            </div>
          );
        })}
        {myProjects.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
            <Layout size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">등록된 프로젝트가 없습니다</h3>
            <p className="text-gray-500 mb-6">위 입력창에 접속 코드를 입력하거나 새 프로젝트를 생성하세요.</p>
          </div>
        )}
      </div>

      {isModalOpen && isGlobalEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-6">새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름 (예: 쇼핑몰 앱 리뉴얼)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-8 text-lg"
                autoFocus
                required
              />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={!newProjectName.trim()}>
                  생성하기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && isGlobalEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-blue-600" /> 전체 팀원 관리 (멘션 대상)
              </h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              댓글에서 <b>@닉네임</b>으로 멘션할 팀원을 등록하세요. 이메일을 입력하면 추후 이메일 알림 대상으로 사용됩니다.
            </p>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-2 mb-6">
              {globalMembers.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-sm font-medium">등록된 팀원이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {globalMembers.map((m) => (
                    <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center text-xs uppercase">
                          {m.nickname.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{m.nickname}</div>
                          {m.email && <div className="text-[11px] text-gray-400">{m.email}</div>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMember(m.id)} className="text-gray-300 hover:text-red-500 p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={handleAddMember} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1">
                <Plus size={16} /> 팀원 추가하기
              </h4>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="닉네임 (예: 김기획)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="이메일 (선택)"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="submit" className="shrink-0 px-6 py-2 text-sm" disabled={!newMemberName}>
                    추가
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
