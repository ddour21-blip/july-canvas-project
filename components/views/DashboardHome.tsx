'use client';

// Home (시안 light workspace) — AI 기획 시작 hero + 입력 + 이어서 할 작업 + 우측 "자동으로 준비되는 결과".
// 실제 데이터/상태/라우팅 유지: hero 입력은 실제 프로젝트(draft)를 생성하고 activation.intent 를 prefill 한 뒤
// ProjectDetail(활성화 위저드)로 이동한다. 통계/이어서 할 작업은 구독 데이터에서 파생하며 더미로 대체하지 않는다.
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { getTime, nowMs } from '@/lib/utils';
import { deriveNextAction } from '@/lib/pipeline';
import { NewProjectStartModal } from '@/components/common/NewProjectStartModal';
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  Network,
  PackageCheck,
  PanelsTopLeft,
  Paperclip,
  Search,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import type { Member, Project, ProjectDocument, ProjectMode } from '@/types';

interface DashboardHomeProps {
  projects: Project[];
  documents: ProjectDocument[];
  globalMembers: Member[];
  user: User | null;
  navigate: (hash: string) => void;
  onOpenMembers: () => void;
}

const HERO_STEPS = [
  { icon: FileText, t: '서비스 한 줄 설명', d: '만들고 싶은 서비스를 한 줄로 적어요' },
  { icon: Paperclip, t: '참고 자료 추가', d: '있다면 참고 URL·문서를 더해요' },
  { icon: Wand2, t: 'AI 자동 생성', d: '브리프부터 개발 전달까지 정리해요' },
];

// 우측 "자동으로 준비되는 결과" — 파이프라인 산출물 미리보기(제품 설명용 정적 목록).
const ARTIFACTS: { icon: typeof FileText; label: string }[] = [
  { icon: FileText, label: '프로젝트 브리프' },
  { icon: Search, label: '시장 조사 · 레퍼런스' },
  { icon: Target, label: '제품화 전략' },
  { icon: Network, label: '정보구조(IA)' },
  { icon: ListChecks, label: '기능 명세 · PRD' },
  { icon: PanelsTopLeft, label: '화면 설계 · 프로토타입' },
  { icon: PackageCheck, label: '개발 전달 패키지' },
];

