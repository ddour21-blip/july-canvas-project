/* July Canvas UI kit — the embedded "KAKE ADMIN" prototype screen,
   rendered inside the canvas (recreation of the 365 클래스 맵 view). */
function KakeAdmin() {
  const rows = window.JCData.classRows;
  const tierStyle = (t) => t === 'PREMIUM'
    ? { background: 'var(--tier-prem-bg)', color: 'var(--tier-prem-fg)' }
    : { background: 'var(--tier-free-bg)', color: 'var(--tier-free-fg)' };
  return (
    <div style={{ display: 'flex', minHeight: 560, background: '#fff', font: 'var(--font-sans)' }}>
      {/* dark sidebar */}
      <aside style={{ width: 248, background: 'var(--ink)', color: 'var(--text-on-ink)', padding: 24, display: 'flex', flexDirection: 'column' }}>
        <div style={{ font: '900 20px/1 var(--font-sans)', letterSpacing: '-0.01em', marginBottom: 4 }}>
          KAKE<span style={{ color: 'var(--brand-400)' }}>ADMIN</span>
        </div>
        <div style={{ font: '500 11px/1.4 var(--font-sans)', color: 'var(--text-on-ink-dim)', marginBottom: 28 }}>통합 관리자 스튜디오</div>

        <div style={{ font: '700 10px/1 var(--font-sans)', letterSpacing: '0.06em', color: 'var(--text-on-ink-dim)', marginBottom: 12 }}>콘텐츠 관리</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)', color: 'var(--color-on-primary)', font: '700 13px/1 var(--font-sans)', marginBottom: 6 }}>
          <Lc n="list-checks" size={16} /> 365 클래스 맵
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--radius-md)',
          color: 'var(--text-on-ink-dim)', font: '600 13px/1 var(--font-sans)', marginBottom: 24 }}>
          <Lc n="flag" size={16} /> 스테이지 (허들) 관리
        </div>

        <div style={{ font: '700 10px/1 var(--font-sans)', letterSpacing: '0.06em', color: 'var(--text-on-ink-dim)', marginBottom: 12 }}>사용자 및 운영</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--radius-md)',
          color: 'var(--text-on-ink-dim)', font: '600 13px/1 var(--font-sans)' }}>
          <Lc n="users" size={16} /> 수강생 관리
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px',
            background: 'var(--ink-soft)', color: 'var(--text-on-ink)', border: '1px solid var(--glass-border-ink)',
            borderRadius: 'var(--radius-md)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }}>
            <Lc n="lock" size={15} /> 비밀번호 변경
          </button>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px',
            background: 'var(--ink-soft)', color: 'var(--text-on-ink)', border: '1px solid var(--glass-border-ink)',
            borderRadius: 'var(--radius-md)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }}>
            <Lc n="log-out" size={15} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* main */}
      <main style={{ flex: 1, padding: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ font: '800 26px/1.15 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>365 클래스 맵</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)', marginTop: 6 }}>Day 1부터 Day 365까지 커리큘럼 현황을 매핑하고 관리합니다.</p>
          </div>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer', font: '700 13px/1 var(--font-sans)',
            boxShadow: 'var(--shadow-brand)' }}>
            <Lc n="plus" size={16} /> 클래스 추가
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Day', '클래스 주제', '장르', '수업 수', '멤버십 설정', '상태', '설정'].map((h, i) => (
                <th key={h} style={{ textAlign: i > 2 && i < 6 ? 'center' : 'left', padding: '12px 8px',
                  font: '700 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '16px 8px', font: '800 13px/1 var(--font-sans)', color: 'var(--color-primary-text)' }}>{r.day}</td>
                <td style={{ padding: '16px 8px', font: '600 13px/1.3 var(--font-sans)', color: 'var(--text-strong)' }}>{r.topic}</td>
                <td style={{ padding: '16px 8px', font: '500 12px/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{r.genre}</td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <span style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '3px 10px', borderRadius: 999, font: '700 11px/1 var(--font-sans)' }}>{r.lessons}</span>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <span style={{ ...tierStyle(r.tier), padding: '4px 10px', borderRadius: 'var(--radius-sm)', font: '700 10px/1 var(--font-sans)' }}>{r.tier}</span>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <span style={{ background: r.visible ? 'var(--brand-50)' : 'var(--gray-100)', color: r.visible ? 'var(--brand-700)' : 'var(--gray-500)',
                    padding: '4px 12px', borderRadius: 'var(--radius-sm)', font: '700 11px/1 var(--font-sans)' }}>{r.visible ? '노출' : '비노출'}</span>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--border-default)',
                    padding: '5px 10px', borderRadius: 'var(--radius-sm)', font: '600 11px/1 var(--font-sans)', color: 'var(--gray-600)' }}>
                    <Lc n="pencil" size={12} /> 수정
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

Object.assign(window, { KakeAdmin });
