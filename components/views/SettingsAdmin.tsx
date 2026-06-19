'use client';

// 워크스페이스 정보 (#settings) — admin label-left form 레이아웃.
// 현재는 정보 표시 중심(저장 연동 없음 — Firestore/조직 스키마 변경 금지 원칙). 데모 양식.
import { ChevronRight } from 'lucide-react';
import { showToast } from '@/lib/utils';

const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'july-canvas-app';

export default function SettingsAdmin({ navigate }: { navigate: (hash: string) => void }) {
  const host = typeof window !== 'undefined' ? window.location.host : 'july.canvas.work';

  return (
    <section>
      <nav className="jca-breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('#'); }}>메인</a>
        <ChevronRight size={14} />
        <span>설정</span>
        <ChevronRight size={14} />
        <span className="jca-breadcrumb__current">워크스페이스 정보</span>
      </nav>

      <div className="jca-page-head">
        <div>
          <div className="jca-page-head__title">워크스페이스 정보</div>
          <p className="jca-page-head__desc">조직 기본 정보와 표시 설정입니다.</p>
        </div>
        <div className="jca-page-head__actions">
          <button type="button" className="jca-btn jca-btn--primary" onClick={() => showToast('설정 저장은 준비 중입니다.')}>
            저장
          </button>
        </div>
      </div>

      <div className="jca-card jca-card--pad" style={{ maxWidth: 760 }}>
        <div className="jca-card__title mb-2">기본 정보</div>
        <div className="jca-form-row">
          <div className="jca-form-row__label">도메인</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--admin-text-primary)]">{host}</span>
          </div>
        </div>
        <div className="jca-form-row">
          <div className="jca-form-row__label">워크스페이스 ID</div>
          <div className="text-sm text-[var(--admin-text-secondary)] leading-[var(--admin-form-h)]">{APP_ID}</div>
        </div>
        <div className="jca-form-row">
          <div className="jca-form-row__label">기업/단체명<span className="jca-field__req">*</span></div>
          <div>
            <input className="jca-input" defaultValue="July Production" />
          </div>
        </div>

        <div className="jca-card__title mt-6 mb-2">언어 · 시간대</div>
        <div className="jca-form-row">
          <div className="jca-form-row__label">언어</div>
          <div style={{ maxWidth: 280 }}>
            <select className="jca-select" defaultValue="ko">
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
        <div className="jca-form-row">
          <div className="jca-form-row__label">시간대</div>
          <div style={{ maxWidth: 360 }}>
            <select className="jca-select" defaultValue="seoul">
              <option value="seoul">서울, 대한민국 (GMT+09:00)</option>
              <option value="tokyo">도쿄, 일본 (GMT+09:00)</option>
            </select>
          </div>
        </div>

        <div className="jca-alert jca-alert--info mt-6">
          <div className="jca-alert__body">이 화면은 표시용 양식입니다. 조직/저장 연동은 권한 구조 단계에서 별도로 진행됩니다.</div>
        </div>
      </div>
    </section>
  );
}