function relative(ts: Project['updatedAt']): string {
  const ms = getTime(ts);
  if (!ms) return '방금 전';
  const min = Math.floor((nowMs() - ms) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function DashboardHome({ projects, documents, globalMembers, user, navigate, onOpenMembers }: DashboardHomeProps) {
  const [idea, setIdea] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [startMode, setStartMode] = useState<ProjectMode>('idea_productization');

  const canCreate = !!user && !user.isAnonymous;
  const name = user?.displayName || user?.email?.split('@')[0] || '게스트';
  const myProjects = projects.filter((p) => !p.ownerId || p.ownerId === user?.uid);
  const myDocs = documents.filter((d) => myProjects.some((p) => p.id === d.projectId));

  // 이어서 할 작업: 최근 수정된 프로젝트 상위 2개(실제 데이터).
  const recent = [...myProjects]
    .sort((a, b) => getTime(b.updatedAt ?? b.createdAt) - getTime(a.updatedAt ?? a.createdAt))
    .slice(0, 2);

  // 모든 시작 진입점은 공용 NewProjectStartModal 을 연다(hero 입력/모드 prefill).
  const openStart = (mode: ProjectMode) => {
    setStartMode(mode);
    setStartOpen(true);
  };

  return (
    <section>
      <div className="jca-ws-split">
        <div className="jca-ws-main">
          <span className="jca-hero__eyebrow">
            <Sparkles size={13} /> AI 기획 자동화 워크스페이스
          </span>
          <h1 className="jca-hero__title">복잡한 기획, 이제 AI와 함께 쉬워집니다</h1>
          <p className="jca-hero__sub">{name}님, 아이디어를 입력하면 프로젝트를 만들고, AI 기획 시작으로 기획 문서를 이어서 완성합니다.</p>

          {/* AI 시작 입력 카드 */}
          <div className="jca-hero-card">
            <div className="jca-hero-steps">
              {HERO_STEPS.map((s) => (
                <div key={s.t} className="jca-hero-step">
                  <span className="jca-hero-step__ic"><s.icon size={18} /></span>
                  <div className="min-w-0">
                    <div className="jca-hero-step__t">{s.t}</div>
                    <div className="jca-hero-step__d">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              className="jca-hero-input"
              placeholder="예: 여행 장소와 일정을 자동으로 정리해주는 앱을 만들고 싶어요. 저장한 장소나 참고 URL을 넣으면 AI가 일정·예산까지 정리해줍니다."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={!canCreate}
            />

            <div className="jca-hero-foot">
              <span className="jca-meta">참고 자료(URL·문서)는 다음 단계에서 추가할 수 있어요.</span>
              <button
                type="button"
                className="jca-btn jca-btn--primary jca-btn--lg"
                onClick={() => openStart('idea_productization')}
                disabled={!canCreate}
              >
                <ArrowRight size={16} /> AI로 시작하기
              </button>
            </div>
          </div>

          {/* 이어서 할 작업 */}
          <div className="jca-ws-h">
            <span className="jca-ws-h__t">이어서 할 작업</span>
            {myProjects.length > 0 && (
              <span className="jca-ws-h__a" onClick={() => navigate('#projects')}>모든 프로젝트 보기</span>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="jca-card jca-card--pad text-center">
              <p className="text-sm text-[var(--admin-text-secondary)]">아직 진행 중인 프로젝트가 없습니다. 위에서 새로 시작해 보세요.</p>
            </div>
          ) : (
            <div className="jca-ws-2col">
              {recent.map((p) => {
                const pDocs = documents.filter((d) => d.projectId === p.id);
                const next = deriveNextAction(p, pDocs, []);
                return (
                  <button key={p.id} type="button" className="jca-tile text-left" onClick={() => navigate(`#project_${p.id}`)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="jca-tile__title truncate">{p.name}</div>
                      <span className="jca-meta">{relative(p.updatedAt ?? p.createdAt)}</span>
                    </div>
                    <div className="jca-tile__desc mt-1 inline-flex items-center gap-1.5 text-[var(--color-primary-text)] font-bold">
                      {next ? <>다음: {next.label} <ArrowRight size={14} /></> : <>이어서 작업하기 <ArrowRight size={14} /></>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 어떻게 시작할까요 */}
          <div className="jca-ws-h">
            <span className="jca-ws-h__t">어떻게 시작할까요?</span>
          </div>
          <div className="jca-ws-2col">
            <button
              type="button"
              className="jca-tile text-left"
              onClick={() => openStart('idea_productization')}
              disabled={!canCreate}
            >
              <span className="jca-hero-step__ic mb-3"><Lightbulb size={18} /></span>
              <div className="jca-tile__title">아이디어 제품화</div>
              <div className="jca-tile__desc">아이디어를 시장조사·제품화 전략으로 발전시켜요.</div>
            </button>
            <button
              type="button"
              className="jca-tile text-left"
              onClick={() => openStart('requirement_planning')}
              disabled={!canCreate}
            >
              <span className="jca-hero-step__ic mb-3"><ClipboardList size={18} /></span>
              <div className="jca-tile__title">요구사항 · RFP 기반</div>
              <div className="jca-tile__desc">전달받은 요구사항을 기획·전달 문서로 정리해요.</div>
            </button>
          </div>
        </div>

        {/* 우측: 자동으로 준비되는 결과 */}
        <aside className="jca-ws-rail">
          <div className="jca-rail-card">
            <div className="jca-rail-card__t">자동으로 준비되는 결과</div>
            {ARTIFACTS.map((a) => (
              <div key={a.label} className="jca-artifact">
                <span className="jca-artifact__ic"><a.icon size={16} /></span>
                <span className="jca-artifact__t">{a.label}</span>
              </div>
            ))}
            <p className="mt-3 pt-3 border-t border-[var(--admin-border-subtle)] text-xs text-[var(--admin-text-muted)] leading-relaxed">
              한 줄 입력만으로 위 산출물 초안이 순서대로 정리됩니다. 각 단계는 검토·수정할 수 있어요.
            </p>
          </div>

          <div className="jca-rail-card mt-4">
            <div className="jca-rail-card__t">내 워크스페이스</div>
            <div className="jca-sumrow">
              <span className="text-[var(--admin-text-secondary)]">프로젝트</span>
              <b className="text-[var(--admin-text-primary)]">{myProjects.length}</b>
            </div>
            <div className="jca-sumrow">
              <span className="text-[var(--admin-text-secondary)]">작성된 산출물</span>
              <b className="text-[var(--admin-text-primary)]">{myDocs.length}</b>
            </div>
            <div className="jca-sumrow">
              <span className="text-[var(--admin-text-secondary)]">구성원</span>
              <b className="text-[var(--admin-text-primary)]">{globalMembers.length}</b>
            </div>
            <button type="button" className="jca-btn jca-btn--secondary jca-btn--sm jca-btn--block mt-4" onClick={onOpenMembers}>
              구성원 관리
            </button>
          </div>
        </aside>
      </div>

      <NewProjectStartModal
        isOpen={startOpen}
        onClose={() => setStartOpen(false)}
        user={user}
        navigate={navigate}
        initialIntent={idea}
        initialMode={startMode}
      />
    </section>
  );
}
