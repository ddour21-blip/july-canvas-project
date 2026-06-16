/* July Canvas UI kit — Project detail (개요 / 문서 / 프로토타입). */
const { Button: JCB, StatusBadge: JCSB, Tabs: JCTabs, Badge: JCBg } = window.JulyCanvasDesignSystem_d81917;

function ActivationSummary({ a }) {
  const rows = [
    ['기획 의도', a.intent], ['해결하려는 문제', a.problem], ['핵심 고객', a.customer],
    ['핵심 가치', a.value], ['핵심 차별점', a.differentiator], ['MVP 범위', a.mvpScope],
  ];
  return (
    <div className="jc-card jc-card--pad">
      <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-strong)', marginBottom: 16 }}>활성화 정보</h3>
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
            <dt style={{ font: '700 11px/1.5 var(--font-sans)', color: 'var(--text-tertiary)' }}>{k}</dt>
            <dd style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)', margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Overview({ project, onTab }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <ActivationSummary a={project.activation || window.JCData.projects[0].activation} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="jc-card jc-card--pad">
          <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-strong)', marginBottom: 4 }}>최종 산출물</h3>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', marginBottom: 18 }}>코워크 담당자에게 전달할 PRD와 프로토타입 URL입니다.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <JCB variant="outline" icon={<Lc n="file-text" />} style={{ justifyContent: 'flex-start' }} onClick={() => onTab('documents')}>PRD 문서 관리로 이동</JCB>
            <JCB variant="outline" icon={<Lc n="link-2" />} style={{ justifyContent: 'flex-start' }}>프로토타입 URL 복사</JCB>
          </div>
        </div>
        <div className="jc-card jc-card--pad" style={{ background: 'var(--gradient-brand-soft)', borderColor: 'var(--brand-200)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-primary)', flex: 'none' }}>
              <Lc n="sparkles" size={22} />
            </span>
            <div>
              <h4 style={{ font: '700 15px/1.3 var(--font-sans)', color: 'var(--text-strong)' }}>다음 단계: 제품화전략 검수</h4>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                제품화전략 문서가 리뷰 상태입니다. 승인하면 IA·기능정의서 작성으로 넘어갑니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Deliverables() {
  const KIND = { MD: { c: 'var(--brand-600)', b: 'var(--brand-50)' }, PPTX: { c: 'var(--amber-600)', b: 'var(--amber-50)' }, PDF: { c: 'var(--red-600)', b: 'var(--red-50)' } };
  return (
    <div className="jc-card jc-card--pad" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lc n="package" size={18} style={{ color: 'var(--color-primary-text)' }} /> 산출물
        </h3>
        <JCB variant="outline" size="sm" icon={<Lc n="download" size={14} />}>전체 ZIP</JCB>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {window.JCData.deliverables.map((d) => {
          const k = KIND[d.kind] || KIND.MD;
          return (
            <div key={d.file} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-25)' }}>
              <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', flex: 'none', background: k.b, color: k.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '800 10px/1 var(--font-sans)' }}>{d.kind}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '700 13px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{d.title}</div>
                <div style={{ font: '500 11px/1.3 var(--font-mono)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.file} · {d.size}</div>
              </div>
              <button className="jc-icon-btn jc-icon-btn--sm" aria-label="다운로드"><Lc n="download" size={15} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocPipeline() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="jc-card jc-card--pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-strong)' }}>문서 파이프라인</h3>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
              브리프 → 시장조사 → 제품화전략 → IA → 기능정의서 → PRD 순으로 작성합니다.
            </p>
          </div>
          <JCBg tone="warning">미작성 1건</JCBg>
        </div>
        {window.JCData.documents.map((d) => (
          <div key={d.type} className="jc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--brand-50)', color: 'var(--brand-600)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '700 14px/1 var(--font-sans)' }}>{d.order}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '700 14px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{d.title}</span>
                  <span className="jc-tag jc-tag--neutral">v{d.version}</span>
                  {d.locked && <Lc n="lock" size={12} style={{ color: 'var(--text-tertiary)' }} />}
                </div>
                <span style={{ font: '500 11px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}>{d.file}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <JCSB status={d.status} kind="document" />
              <JCB variant="outline" size="sm" icon={<Lc n="download" size={14} />}>MD</JCB>
            </div>
          </div>
        ))}
      </div>
      <Deliverables />
    </div>
  );
}

function ScreensGrid({ onOpenScreen }) {
  const screens = window.JCData.screens;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <JCB icon={<Lc n="plus" />}>새 화면 추가</JCB>
      </div>
      {screens.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-2xl)', background: 'var(--gray-25)' }}>
          <span style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'var(--gray-100)', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Lc n="layout-template" size={30} /></span>
          <h3 style={{ font: '800 18px/1.2 var(--font-sans)', color: 'var(--text-strong)', marginBottom: 8 }}>등록된 화면이 없습니다</h3>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>'새 화면 추가' 버튼을 눌러 첫 번째 프로토타입을 등록해보세요.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
          {screens.map((s) => (
            <div key={s.id} className="jc-card jc-card--interactive" onClick={() => onOpenScreen(s)} style={{ overflow: 'hidden' }}>
              <div style={{ height: 132, background: 'var(--gray-50)', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-300)' }}>
                <Lc n="file-code-2" size={44} />
              </div>
              <div style={{ padding: 20 }}>
                <h3 style={{ font: '700 16px/1.2 var(--font-sans)', color: 'var(--text-strong)', marginBottom: 10 }}>{s.name}</h3>
                <span className="jc-badge jc-badge--neutral"><Lc n="message-square-plus" size={12} /> 기획/정책: {s.annotations}개</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, onBack, onOpenScreen, onShare }) {
  const [tab, setTab] = React.useState('overview');
  const tabs = [
    { key: 'overview', label: '개요' },
    { key: 'documents', label: `문서 (${window.JCData.documents.length})` },
    { key: 'screens', label: `프로토타입 (${window.JCData.screens.length})` },
  ];
  return (
    <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ font: '800 30px/1.1 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>{project.name}</h1>
            <JCSB status={project.status} />
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginTop: 8 }}>{project.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <JCB variant="outline" icon={<Lc n="external-link" />} onClick={onShare}>공유 및 초대</JCB>
          <JCB variant="danger" icon={<Lc n="trash-2" />}>삭제</JCB>
        </div>
      </div>

      <div style={{ marginBottom: 26 }}>
        <JCTabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && <Overview project={project} onTab={setTab} />}
      {tab === 'documents' && <DocPipeline />}
      {tab === 'screens' && <ScreensGrid onOpenScreen={onOpenScreen} />}
    </div>
  );
}

Object.assign(window, { ProjectDetail });
