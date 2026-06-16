/* July Canvas UI kit — workspace shell: Logo, Sidebar, Topbar, BottomToolbar.
   Structured layout: left nav (org → projects) · top actions · content · right panel. */
const { IconButton: JCIconButton, Badge: JCBadge, AvatarStack: JCAvatarStack, LiveIndicator: JCLive, Avatar: JCAvatar } =
  window.JulyCanvasDesignSystem_d81917;

const STATUS_DOT = {
  active: 'var(--brand-500)', review: 'var(--amber-500)', approved: 'var(--green-500)',
  draft: 'var(--gray-300)', archived: 'var(--slate-500)',
};
const ROLE_LABEL = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };

function Logo({ size = 30, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: onClick ? 'pointer' : 'default', userSelect: 'none' }}>
      <img src="../../assets/logo-mark.svg" width={size} height={size} alt="" />
      <span style={{ font: '800 17px/1 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>
        July <span style={{ color: 'var(--color-primary-text)' }}>캔버스</span>
      </span>
    </div>
  );
}

/* ---- Left navigation: organization → projects --------------------- */
function Sidebar({ current, onHome, onOpenProject }) {
  const org = window.JCData.org;
  const me = window.JCData.members[0];
  const recents = window.JCData.projects.slice(0, 4);
  const nav = [
    { key: 'projects', label: '프로젝트', icon: 'folder-kanban', active: current !== 'mywork' && current !== 'favorites' && current !== 'members' },
    { key: 'mywork', label: '내 업무', icon: 'square-check-big' },
    { key: 'favorites', label: '즐겨찾기', icon: 'star' },
    { key: 'members', label: '팀원', icon: 'users' },
  ];
  return (
    <aside style={{
      width: 'var(--sidebar-width)', flex: 'none', height: '100vh', position: 'sticky', top: 0,
      background: 'var(--surface-card)', borderRight: '1px solid var(--border-default)',
      display: 'flex', flexDirection: 'column', padding: '16px 12px',
    }}>
      {/* org switcher */}
      <button style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: '10px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        background: 'var(--gray-25)', cursor: 'pointer', marginBottom: 18,
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 'var(--radius-md)', flex: 'none', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-brand)', color: 'var(--color-on-primary)',
          font: '800 14px/1 var(--font-sans)', boxShadow: 'var(--shadow-brand)',
        }}>JC</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', font: '800 14px/1.2 var(--font-sans)', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</span>
          <span style={{ display: 'block', font: '500 11px/1.3 var(--font-sans)', color: 'var(--text-tertiary)' }}>{org.plan}</span>
        </span>
        <Lc n="chevrons-up-down" size={16} style={{ color: 'var(--text-tertiary)', flex: 'none' }} />
      </button>

      {/* primary nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map((it) => (
          <button key={it.key} onClick={it.key === 'projects' ? onHome : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              background: it.active ? 'var(--surface-active)' : 'transparent',
              color: it.active ? 'var(--brand-700)' : 'var(--text-secondary)',
              font: `${it.active ? 700 : 600} 13.5px/1 var(--font-sans)`,
            }}>
            <Lc n={it.icon} size={17} style={{ color: it.active ? 'var(--brand-600)' : 'var(--text-tertiary)', flex: 'none' }} /> {it.label}
          </button>
        ))}
      </nav>

      {/* recent projects */}
      <div style={{ marginTop: 24, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', marginBottom: 8 }}>
          <span style={{ font: '700 10.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>최근 프로젝트</span>
          <Lc n="plus" size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {recents.map((p) => (
            <button key={p.id} onClick={() => onOpenProject(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'transparent',
                color: 'var(--text-body)', font: '600 13px/1.2 var(--font-sans)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_DOT[p.status] || 'var(--gray-300)', flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* user card */}
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px',
          borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}>
          <span className="jc-avatar jc-avatar--sm">{me.name.charAt(0)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: '700 13px/1.2 var(--font-sans)', color: 'var(--text-strong)' }}>{me.name}</span>
            <span style={{ display: 'block', font: '500 11px/1.3 var(--font-sans)', color: 'var(--text-tertiary)' }}>{ROLE_LABEL[me.role]} · {me.email}</span>
          </span>
          <Lc n="settings" size={16} style={{ color: 'var(--text-tertiary)', flex: 'none' }} />
        </button>
      </div>
    </aside>
  );
}

/* ---- Notifications dropdown --------------------------------------- */
function NotifMenu({ onClose }) {
  const items = window.JCData.notifications;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, zIndex: 100,
        background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ font: '800 14px/1 var(--font-sans)', color: 'var(--text-strong)' }}>알림</span>
          <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--color-primary-text)', cursor: 'pointer' }}>모두 읽음</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {items.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: n.unread ? 'var(--brand-25)' : '#fff' }}>
              <span className="jc-avatar jc-avatar--sm" style={{ background: 'var(--brand-100)' }}>{n.who.charAt(0)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 12.5px/1.45 var(--font-sans)', color: 'var(--text-body)' }}>
                  <b style={{ color: 'var(--text-strong)' }}>{n.who}</b> · {n.text}
                </div>
                <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 5 }}>{n.when}</div>
              </div>
              {n.unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--brand-500)', flex: 'none', marginTop: 5 }} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- Topbar: breadcrumb · search · actions ------------------------ */
function Topbar({ breadcrumb = [], onShare }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unread = window.JCData.notifications.filter((n) => n.unread).length;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 'var(--z-sticky)',
      height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px 0 24px', gap: 16, background: 'var(--glass-fill-strong)',
      backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--border-default)',
    }}>
      {/* breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, font: '600 13.5px/1 var(--font-sans)' }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Lc n="chevron-right" size={15} style={{ color: 'var(--gray-300)', flex: 'none' }} />}
            <button onClick={b.onClick} disabled={!b.onClick} style={{
              background: 'none', border: 'none', cursor: b.onClick ? 'pointer' : 'default', padding: 0, font: 'inherit',
              color: i === breadcrumb.length - 1 ? 'var(--text-strong)' : 'var(--text-secondary)',
              fontWeight: i === breadcrumb.length - 1 ? 800 : 600, whiteSpace: 'nowrap',
            }}>{b.label}</button>
          </React.Fragment>
        ))}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', width: 220,
          background: 'var(--gray-50)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)',
        }}>
          <Lc n="search" size={15} style={{ color: 'var(--text-tertiary)', flex: 'none' }} />
          <input placeholder="프로젝트 · 문서 검색" style={{ border: 'none', background: 'none', outline: 'none', width: '100%', font: '500 13px/1 var(--font-sans)', color: 'var(--text-body)' }} />
        </div>
        <JCLive />
        <div style={{ width: 1, height: 22, background: 'var(--border-default)' }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNotifOpen((v) => !v)} className="jc-icon-btn" style={{ position: 'relative' }} aria-label="알림">
            <Lc n="bell" size={18} />
            {unread > 0 && <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', background: 'var(--red-500)', color: '#fff', borderRadius: 999, font: '700 9px/15px var(--font-sans)', textAlign: 'center' }}>{unread}</span>}
          </button>
          {notifOpen && <NotifMenu onClose={() => setNotifOpen(false)} />}
        </div>
        <button onClick={onShare} className="jc-btn jc-btn--primary jc-btn--sm" style={{ paddingLeft: 12, paddingRight: 14 }}>
          <Lc n="user-plus" size={15} /> 공유
        </button>
        <JCAvatarStack people={window.JCData.members} max={3} size="sm" />
      </div>
    </header>
  );
}

/* ---- Floating canvas toolbar -------------------------------------- */
function BottomToolbar({ mode, onToggleMode }) {
  const isDoc = mode === 'document';
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      zIndex: 'var(--z-toolbar)', display: 'flex', alignItems: 'center', gap: 4,
      padding: '8px 10px', borderRadius: 'var(--radius-pill)',
      background: 'var(--glass-fill-strong)', border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: 'var(--shadow-xl)',
    }}>
      <span style={{ display: 'inline-flex', padding: '0 6px', color: 'var(--gray-300)', cursor: 'grab' }}>
        <Lc n="grip-vertical" size={18} />
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999,
        background: 'var(--green-50)', color: 'var(--green-700)', font: '700 13px/1 var(--font-sans)', whiteSpace: 'nowrap',
      }}>
        <span className="jc-live-dot" /> 실시간 공유 켜짐
      </span>
      <span style={{ width: 1, height: 22, background: 'var(--border-default)', margin: '0 6px' }} />
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999,
        background: 'var(--brand-50)', color: 'var(--brand-700)', border: 'none', cursor: 'pointer',
        font: '700 13px/1 var(--font-sans)', whiteSpace: 'nowrap',
      }}>
        <Lc n="history" size={16} /> 전체 히스토리
      </button>
      <span style={{ width: 1, height: 22, background: 'var(--border-default)', margin: '0 6px' }} />
      <span style={{ font: '700 13px/1 var(--font-sans)', color: isDoc ? 'var(--text-tertiary)' : 'var(--text-strong)', padding: '0 4px', whiteSpace: 'nowrap' }}>프로토타입</span>
      <button onClick={onToggleMode} aria-label="모드 전환" style={{
        width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
        background: isDoc ? 'var(--brand-500)' : 'var(--gray-300)', transition: 'background var(--dur-normal) var(--ease-standard)',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: isDoc ? 23 : 3, width: 20, height: 20, borderRadius: 999,
          background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left var(--dur-normal) var(--ease-standard)',
        }} />
      </button>
      <span style={{ font: '700 13px/1 var(--font-sans)', color: isDoc ? 'var(--text-strong)' : 'var(--text-tertiary)', padding: '0 4px', whiteSpace: 'nowrap' }}>기획/문서 모드</span>
    </div>
  );
}

Object.assign(window, { Logo, Sidebar, Topbar, BottomToolbar, STATUS_DOT, ROLE_LABEL });
