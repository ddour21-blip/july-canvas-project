'use client';

// 비로그인(익명) 사용자용 마케팅 랜딩. Admin 셸(사이드바/대시보드) 대신 제품 설명 + 단일 로그인 CTA.
import { type ComponentType } from 'react';
import { Folder, Share2, Sparkles } from 'lucide-react';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';

const VALUES: { icon: ComponentType<{ size?: number }>; title: string; desc: string }[] = [
  { icon: Folder, title: '조직·프로젝트 단위 관리', desc: '기획 문서와 프로토타입을 하나의 워크스페이스에서 정리합니다.' },
  { icon: Sparkles, title: '단계별 문서 자동화', desc: '브리프부터 PRD까지 기획 산출물을 단계별로 만들어 나갑니다.' },
  { icon: Share2, title: '역할 기반 협업', desc: '권한과 공유 링크로 팀원과 안전하게 함께 검토합니다.' },
];

export default function AnonymousLanding({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto">
      <section className="text-center pt-10 sm:pt-16 pb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--admin-primary-soft)] text-[var(--admin-primary-text)] text-xs font-bold mb-6">
          <Sparkles size={13} /> 제품화 기획 워크스페이스
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--admin-text-primary)] tracking-tight leading-tight">
          기획 문서와 프로토타입을
          <br className="hidden sm:block" /> 한 곳에서 제품으로
        </h1>
        <p className="text-[var(--admin-text-secondary)] mt-4 max-w-xl mx-auto leading-relaxed">
          조직과 프로젝트 단위로 기획 문서와 프로토타입을 관리하는 워크스페이스입니다. Google 계정으로 로그인하면 바로 시작할 수 있습니다.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <GoogleSignInButton onClick={onSignIn} />
          <p className="text-xs text-[var(--admin-text-muted)]">익명 상태로 둘러볼 수 있지만, 프로젝트 생성·저장은 로그인 후 가능합니다.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {VALUES.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="jca-card jca-card--pad">
              <div className="jca-iconbox mb-4">
                <Icon size={18} />
              </div>
              <h3 className="text-base font-bold text-[var(--admin-text-primary)] mb-1.5">{v.title}</h3>
              <p className="text-sm text-[var(--admin-text-secondary)] leading-relaxed">{v.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
