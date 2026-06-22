// PrototypeSpec(짧은 화면 구조 JSON) → self-contained 클릭형 HTML 변환 (deterministic, 외부 의존 없음).
// Claude는 HTML/JS/CSS를 만들지 않고 이 Spec만 반환한다. HTML 생성은 전적으로 이 코드가 담당한다.
// 출력 HTML: <!doctype html> 시작, 인라인 CSS/JS, 외부 CDN/이미지/폰트/라이브러리 없음, iframe 단독 실행.
// layout별로 화면 UI 구조를 다르게 렌더해 실제 모바일 앱 프로토타입처럼 보이게 한다.

export interface PrototypeAction {
  label: string;
  targetScreenId: string;
}
export interface PrototypeCard {
  title: string;
  body: string;
  targetScreenId?: string;
}
export interface PrototypeFormField {
  label: string;
  placeholder: string;
}
export interface PrototypeMetric {
  label: string;
  value: string;
  caption?: string;
}
export interface PrototypeListItem {
  title: string;
  body: string;
}
export type ScreenLayout = 'home' | 'input' | 'result' | 'dashboard' | 'detail' | 'pricing' | 'settings';
export type ProductType = 'mobile-app' | 'web-app' | 'admin' | 'landing';
export type VisualTone = 'clean' | 'premium' | 'friendly' | 'professional' | 'playful';

export interface PrototypeScreen {
  id: string;
  name: string;
  layout: ScreenLayout;
  purpose?: string;
  headline?: string;
  body?: string;
  primaryAction?: PrototypeAction | null;
  secondaryAction?: PrototypeAction | null;
  cards?: PrototypeCard[];
  formFields?: PrototypeFormField[];
  metrics?: PrototypeMetric[];
  listItems?: PrototypeListItem[];
}
export interface PrototypeSpec {
  title: string;
  description: string;
  productType: ProductType;
  visualTone: VisualTone;
  primaryColor: string;
  screens: PrototypeScreen[];
}

// HTML 텍스트 escape (모든 사용자/AI 문자열에 적용).
const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// screen id 안전화: 영문 소문자/숫자/-/_ 만 허용.
const sid = (v: unknown): string =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'screen';

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const LAYOUTS: ScreenLayout[] = ['home', 'input', 'result', 'dashboard', 'detail', 'pricing', 'settings'];
const LAYOUT_SEQUENCE: ScreenLayout[] = ['home', 'input', 'result', 'pricing', 'detail'];
const DEFAULT_COLOR = '#06C755';

