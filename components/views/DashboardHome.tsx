'use client';

// Admin 대시보드 홈 (admin index 기준): breadcrumb · 인사말 · tile 카드 4 · 통계 카드 3.
// 통계는 fabricate 하지 않고 실제 구독 데이터(프로젝트/문서/구성원)에서 파생.
import type { User } from 'firebase/auth';
import { ChevronRight, Plus } from 'lucide-react';
import type { Member, Project, ProjectDocument } from '@/types';

interface DashboardHomeProps {
  projects: Project[];
  documents: ProjectDocument[];
  globalMembers: Member[];
  user: User | null;
  navigate: (hash: string) => void;
  onOpenMembers: () => void;
}

const TILES = [
  { title: '워크스페이스 정보', desc: '조직명, 언어, 시간대 등 기본 설정', hash: '#settings' },
  { title: '구성원', desc: '멤버 추가 · 수정 · 상태 관리', hash: '#members' },
  { title: '권한 관리', desc: 'owner · editor · viewer 권한 위임', hash: '#members' },
  { title: '프로젝트', desc: '프로젝트 생성 · 문서 · 승인 관리', hash: '#projects' },
];

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-[var(--admin-border-subtle)] first:border-t-0 text-sm">
      <span className="text-[var(--admin-text-secondary)]">{label}</span>
      <b className="text-[var(--admin-text-primary)] font-bold">{value}</b>
    </div>
  );
}

export default function DashboardHome({ projects, documents, globalMembers, user, navigate, onOpenMembers }: DashboardHomeProps) {
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);
  const visible = new Set(myProjects.map((p) => p.id));
  const myDocs = documents.filter((d) => visible.has(d.projectId));

  const name = user?.displayName || user?.email?.split('@')[0] || '게스트';
  const memberCount = globalMembers.length;
  const activeProjects = myProjects.filter((p) => p.status && p.status !== 'draft' && p.status !== 'archived').length;
  const approvedDocs = myDocs.filter((d) => d.status === 'approved').length;
  const reviewDocs = myDocs.filter((d) => d.status === 'review').length;

  const tileNav = (hash: string) => {
    if (hash === '#members') return onOpenMembers();
    navigate(hash);
  };

  return (
    <section>
      <nav className="jca-breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('#'); }}>메인</a>
        <ChevronRight size={14} />
        <span className="jca-breadcrumb__current">대시보드</span>
      </nav>

      <h1 className="mt-5 mb-6 text-2xl font-extrabold tracking-tight text-[var(--admin-text-primary)]">
        <b>{name}</b>님, 안녕하세요!
      </h1>

      {/* tile 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TILES.map((t) => (
          <button key={t.title} type="button" className="jca-tile text-left" onClick={() => tileNav(t.hash)}>
            <div className="jca-tile__title">{t.title}</div>
            <div className="jca-tile__desc">{t.desc}</div>
          </button>
        ))}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <div className="jca-card jca-card--pad">
          <div className="jca-card__title mb-4">구성원 현황</div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-extrabold text-[var(--admin-text-primary)] leading-none">
              {memberCount}
              <span className="text-lg text-[var(--admin-text-secondary)]"> 명</span>
            </span>
            <button type="button" className="jca-btn jca-btn--soft jca-btn--sm" onClick={onOpenMembers}>
              <Plus size={15} />초대
            </button>
          </div>
          <StatRow label="사용 중" value={memberCount} />
          <StatRow label="초대 대기" value={0} />
          <StatRow label="일시 정지" value={0} />
        </div>

        <div className="jca-card jca-card--pad">
          <div className="jca-card__title mb-4">프로젝트 현황</div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-extrabold text-[var(--admin-text-primary)] leading-none">
              {myProjects.length}
              <span className="text-lg text-[var(--admin-text-secondary)]"> 개</span>
            </span>
            <button type="button" className="jca-btn jca-btn--secondary jca-btn--sm" onClick={() => navigate('#projects')}>
              목록 보기
            </button>
          </div>
          <StatRow label="진행 중" value={activeProjects} />
          <StatRow label="초안" value={myProjects.filter((p) => !p.status || p.status === 'draft').length} />
          <StatRow label="보관" value={myProjects.filter((p) => p.status === 'archived').length} />
        </div>

        <div className="jca-card jca-card--pad">
          <div className="jca-card__title mb-4">문서 현황</div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-extrabold text-[var(--admin-text-primary)] leading-none">
              {myDocs.length}
              <span className="text-lg text-[var(--admin-text-secondary)]"> 건</span>
            </span>
          </div>
          <StatRow label="승인 완료" value={approvedDocs} />
          <StatRow label="검토 중" value={reviewDocs} />
          <StatRow label="작성/초안" value={myDocs.length - approvedDocs - reviewDocs} />
        </div>
      </div>
    </section>
  );
}
