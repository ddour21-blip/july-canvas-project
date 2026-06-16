/* July Canvas UI kit — the prototype Canvas / Screen editor.
   Toggling the bottom toolbar switches between 프로토타입 (interact) and
   기획/문서 모드 (annotate): the latter reveals the policy panel, the green
   click-to-define banner, and a numbered marker on the embedded screen. */
const { Button: JCBtn, Badge: JCBd } = window.JulyCanvasDesignSystem_d81917;

function PolicyPanel({ onClose }) {
  const ann = window.JCData.annotation;
  return (
    <aside style={{
      width: 'var(--panel-width)', flex: 'none', background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-2xl)',
      display: 'flex', flexDirection: 'column', zIndex: 'var(--z-panel)',
    }}>
      <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ font: '800 20px/1.2 var(--font-sans)', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lc n="file-text" size={20} style={{ color: 'var(--brand-600)' }} /> 기능 정책 / 기획서
            <span style={{ font: '300 18px/1 var(--font-sans)', color: 'var(--gray-300)' }}>| Policy</span>
          </h2>
          <p style={{ font: 'var(--type-meta)', color: 'var(--text-secondary)', marginTop: 6 }}>화면에 정의된 모든 UI 정책과 스펙</p>
        </div>
        <button onClick={onClose} className="jc-icon-btn jc-icon-btn--round jc-icon-btn--soft" aria-label="닫기"><Lc n="x" size={18} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--gray-25)' }}>
        <div style={{ position: 'relative', border: '2px solid var(--brand-500)', borderRadius: 'var(--radius-lg)', background: '#fff', padding: 20, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ position: 'absolute', left: -14, top: 18, width: 28, height: 28, borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            font: '800 14px/1 var(--font-sans)', border: '2px solid #fff', boxShadow: 'var(--shadow-md)' }}>{ann.number}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, marginBottom: 14 }}>
            <span className="jc-tag">v{ann.version}</span>
            <h3 style={{ font: '800 15px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{ann.title}</h3>
          </div>
          <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ann.body.map((b) => (
              <div key={b} style={{ font: '600 13px/1.4 var(--font-sans)', color: 'var(--text-secondary)' }}>{b}</div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, paddingLeft: 16, borderLeft: '2px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ font: '700 12px/1 var(--font-sans)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lc n="message-circle" size={14} /> 댓글 및 논의 {ann.comments.length}
          </h4>
          {ann.comments.map((c, i) => (
            <div key={i} className="jc-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="jc-avatar jc-avatar--sm">{c.author.charAt(0)}</span>
                  <span style={{ font: '700 13px/1 var(--font-sans)', color: 'var(--text-strong)' }}>{c.author}</span>
                </span>
                <span style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>{c.time}</span>
              </div>
              <p style={{ font: '500 13px/1.5 var(--font-sans)', color: 'var(--text-body)', marginLeft: 36 }}>{c.text}</p>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input className="jc-input" placeholder="이 정책에 대한 새로운 댓글을 남겨주세요." style={{ flex: 1 }} />
            <button className="jc-btn jc-btn--primary" style={{ width: 40, padding: 0 }} aria-label="전송"><Lc n="send" size={16} /></button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Canvas({ screen, project, onBack, onShare }) {
  const [mode, setMode] = React.useState('interact'); // interact | document
  const isDoc = mode === 'document';
  return (
    <div style={{ height: 'calc(100vh - var(--header-height))', display: 'flex', position: 'relative', overflow: 'hidden', background: 'var(--gray-100)' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* annotate banner */}
        {isDoc && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, textAlign: 'center', padding: '9px',
            background: 'var(--color-primary)', color: 'var(--color-on-primary)', font: '700 13px/1 var(--font-sans)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
            👆 기능을 정의할 UI 요소를 마우스로 클릭하세요
          </div>
        )}

        {/* top-left floating chrome */}
        <div className="jc-glass" style={{ position: 'absolute', top: 16, left: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14,
          padding: '8px 14px', borderRadius: 'var(--radius-lg)' }}>
          <button onClick={onBack} className="jc-icon-btn jc-icon-btn--sm" aria-label="뒤로"><Lc n="arrow-left" size={18} /></button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ font: '700 10px/1.3 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{project.name}</span>
            <span style={{ font: '800 14px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{screen.name}</span>
          </div>
        </div>

        {/* top-right floating chrome */}
        <div style={{ position: 'absolute', top: 16, right: 24, zIndex: 20, display: 'flex', gap: 8 }}>
          <JCBtn variant="glass" icon={<Lc n="download" />} style={{ color: 'var(--brand-700)' }}>문서 다운로드</JCBtn>
          <JCBtn variant="glass" icon={<Lc n="external-link" />} onClick={onShare}>공유 및 초대</JCBtn>
        </div>

        {/* scroll area with the framed prototype */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '88px 40px 120px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 1180, alignSelf: 'flex-start',
            background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-2xl)', overflow: 'hidden' }}>
            <KakeAdmin />
            {isDoc && (
              <div style={{ position: 'absolute', left: 150, top: 360, zIndex: 10, width: 32, height: 32, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: '2px solid #fff', boxShadow: 'var(--shadow-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 14px/1 var(--font-sans)' }}>1</div>
            )}
          </div>
        </div>

        <BottomToolbar mode={isDoc ? 'document' : 'prototype'} onToggleMode={() => setMode(isDoc ? 'interact' : 'document')} />
      </div>

      {isDoc && <PolicyPanel onClose={() => setMode('interact')} />}
    </div>
  );
}

Object.assign(window, { Canvas });
