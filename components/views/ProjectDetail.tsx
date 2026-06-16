'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { deleteProjectCascade } from '@/lib/projects';
import { copyToClipboard, getTime, showToast } from '@/lib/utils';
import { DOCUMENT_ORDER } from '@/lib/documents';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { ShareState } from '@/components/modals/ShareModal';
import ProjectActivationWizard from './ProjectActivationWizard';
import ProjectDocuments from './ProjectDocuments';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  Layout,
  Link2,
  MessageSquarePlus,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react';
import type { Project, ProjectDocument, ProjectMember, ProjectStatus, Screen } from '@/types';

const STATUS_LABEL: Record<ProjectStatus, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-gray-100 text-gray-600' },
  active: { label: '활성', cls: 'bg-blue-100 text-blue-700' },
  review: { label: '리뷰', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', cls: 'bg-green-100 text-green-700' },
  archived: { label: '보관', cls: 'bg-gray-200 text-gray-500' },
  handoff: { label: '전달됨', cls: 'bg-purple-100 text-purple-700' },
};

type Tab = 'overview' | 'documents' | 'screens';

interface ProjectDetailProps {
  projectId: string | null;
  projects: Project[];
  screens: Screen[];
  navigate: (hash: string) => void;
  setShareState: (s: ShareState) => void;
  user: User | null;
}

