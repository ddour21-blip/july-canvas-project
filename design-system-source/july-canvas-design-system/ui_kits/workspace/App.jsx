/* July Canvas UI kit — root app, shell layout & view router.
   Structure: [ Sidebar | ( Topbar / Content ) ] + Share modal overlay. */
function App() {
  const [view, setView] = React.useState({ name: 'dashboard' });
  const [shareOpen, setShareOpen] = React.useState(false);

  // Upgrade Lucide <i data-lucide> placeholders to <svg> after every render.
  React.useEffect(() => { window.refreshIcons(); });

  const goHome = () => setView({ name: 'dashboard' });
  const openProject = (p) => setView({ name: 'project', project: p });
  const isCanvas = view.name === 'canvas';

  let breadcrumb = [{ label: '프로젝트' }];
  if (view.name === 'project') breadcrumb = [{ label: '프로젝트', onClick: goHome }, { label: view.project.name }];
  if (isCanvas) breadcrumb = [
    { label: '프로젝트', onClick: goHome },
    { label: view.project.name, onClick: () => openProject(view.project) },
    { label: view.screen.name },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      <Sidebar current="projects" onHome={goHome} onOpenProject={openProject} />

      <div className="jc-app-bg" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar breadcrumb={breadcrumb} onShare={() => setShareOpen(true)} />
        <main style={{ flex: 1, minHeight: 0, overflowY: isCanvas ? 'hidden' : 'auto' }}>
          {view.name === 'dashboard' && (
            <Dashboard onOpenProject={openProject} onShare={() => setShareOpen(true)} />
          )}
          {view.name === 'project' && (
            <ProjectDetail
              project={view.project}
              onBack={goHome}
              onOpenScreen={(s) => setView({ name: 'canvas', project: view.project, screen: s })}
              onShare={() => setShareOpen(true)}
            />
          )}
          {isCanvas && (
            <Canvas
              project={view.project}
              screen={view.screen}
              onBack={() => openProject(view.project)}
              onShare={() => setShareOpen(true)}
            />
          )}
        </main>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
window.refreshIcons();