// 안전한 hex 색상만 허용(#rgb / #rrggbb). 아니면 기본값.
const safeColor = (v: unknown): string => {
  const s = str(v);
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : DEFAULT_COLOR;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** 원시 JSON(Claude 출력) → 검증·정규화된 PrototypeSpec. 화면이 없으면 null. */
export function normalizePrototypeSpec(raw: unknown): PrototypeSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rawScreens = Array.isArray(r.screens) ? r.screens : [];
  if (!rawScreens.length) return null;

  const action = (a: unknown): PrototypeAction | null => {
    if (!a || typeof a !== 'object') return null;
    const o = a as Record<string, unknown>;
    const label = str(o.label);
    const rawTarget = str(o.targetScreenId);
    if (!label || !rawTarget) return null;
    return { label, targetScreenId: sid(rawTarget) };
  };

  const seen = new Set<string>();
  const screens: PrototypeScreen[] = [];
  for (let i = 0; i < Math.min(rawScreens.length, 5); i++) {
    const s = rawScreens[i];
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    let id = sid(o.id || o.name);
    while (seen.has(id)) id = sid(`${id}-${seen.size + 1}`);
    seen.add(id);

    const layout: ScreenLayout = LAYOUTS.includes(o.layout as ScreenLayout)
      ? (o.layout as ScreenLayout)
      : LAYOUT_SEQUENCE[screens.length] ?? 'detail';

    const cards: PrototypeCard[] = [];
    if (Array.isArray(o.cards)) {
      for (const c of o.cards.slice(0, 6) as unknown[]) {
        if (!c || typeof c !== 'object') continue;
        const co = c as Record<string, unknown>;
        const title = str(co.title);
        if (!title) continue;
        const rawTarget = str(co.targetScreenId);
        cards.push({ title, body: str(co.body), targetScreenId: rawTarget ? sid(rawTarget) : undefined });
      }
    }
    const formFields: PrototypeFormField[] = Array.isArray(o.formFields)
      ? (o.formFields.slice(0, 5) as unknown[])
          .map((f) => (f && typeof f === 'object' ? (f as Record<string, unknown>) : {}))
          .map((f) => ({ label: str(f.label), placeholder: str(f.placeholder) }))
          .filter((f) => f.label || f.placeholder)
      : [];
    const metrics: PrototypeMetric[] = Array.isArray(o.metrics)
      ? (o.metrics.slice(0, 4) as unknown[])
          .map((m) => (m && typeof m === 'object' ? (m as Record<string, unknown>) : {}))
          .map((m) => ({ label: str(m.label), value: str(m.value), caption: str(m.caption) || undefined }))
          .filter((m) => m.label || m.value)
      : [];
    const listItems: PrototypeListItem[] = Array.isArray(o.listItems)
      ? (o.listItems.slice(0, 6) as unknown[])
          .map((l) => (l && typeof l === 'object' ? (l as Record<string, unknown>) : {}))
          .map((l) => ({ title: str(l.title), body: str(l.body) }))
          .filter((l) => l.title || l.body)
      : [];

    screens.push({
      id,
      name: str(o.name) || id,
      layout,
      purpose: str(o.purpose),
      headline: str(o.headline),
      body: str(o.body),
      primaryAction: action(o.primaryAction),
      secondaryAction: action(o.secondaryAction),
      cards,
      formFields,
      metrics,
      listItems,
    });
  }
  if (!screens.length) return null;

  // 타깃 id 검증: 없으면 비클릭 처리.
  const ids = new Set(screens.map((s) => s.id));
  const valid = (t?: string) => (t && ids.has(t) ? t : '');
  for (const s of screens) {
    if (s.primaryAction && !valid(s.primaryAction.targetScreenId)) s.primaryAction = null;
    if (s.secondaryAction && !valid(s.secondaryAction.targetScreenId)) s.secondaryAction = null;
    s.cards = (s.cards ?? []).map((c) => ({ ...c, targetScreenId: valid(c.targetScreenId) || undefined }));
    // layout별 더미 데이터 보강(빈 화면 방지).
    fillDefaults(s);
  }

  return {
    title: str(r.title) || '프로토타입',
    description: str(r.description),
    productType: (['mobile-app', 'web-app', 'admin', 'landing'] as ProductType[]).includes(r.productType as ProductType)
      ? (r.productType as ProductType)
      : 'mobile-app',
    visualTone: (['clean', 'premium', 'friendly', 'professional', 'playful'] as VisualTone[]).includes(
      r.visualTone as VisualTone,
    )
      ? (r.visualTone as VisualTone)
      : 'clean',
    primaryColor: safeColor(r.primaryColor),
    screens,
  };
}

// layout에 필요한 데이터가 비어 있으면 기본 더미로 보강.
function fillDefaults(s: PrototypeScreen): void {
  if (s.layout === 'input' && s.formFields!.length === 0) {
    s.formFields = [
      { label: '이름', placeholder: '예: 홍길동' },
      { label: '요청 내용', placeholder: '무엇을 도와드릴까요?' },
    ];
  }
  if ((s.layout === 'result' || s.layout === 'dashboard') && s.metrics!.length === 0) {
    s.metrics =
      s.layout === 'dashboard'
        ? [
            { label: '활성 사용자', value: '1,284', caption: '오늘' },
            { label: '전환율', value: '4.2%', caption: '주간' },
            { label: '응답 시간', value: '0.8s', caption: '평균' },
            { label: '만족도', value: '94%', caption: '최근 30일' },
          ]
        : [
            { label: '정확도', value: '92%', caption: '분석 신뢰도' },
            { label: '소요 시간', value: '3분', caption: '평균' },
          ];
  }
  if ((s.layout === 'result' || s.layout === 'detail' || s.layout === 'dashboard') && s.listItems!.length === 0) {
    s.listItems = [
      { title: '핵심 인사이트', body: '입력한 내용을 바탕으로 정리한 요약입니다.' },
      { title: '추천 다음 단계', body: '바로 이어서 진행할 수 있는 액션을 제안합니다.' },
      { title: '참고 항목', body: '관련 자료와 근거를 함께 확인하세요.' },
    ];
  }
  if (s.layout === 'pricing' && s.cards!.length === 0) {
    s.cards = [
      { title: '무료', body: '기본 기능 · 개인 사용' },
      { title: '프리미엄', body: '전체 기능 · 우선 지원 · 무제한' },
    ];
  }
  if (s.layout === 'home' && s.cards!.length === 0) {
    s.cards = [
      { title: '빠른 시작', body: '몇 번의 탭으로 핵심 가치를 경험하세요.' },
      { title: '맞춤 추천', body: '입력을 바탕으로 결과를 정리해 드립니다.' },
    ];
  }
}

