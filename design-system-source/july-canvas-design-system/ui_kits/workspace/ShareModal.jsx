/* July Canvas UI kit — Share & members modal (공유 및 초대 / 권한). */
const { Button: JCShareBtn, Badge: JCShareBadge } = window.JulyCanvasDesignSystem_d81917;

const SHARE_ROLE = {
  owner: { label: '소유자', tone: 'brand' },
  editor: { label: '편집 가능', tone: 'success' },
  viewer: { label: '보기 전용', tone: 'neutral' },
};

function ShareModal({ open, onClose }) {
  if (!open) return null;
  const members = window.JCData.members;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'rgba(20, 26, 34, 0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-2xl)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 0' }}>
          <div>
            <h2 style={{ font: '800 20px/1.2 var(--font-sans)', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: 9 }}>
              <Lc n="user-plus" size={20} style={{ color: 'var(--brand-600)' }} /> 공유 및 초대
            </h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', marginTop: 6 }}>이메일로 팀원을 초대하고 프로젝트 권한을 설정하세요.</p>
          </div>
          <button onClick={onClose} className="jc-icon-btn jc-icon-btn--round jc-icon-btn--soft" aria-label="닫기"><Lc n="x" size={18} /></button>
        </div>

        {/* invite row */}
        <div style={{ display: 'flex', gap: 8, padding: '20px 24px' }}>
          <input className="jc-input" placeholder="이메일 주소 입력 (예: name@team.io)" style={{ flex: 1 }} />
          <select className="jc-input" style={{ width: 130, flex: 'none', cursor: 'pointer' }} defaultValue="editor">
            <option value="editor">편집 가능</option>
            <option value="viewer">보기 전용</option>
          </select>
          <JCShareBtn icon={<Lc n="send" size={15} />}>초대</JCShareBtn>
        </div>

        {/* member list */}
        <div style={{ padding: '0 24px', maxHeight: 280, overflowY: 'auto' }}>
          <div style={{ font: '700 11px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>
            참여 멤버 {members.length}명
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map((m) => {
              const r = SHARE_ROLE[m.role];
              return (
                <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 'var(--radius-md)' }}>
                  <span className="jc-avatar jc-avatar--sm">{m.name.charAt(0)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '700 13.5px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{m.name}</div>
                    <div style={{ font: '500 11.5px/1.3 var(--font-sans)', color: 'var(--text-tertiary)' }}>{m.email}</div>
                  </div>
                  {m.role === 'owner'
                    ? <JCShareBadge tone="brand">소유자</JCShareBadge>
                    : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', font: '600 12px/1 var(--font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
                        {r.label} <Lc n="chevron-down" size={14} style={{ color: 'var(--text-tertiary)' }} />
                      </span>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        {/* link footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '20px 24px 24px', padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Lc n="link-2" size={16} style={{ color: 'var(--brand-600)', flex: 'none' }} />
            <span style={{ font: '600 12.5px/1.3 var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>july.canvas/p/kake_8f2a</span>
          </div>
          <JCShareBtn variant="outline" size="sm" icon={<Lc n="copy" size={14} />}>링크 복사</JCShareBtn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ShareModal });