export default function ProjectDetail({ projectId, projects, screens, navigate, setShareState, user }: ProjectDetailProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [screenName, setScreenName] = useState('');
  const [screenCode, setScreenCode] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const project = projects.find((p) => p.id === projectId);
  const projectScreens = useMemo(() => screens.filter((s) => s.projectId === projectId), [screens, projectId]);

  // 프로젝트 문서 실시간 구독 (전체 구독 후 클라이언트 필터)
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(col('documents'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectDocument[];
      setDocuments(data.filter((d) => d.projectId === projectId).sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt)));
    });
    return () => unsub();
  }, [projectId]);

  // 프로젝트 멤버 실시간 구독
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(col('projectMembers'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProjectMember[];
      setMembers(data.filter((m) => m.projectId === projectId && m.status !== 'removed'));
    });
    return () => unsub();
  }, [projectId]);

  if (!project) return null;
  const isOwner = !project.ownerId || project.ownerId === user?.uid;
  const isEditor = isOwner; // 1차: owner === editor. 권한 분화는 2차 작업.
  const status = STATUS_LABEL[project.status ?? 'draft'];
  const isActivated = project.status && project.status !== 'draft';

  const handleAddScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenName.trim() || !screenCode.trim()) return;
    try {
      const ref = await addDoc(col('screens'), {
        projectId,
        name: screenName,
        code: screenCode,
        annotations: [],
        ownerId: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setScreenName('');
      setScreenCode('');
      navigate(`#screen_${ref.id}`);
      showToast('화면이 성공적으로 추가되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteProject = async () => {
    // 프로젝트 + 화면 + 문서 + 멤버 일괄 삭제 (orphan 방지)
    await deleteProjectCascade(project.id);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    navigate('#');
    showToast('프로젝트가 삭제되었습니다.');
  };

  const executeDeleteScreen = async (screenId: string) => {
    await deleteDoc(docRef('screens', screenId));
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    showToast('화면이 성공적으로 삭제되었습니다.');
  };

  const copyPrototypeUrl = () => {
    const firstScreen = projectScreens[0];
    if (!firstScreen) {
      showToast('등록된 프로토타입 화면이 없습니다.', 'error');
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#screen_${firstScreen.id}`;
    if (copyToClipboard(url)) showToast('프로토타입 URL이 복사되었습니다.');
    else showToast('복사 실패', 'error');
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'documents', label: `문서 (${documents.length})` },
    { key: 'screens', label: `프로토타입 (${projectScreens.length})` },
  ];

  return (
    <div className="p-10">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      {showWizard && (
        <ProjectActivationWizard project={project} onClose={() => setShowWizard(false)} onActivated={() => setTab('documents')} />
      )}

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center text-sm font-medium text-gray-500">
          <button onClick={() => navigate('#')} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <Folder size={16} /> 프로젝트 목록
          </button>
          <ChevronRight size={16} className="mx-3 text-gray-300" />
          <span className="text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{project.name}</span>
          <span className={`ml-3 text-xs px-2 py-1 rounded-full font-bold ${status.cls}`}>{status.label}</span>
          {!isEditor && <span className="ml-3 bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">👁️ 보기 전용 모드</span>}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-end gap-6 mb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
          <p className="text-gray-500 mt-3 text-lg">기획 문서와 프로토타입을 한 곳에서 관리합니다.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" icon={ExternalLink} onClick={() => setShareState({ isOpen: true, type: 'project', id: project.id })}>
            공유 및 초대
          </Button>
          {isEditor && (
            <Button
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              icon={Trash2}
              onClick={() =>
                setConfirmState({
                  isOpen: true,
                  title: '프로젝트 삭제',
                  msg: `'${project.name}' 프로젝트와 하위 화면·문서·멤버가 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`,
                  action: executeDeleteProject,
                })
              }
            >
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 개요 탭 */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <ProjectInfoCard
            project={project}
            statusLabel={status.label}
            statusCls={status.cls}
            members={members}
            documents={documents}
            screenCount={projectScreens.length}
          />
          {!isActivated ? (
            <div className="py-16 text-center border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-5">
                <Rocket size={30} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">프로젝트를 활성화하세요</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
                기획 의도·문제·고객·가치·MVP 범위 등을 입력하면 브리프/시장조사/제품화전략 문서가 자동 생성됩니다.
              </p>
              {isEditor && (
                <Button icon={Rocket} onClick={() => setShowWizard(true)} className="mx-auto px-7 py-3">
                  활성화 시작하기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ActivationSummary project={project} />
              <div className="space-y-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">최종 산출물</h3>
                  <p className="text-sm text-gray-500 mb-5">코워크 담당자에게 전달할 PRD와 프로토타입 URL입니다.</p>
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" icon={FileText} onClick={() => setTab('documents')} className="justify-start">
                      PRD 문서 관리로 이동
                    </Button>
                    <Button variant="outline" icon={Link2} onClick={copyPrototypeUrl} className="justify-start">
                      프로토타입 URL 복사
                    </Button>
                  </div>
                </div>
                {isEditor && (
                  <Button variant="secondary" icon={Rocket} onClick={() => setShowWizard(true)} className="w-full">
                    활성화 정보 수정
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 문서 탭 */}
      {tab === 'documents' && (
        <>
          {!isActivated ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">먼저 프로젝트를 활성화하세요</h3>
              <p className="text-gray-500 mb-6">활성화하면 기본 기획 문서가 생성됩니다.</p>
              {isEditor && (
                <Button icon={Rocket} onClick={() => setShowWizard(true)} className="mx-auto">
                  활성화 시작하기
                </Button>
              )}
            </div>
          ) : (
            <ProjectDocuments project={project} documents={documents} screens={screens} isEditor={isEditor} isOwner={isOwner} />
          )}
        </>
      )}

      {/* 프로토타입(화면) 탭 */}
      {tab === 'screens' && (
        <>
          <div className="flex justify-end mb-6">
            {isEditor && (
              <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="shadow-md">
                새 화면 추가
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {projectScreens.map((screen) => (
              <div
                key={screen.id}
                onClick={() => navigate(`#screen_${screen.id}`)}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group relative"
              >
                {isEditor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmState({
                        isOpen: true,
                        title: '화면 삭제',
                        msg: `'${screen.name}' 화면과 등록된 데이터가 삭제됩니다. 진행하시겠습니까?`,
                        action: () => executeDeleteScreen(screen.id),
                      });
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="h-40 bg-gray-50 border-b border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-400 transition-colors">
                  <FileCode2 size={48} />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-2 truncate">{screen.name}</h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold">
                      <MessageSquarePlus size={12} /> 기획/정책: {(screen.annotations || []).length}개
                    </div>
                  </div>
                  <div className="mt-6 text-blue-600 font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                    캔버스 열기 <ArrowLeft size={16} className="rotate-180" />
                  </div>
                </div>
              </div>
            ))}
            {projectScreens.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                <Layout size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">등록된 화면이 없습니다</h3>
                <p className="text-gray-500 mb-6">
                  {isEditor ? "'새 화면 추가' 버튼을 눌러 첫 번째 프로토타입을 등록해보세요." : '이 프로젝트에는 아직 등록된 화면이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {isModalOpen && isEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl flex flex-col h-[85vh] animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-6">새 화면(프로토타입) 추가</h2>
            <form onSubmit={handleAddScreen} className="flex flex-col flex-1 gap-6 overflow-hidden">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">화면 이름</label>
                <input
                  type="text"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  placeholder="예: 메인 랜딩 페이지, 로그인 모달"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <label className="block text-sm font-bold text-gray-700 mb-2">UI 코드</label>
                <textarea
                  value={screenCode}
                  onChange={(e) => setScreenCode(e.target.value)}
                  className="w-full flex-1 p-5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none bg-gray-50"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-auto">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit" className="px-8">
                  저장 및 생성
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectInfoCard({
  project,
  statusLabel,
  statusCls,
  members,
  documents,
  screenCount,
}: {
  project: Project;
  statusLabel: string;
  statusCls: string;
  members: ProjectMember[];
  documents: ProjectDocument[];
  screenCount: number;
}) {
  const owner = members.find((m) => m.role === 'owner');
  const ownerLabel = owner?.displayName || owner?.email || (project.ownerId ? '소유자(레거시)' : '—');
  const prd = documents.find((d) => d.type === 'prd');
  const prdStatus = prd ? (prd.status === 'approved' ? '승인 완료' : '작성 중') : '미생성';
  const docProgress = `${documents.length} / ${DOCUMENT_ORDER.length}`;

  const items: { label: string; value: React.ReactNode }[] = [
    { label: '상태', value: <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span> },
    { label: 'Owner', value: ownerLabel },
    { label: '참여 멤버', value: `${members.length}명` },
    { label: '문서 진행', value: docProgress },
    { label: '프로토타입 화면', value: `${screenCount}개` },
    { label: 'PRD 승인', value: prdStatus },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-gray-900 text-lg mb-4">{project.name}</h3>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-1">
            <dt className="text-xs font-bold text-gray-400">{it.label}</dt>
            <dd className="text-sm font-medium text-gray-800">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ActivationSummary({ project }: { project: Project }) {
  const a = project.activation;
  if (!a) return null;
  const rows: { label: string; value: string }[] = [
    { label: '기획 의도', value: a.intent },
    { label: '해결하려는 문제', value: a.problem },
    { label: '핵심 고객', value: a.customer },
    { label: '핵심 가치', value: a.value },
    { label: '핵심 차별점', value: a.differentiator },
    { label: '수익 구조', value: a.revenue },
    { label: '최초 진입 시장', value: a.market },
    { label: 'MVP 범위', value: a.mvpScope },
    { label: '나중에 추가할 기능', value: a.laterScope },
    { label: '참고 레퍼런스', value: a.references },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-gray-900 text-lg mb-4">활성화 정보</h3>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[120px_1fr] gap-3">
            <dt className="text-xs font-bold text-gray-400 pt-0.5">{r.label}</dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{r.value?.trim() || <span className="text-gray-300">미입력</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