// --- layout별 화면 본문 렌더 ---

const cardHtml = (c: PrototypeCard, variant = ''): string => {
  const t = c.targetScreenId ? ` data-target="${esc(c.targetScreenId)}" role="button" tabindex="0"` : '';
  return `<div class="card${variant ? ' ' + variant : ''}${c.targetScreenId ? ' clickable' : ''}"${t}><div class="card-title">${esc(
    c.title,
  )}</div>${c.body ? `<div class="card-body">${esc(c.body)}</div>` : ''}</div>`;
};

const actionsHtml = (s: PrototypeScreen): string => {
  const p = s.primaryAction
    ? `<button type="button" class="btn primary" data-target="${esc(s.primaryAction.targetScreenId)}">${esc(s.primaryAction.label)}</button>`
    : '';
  const sec = s.secondaryAction
    ? `<button type="button" class="btn secondary" data-target="${esc(s.secondaryAction.targetScreenId)}">${esc(s.secondaryAction.label)}</button>`
    : '';
  return p || sec ? `<div class="actions">${p}${sec}</div>` : '';
};

const heroHtml = (s: PrototypeScreen): string =>
  `<div class="hero"><div class="hero-eyebrow">${esc(s.purpose || 'Welcome')}</div><h1 class="hero-title">${esc(
    s.headline || s.name,
  )}</h1>${s.body ? `<p class="hero-body">${esc(s.body)}</p>` : ''}</div>`;

const sectionTitle = (s: PrototypeScreen): string =>
  `<div class="scr-head"><h2 class="scr-title">${esc(s.headline || s.name)}</h2>${
    s.purpose ? `<div class="scr-sub">${esc(s.purpose)}</div>` : ''
  }</div>`;

const renderScreenBody = (s: PrototypeScreen): string => {
  switch (s.layout) {
    case 'home':
      return `${heroHtml(s)}${
        (s.cards ?? []).length ? `<div class="cards grid2">${(s.cards ?? []).map((c) => cardHtml(c, 'value')).join('')}</div>` : ''
      }${actionsHtml(s)}`;
    case 'input':
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}<div class="form">${(s.formFields ?? [])
        .map(
          (f) =>
            `<label class="field"><span class="field-label">${esc(f.label)}</span><input class="field-input" type="text" readonly placeholder="${esc(
              f.placeholder,
            )}"></label>`,
        )
        .join('')}<div class="chips">${(s.listItems ?? [{ title: '예시 불러오기', body: '' }, { title: 'AI 추천', body: '' }])
        .slice(0, 3)
        .map((l) => `<span class="chip">${esc(l.title)}</span>`)
        .join('')}</div></div>${actionsHtml(s)}`;
    case 'result':
      return `${sectionTitle(s)}${
        (s.metrics ?? []).length ? `<div class="metrics">${(s.metrics ?? []).map(metricHtml).join('')}</div>` : ''
      }${listHtml(s.listItems ?? [])}${
        (s.cards ?? []).length ? `<div class="cards">${(s.cards ?? []).map((c) => cardHtml(c)).join('')}</div>` : ''
      }${actionsHtml(s)}`;
    case 'dashboard':
      return `${sectionTitle(s)}<div class="metrics grid2">${(s.metrics ?? []).map(metricHtml).join('')}</div>${listHtml(
        s.listItems ?? [],
      )}${actionsHtml(s)}`;
    case 'pricing':
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}<div class="plans">${(s.cards ?? [])
        .map(
          (c, i) =>
            `<div class="plan${i === (s.cards ?? []).length - 1 ? ' featured' : ''}${c.targetScreenId ? ' clickable' : ''}"${
              c.targetScreenId ? ` data-target="${esc(c.targetScreenId)}" role="button" tabindex="0"` : ''
            }>${i === (s.cards ?? []).length - 1 ? '<span class="badge">추천</span>' : ''}<div class="plan-name">${esc(
              c.title,
            )}</div><div class="plan-body">${esc(c.body)}</div></div>`,
        )
        .join('')}</div>${actionsHtml(s)}`;
    case 'settings':
      return `${sectionTitle(s)}<div class="rows">${(s.listItems ?? [])
        .map((l) => `<div class="row"><span>${esc(l.title)}</span><span class="row-meta">${esc(l.body)}</span></div>`)
        .join('')}</div>${actionsHtml(s)}`;
    case 'detail':
    default:
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}${(s.listItems ?? []).length
        ? `<ol class="steps">${(s.listItems ?? [])
            .map((l) => `<li><b>${esc(l.title)}</b>${l.body ? `<span>${esc(l.body)}</span>` : ''}</li>`)
            .join('')}</ol>`
        : ''}${(s.cards ?? []).length ? `<div class="cards">${(s.cards ?? []).map((c) => cardHtml(c)).join('')}</div>` : ''}${actionsHtml(
        s,
      )}`;
  }
};

const metricHtml = (m: PrototypeMetric): string =>
  `<div class="metric"><div class="metric-value">${esc(m.value)}</div><div class="metric-label">${esc(m.label)}</div>${
    m.caption ? `<div class="metric-cap">${esc(m.caption)}</div>` : ''
  }</div>`;

const listHtml = (items: PrototypeListItem[]): string =>
  items.length
    ? `<div class="list">${items
        .map((l) => `<div class="list-item"><div class="list-title">${esc(l.title)}</div>${l.body ? `<div class="list-body">${esc(l.body)}</div>` : ''}</div>`)
        .join('')}</div>`
    : '';

const LAYOUT_ICON: Record<ScreenLayout, string> = {
  home: '🏠',
  input: '✏️',
  result: '✨',
  dashboard: '📊',
  detail: '📄',
  pricing: '💎',
  settings: '⚙️',
};

function buildCss(primary: string): string {
  const { r, g, b } = hexToRgb(primary);
  const soft = `rgba(${r},${g},${b},0.10)`;
  const softer = `rgba(${r},${g},${b},0.05)`;
  const border = `rgba(${r},${g},${b},0.28)`;
  return `
