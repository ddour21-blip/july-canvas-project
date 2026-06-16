/* July Canvas UI kit — Dashboard / organization home (내 프로젝트). */
const { Button: JCButton, StatusBadge: JCStatusBadge, AvatarStack: JCDashStack } = window.JulyCanvasDesignSystem_d81917;

function ProjectCard({ project, onOpen }) {
  const people = window.JCData.members.slice(0, project.members);
  return (
    <div className="jc-card jc-card--interactive jc-card--pad" onClick={() => onOpen(project)}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 'var(--radius-lg)', display: 'inline-flex', flex: 'none',
          alignItems: 'center', justifyContent: 'center', background: 'var(--brand-50)', color: 'var(--brand-600)',
        }}>
          <Lc n="folder-kanban" size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ font: '700 16px/1.3 var(--font-sans)', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</h2>
          <div style={{ marginTop: 6 }}><JCStatusBadge status={project.status} /></div>
        </div>
      </div>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', minHeight: 36 }}>{project.desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, font: '600 11.5px/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lc n="layout-template" size={13} /> 화면 {project.screens}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lc n="file-text" size={13} /> 문서 {project.docs}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, borderTop: '1px solid var(--border-subtle)' }}>
        <JCDashStack people={people} max={3} size="sm" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: '600 11.5px/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>
          <Lc n="clock" size={13} /> {project.updated}
        </span>
      </div>
    </div>
  );
}

function ActivityRail() {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="jc-card jc-card--pad">
        <h3 style={{ font: '700 14px/1 var(--font-sans)', color: 'var(--text-strong)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Lc n="activity" size={16} style={{ color: 'var(--color-primary-text)' }} /> 최근 활동
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {window.JCData.activity.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 11 }}>
              <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', flex: 'none', background: 'var(--gray-50)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lc n={a.icon} size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '500 12.5px/1.45 var(--font-sans)', color: 'var(--text-body)' }}>
                  <b style={{ color: 'var(--text-strong)' }}>{a.who}</b>님이 {a.what}
                </div>
                <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 5 }}>{a.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Dashboard({ onOpenProject, onShare }) {
  const projects = window.JCData.projects;
  return (
    <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: '800 28px/1.15 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>내 프로젝트</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginTop: 8 }}>
            기획 문서와 프로토타입을 관리할 프로젝트를 선택하거나 접속 코드로 입장하세요.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <form className="jc-card" onSubmit={(e) => e.preventDefault()}
            style={{ display: 'flex', alignItems: 'center', height: 40, overflow: 'hidden', padding: 0 }}>
            <input className="jc-input" placeholder="접속 코드 (예: project_123)"
              style={{ border: 'none', width: 190, height: '100%', boxShadow: 'none' }} />
            <button style={{ height: '100%', padding: '0 16px', border: 'none', borderLeft: '1px solid var(--border-default)', whiteSpace: 'nowrap',
              background: 'var(--gray-50)', font: '700 13px/1 var(--font-sans)', color: 'var(--gray-600)', cursor: 'pointer' }}>바로 입장</button>
          </form>
          <JCButton variant="secondary" icon={<Lc n="database" />}>데이터 백업/복원</JCButton>
          <JCButton variant="secondary" icon={<Lc n="users" />} onClick={onShare}>팀원 관리 ({window.JCData.members.length})</JCButton>
          <JCButton icon={<Lc n="plus" />}>새 프로젝트</JCButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 18 }}>
          {projects.map((p) => <ProjectCard key={p.id} project={p} onOpen={onOpenProject} />)}
        </div>
        <ActivityRail />
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