*{box-sizing:border-box}html,body{margin:0;padding:0}
:root{--p:${primary};--p-soft:${soft};--p-softer:${softer};--p-border:${border}}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:#e9edf2;color:#0f172a}
#app{max-width:412px;margin:0 auto;min-height:100vh;background:#f6f8fb;display:flex;flex-direction:column;position:relative}
.statusbar{display:flex;justify-content:space-between;align-items:center;padding:8px 16px 0;font-size:11px;font-weight:600;color:#0f172a}
.statusbar .dots{letter-spacing:1px;opacity:.6}
.appbar{display:flex;align-items:center;gap:8px;padding:8px 16px 12px;font-weight:800;font-size:16px}
.appbar .logo{width:26px;height:26px;border-radius:8px;background:var(--p);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px}
#screens{flex:1;overflow-y:auto;padding:6px 16px 92px}
.screen{display:none}.screen.active{display:block;animation:fade .2s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.hero{background:linear-gradient(135deg,var(--p),rgba(0,0,0,.18)),var(--p);color:#fff;border-radius:20px;padding:24px 20px;margin:8px 0 16px}
.hero-eyebrow{font-size:11px;opacity:.85;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.hero-title{font-size:24px;font-weight:800;margin:8px 0 0;line-height:1.25}
.hero-body{font-size:13px;opacity:.92;margin:10px 0 0;line-height:1.6}
.scr-head{margin:14px 0 12px}
.scr-title{font-size:20px;font-weight:800;margin:0}
.scr-sub{font-size:12px;color:#64748b;margin-top:4px}
.body{font-size:14px;color:#475569;line-height:1.65;margin:0 0 16px}
.cards{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.cards.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card{background:#fff;border:1px solid #e7ecf3;border-radius:16px;padding:14px 16px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.card.value{border-top:3px solid var(--p)}
.card.clickable{cursor:pointer}.card.clickable:active{transform:scale(.99)}
.card-title{font-weight:700;font-size:14px}
.card-body{font-size:12px;color:#64748b;margin-top:5px;line-height:1.5}
.form{background:#fff;border:1px solid #e7ecf3;border-radius:18px;padding:16px;margin-bottom:16px}
.field{display:block;margin-bottom:12px}
.field-label{display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px}
.field-input{width:100%;border:1px solid #dbe2ea;border-radius:11px;padding:11px 12px;font-size:13px;background:#f8fafc;color:#0f172a}
.field-input:focus{outline:none;border-color:var(--p);background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.chip{font-size:11px;font-weight:600;color:var(--p);background:var(--p-soft);border:1px solid var(--p-border);border-radius:999px;padding:5px 10px}
.metrics{display:flex;gap:10px;margin-bottom:16px}
.metrics.grid2{display:grid;grid-template-columns:1fr 1fr}
.metric{flex:1;background:#fff;border:1px solid #e7ecf3;border-radius:16px;padding:14px;text-align:left}
.metric-value{font-size:22px;font-weight:800;color:var(--p)}
.metric-label{font-size:12px;font-weight:700;color:#334155;margin-top:2px}
.metric-cap{font-size:11px;color:#94a3b8;margin-top:2px}
.list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.list-item{background:#fff;border:1px solid #e7ecf3;border-left:3px solid var(--p);border-radius:12px;padding:12px 14px}
.list-title{font-weight:700;font-size:13px}
.list-body{font-size:12px;color:#64748b;margin-top:3px;line-height:1.5}
.plans{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.plan{position:relative;background:#fff;border:1px solid #e7ecf3;border-radius:18px;padding:18px}
.plan.featured{border:2px solid var(--p);background:var(--p-softer)}
.plan.clickable{cursor:pointer}
.badge{position:absolute;top:-9px;right:16px;background:var(--p);color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px}
.plan-name{font-size:16px;font-weight:800}
.plan-body{font-size:12px;color:#64748b;margin-top:6px;line-height:1.5}
.steps{margin:0 0 16px;padding-left:18px}
.steps li{margin-bottom:10px;font-size:13px}
.steps li b{display:block}
.steps li span{color:#64748b;font-size:12px}
.rows{display:flex;flex-direction:column;margin-bottom:16px;background:#fff;border:1px solid #e7ecf3;border-radius:16px;overflow:hidden}
.row{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:13px;font-weight:600}
.row:last-child{border-bottom:0}
.row-meta{color:#94a3b8;font-weight:500}
.actions{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.btn{appearance:none;border:0;border-radius:13px;padding:14px 16px;font-size:14px;font-weight:700;cursor:pointer;width:100%}
.btn.primary{background:var(--p);color:#fff;box-shadow:0 6px 16px var(--p-soft)}
.btn.secondary{background:#fff;color:var(--p);border:1px solid var(--p-border)}
.btn:active{opacity:.88}
.tabbar{position:sticky;bottom:0;display:flex;background:#fff;border-top:1px solid #e7ecf3;padding:6px 4px;gap:2px}
.tab{flex:1;appearance:none;border:0;background:none;padding:7px 4px;font-size:10px;font-weight:600;color:#9aa6b4;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;overflow:hidden}
.tab .ti{font-size:16px;line-height:1}
.tab .tl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.tab.on{color:var(--p)}
`;
}

/** PrototypeSpec → self-contained 클릭형 HTML 문자열. */
export function buildPrototypeHtmlFromSpec(spec: PrototypeSpec): string {
  const screens = spec.screens;
  const first = screens[0]?.id ?? 'screen';

  const sections = screens
    .map(
      (s, i) =>
        `<section class="screen${i === 0 ? ' active' : ''}" id="scr-${esc(s.id)}">${renderScreenBody(s)}</section>`,
    )
    .join('');

  const tabs = screens
    .map(
      (s) =>
        `<button type="button" class="tab" data-target="${esc(s.id)}"><span class="ti">${LAYOUT_ICON[s.layout]}</span><span class="tl">${esc(
          s.name,
        )}</span></button>`,
    )
    .join('');

  const logoChar = esc((spec.title || 'P').trim().charAt(0).toUpperCase() || 'P');

  const script = `(function(){
  var first='scr-${esc(first)}';
  function show(id){
    var secs=document.querySelectorAll('.screen');
    for(var i=0;i<secs.length;i++){secs[i].classList.toggle('active',secs[i].id===id);}
    var tabs=document.querySelectorAll('.tab');
    for(var j=0;j<tabs.length;j++){tabs[j].classList.toggle('on',('scr-'+tabs[j].getAttribute('data-target'))===id);}
    var m=document.getElementById('screens');if(m){m.scrollTop=0;}
  }
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-target]'):null;
    if(!el)return;
    var t=el.getAttribute('data-target');if(!t)return;
    if(document.getElementById('scr-'+t)){show('scr-'+t);}
  });
  show(first);
})();`;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(
    spec.title,
  )}</title><style>${buildCss(spec.primaryColor)}</style></head><body><div id="app"><div class="statusbar"><span>9:41</span><span class="dots">●●● ▲ ▮</span></div><div class="appbar"><span class="logo">${logoChar}</span><span>${esc(
    spec.title,
  )}</span></div><main id="screens">${sections}</main><nav class="tabbar">${tabs}</nav></div><script>${script}</script></body></html>`;
}
