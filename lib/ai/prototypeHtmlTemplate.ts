// PrototypeSpec(짧은 화면 구조 JSON) → self-contained 클릭형 HTML 변환 (deterministic, 외부 의존 없음).
// Claude는 HTML/JS/CSS를 만들지 않고 이 Spec만 반환한다. HTML 생성은 전적으로 이 코드가 담당한다.
// 출력 HTML: <!doctype html> 시작, 인라인 CSS/JS, 외부 CDN/이미지/폰트/라이브러리 없음, iframe 단독 실행.
// productType(=프로토타입 모드)별로 chrome(프레임)·CSS를 분기해 mobile-app / web-landing /
// saas-dashboard / admin-console를 각기 다른 디자인으로 렌더한다.
// 입력 필드(input/textarea/select)는 readonly가 아니라 입력 가능하며, 제출은 iframe 내부 더미 토스트로만 처리한다.

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
// 프로토타입 모드(=productType). 'auto'는 모델/정규화 단계에서 실제 모드로 확정된다.
export type ProductType = 'mobile-app' | 'web-landing' | 'saas-dashboard' | 'admin-console';
export type VisualTone = 'clean' | 'premium' | 'friendly' | 'professional' | 'playful' | 'dark';

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
const PRODUCT_TYPES: ProductType[] = ['mobile-app', 'web-landing', 'saas-dashboard', 'admin-console'];
const VISUAL_TONES: VisualTone[] = ['clean', 'premium', 'friendly', 'professional', 'playful', 'dark'];
const DEFAULT_COLOR = '#06C755';

// 레거시/별칭 productType → 현재 모드로 매핑(이전 enum 'web-app'/'admin'/'landing' 호환).
const PRODUCT_ALIAS: Record<string, ProductType> = {
  'mobile-app': 'mobile-app',
  mobile: 'mobile-app',
  app: 'mobile-app',
  'web-landing': 'web-landing',
  landing: 'web-landing',
  web: 'web-landing',
  'saas-dashboard': 'saas-dashboard',
  dashboard: 'saas-dashboard',
  'web-app': 'saas-dashboard',
  saas: 'saas-dashboard',
  'admin-console': 'admin-console',
  admin: 'admin-console',
  console: 'admin-console',
};

const normalizeProductType = (v: unknown): ProductType => {
  const s = str(v).toLowerCase();
  if (PRODUCT_ALIAS[s]) return PRODUCT_ALIAS[s];
  return PRODUCT_TYPES.includes(s as ProductType) ? (s as ProductType) : 'mobile-app';
};

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
  for (let i = 0; i < Math.min(rawScreens.length, 6); i++) {
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

  const productType = normalizeProductType(r.productType);

  // 타깃 id 검증: 없으면 비클릭 처리.
  const ids = new Set(screens.map((s) => s.id));
  const valid = (t?: string) => (t && ids.has(t) ? t : '');
  for (const s of screens) {
    if (s.primaryAction && !valid(s.primaryAction.targetScreenId)) s.primaryAction = null;
    if (s.secondaryAction && !valid(s.secondaryAction.targetScreenId)) s.secondaryAction = null;
    s.cards = (s.cards ?? []).map((c) => ({ ...c, targetScreenId: valid(c.targetScreenId) || undefined }));
    // layout별 더미 데이터 보강(빈 화면 방지).
    fillDefaults(s, productType);
  }

  return {
    title: str(r.title) || '프로토타입',
    description: str(r.description),
    productType,
    visualTone: VISUAL_TONES.includes(r.visualTone as VisualTone) ? (r.visualTone as VisualTone) : 'clean',
    primaryColor: safeColor(r.primaryColor),
    screens,
  };
}

// layout에 필요한 데이터가 비어 있으면 기본 더미로 보강.
function fillDefaults(s: PrototypeScreen, mode: ProductType): void {
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
    // 웹 랜딩은 3개 피처 카드가 자연스럽다.
    s.cards =
      mode === 'web-landing'
        ? [
            { title: '빠른 시작', body: '몇 단계만으로 핵심 가치를 경험하세요.' },
            { title: '맞춤 추천', body: '입력을 바탕으로 결과를 정리해 드립니다.' },
            { title: '함께 협업', body: '팀과 결과를 공유하고 이어서 작업합니다.' },
          ]
        : [
            { title: '빠른 시작', body: '몇 번의 탭으로 핵심 가치를 경험하세요.' },
            { title: '맞춤 추천', body: '입력을 바탕으로 결과를 정리해 드립니다.' },
          ];
  }
}

// --- 공통 본문 조각 렌더 ---

const cardHtml = (c: PrototypeCard, variant = ''): string => {
  const t = c.targetScreenId ? ` data-target="${esc(c.targetScreenId)}" role="button" tabindex="0"` : '';
  return `<div class="card${variant ? ' ' + variant : ''}${c.targetScreenId ? ' clickable' : ''}"${t}><div class="card-title">${esc(
    c.title,
  )}</div>${c.body ? `<div class="card-body">${esc(c.body)}</div>` : ''}</div>`;
};

// 액션 버튼. submit=true면 더미 토스트(data-toast)를 함께 부여한다(입력 화면 제출용).
const actionsHtml = (s: PrototypeScreen, submit = false): string => {
  const toast = submit ? ' data-toast="입력한 내용을 처리했습니다 (데모)"' : '';
  const p = s.primaryAction
    ? `<button type="button" class="btn primary" data-target="${esc(s.primaryAction.targetScreenId)}"${toast}>${esc(
        s.primaryAction.label,
      )}</button>`
    : submit
      ? `<button type="button" class="btn primary" data-toast="입력한 내용을 처리했습니다 (데모)">제출</button>`
      : '';
  const sec = s.secondaryAction
    ? `<button type="button" class="btn secondary" data-target="${esc(s.secondaryAction.targetScreenId)}">${esc(
        s.secondaryAction.label,
      )}</button>`
    : '';
  return p || sec ? `<div class="actions">${p}${sec}</div>` : '';
};

const heroHtml = (s: PrototypeScreen): string =>
  `<div class="hero"><div class="hero-eyebrow">${esc(s.purpose || 'Welcome')}</div><h1 class="hero-title">${esc(
    s.headline || s.name,
  )}</h1>${s.body ? `<p class="hero-body">${esc(s.body)}</p>` : ''}${actionsHtml(s)}</div>`;

const sectionTitle = (s: PrototypeScreen): string =>
  `<div class="scr-head"><h2 class="scr-title">${esc(s.headline || s.name)}</h2>${
    s.purpose ? `<div class="scr-sub">${esc(s.purpose)}</div>` : ''
  }</div>`;

// 입력 필드: 긴 텍스트성 라벨은 textarea, 그 외는 input. 모두 입력 가능(readonly 아님).
const fieldHtml = (f: PrototypeFormField): string => {
  const isArea = /(메모|내용|설명|요청|사유|소개|코멘트|상세|후기|리뷰)/.test(f.label);
  const control = isArea
    ? `<textarea class="field-input" rows="3" placeholder="${esc(f.placeholder)}"></textarea>`
    : `<input class="field-input" type="text" placeholder="${esc(f.placeholder)}">`;
  return `<label class="field"><span class="field-label">${esc(f.label)}</span>${control}</label>`;
};

const formHtml = (s: PrototypeScreen): string =>
  `<div class="form">${(s.formFields ?? []).map(fieldHtml).join('')}<div class="chips">${(
    s.listItems ?? [{ title: '예시 불러오기', body: '' }, { title: 'AI 추천', body: '' }]
  )
    .slice(0, 3)
    .map((l) => `<span class="chip" data-toast="${esc(l.title)} 적용 (데모)">${esc(l.title)}</span>`)
    .join('')}</div></div>`;

const metricHtml = (m: PrototypeMetric): string =>
  `<div class="metric"><div class="metric-value">${esc(m.value)}</div><div class="metric-label">${esc(m.label)}</div>${
    m.caption ? `<div class="metric-cap">${esc(m.caption)}</div>` : ''
  }</div>`;

const metricsHtml = (metrics: PrototypeMetric[]): string =>
  metrics.length ? `<div class="metrics">${metrics.map(metricHtml).join('')}</div>` : '';

const listHtml = (items: PrototypeListItem[]): string =>
  items.length
    ? `<div class="list">${items
        .map(
          (l) =>
            `<div class="list-item"><div class="list-title">${esc(l.title)}</div>${
              l.body ? `<div class="list-body">${esc(l.body)}</div>` : ''
            }</div>`,
        )
        .join('')}</div>`
    : '';

const stepsHtml = (items: PrototypeListItem[]): string =>
  items.length
    ? `<ol class="steps">${items
        .map((l) => `<li><b>${esc(l.title)}</b>${l.body ? `<span>${esc(l.body)}</span>` : ''}</li>`)
        .join('')}</ol>`
    : '';

const plansHtml = (cards: PrototypeCard[]): string =>
  `<div class="plans">${cards
    .map(
      (c, i) =>
        `<div class="plan${i === cards.length - 1 ? ' featured' : ''}${c.targetScreenId ? ' clickable' : ''}"${
          c.targetScreenId ? ` data-target="${esc(c.targetScreenId)}" role="button" tabindex="0"` : ''
        }>${i === cards.length - 1 ? '<span class="badge">추천</span>' : ''}<div class="plan-name">${esc(
          c.title,
        )}</div><div class="plan-body">${esc(c.body)}</div></div>`,
    )
    .join('')}</div>`;

// 순수 CSS 막대 차트 placeholder(외부 라이브러리 없이). 높이는 고정값(랜덤 미사용).
const BAR_HEIGHTS = [44, 68, 52, 80, 60, 90, 72];
const chartHtml = (caption = '주간 추이'): string =>
  `<div class="chart"><div class="chart-head">${esc(caption)}</div><div class="bars">${BAR_HEIGHTS.map(
    (h) => `<span class="bar" style="height:${h}%"></span>`,
  ).join('')}</div></div>`;

// 상태 뱃지(테이블/관리자 콘솔용). 인덱스로 결정(랜덤 미사용).
const STATUSES = [
  { label: '활성', cls: 'ok' },
  { label: '검토', cls: 'warn' },
  { label: '완료', cls: 'done' },
  { label: '대기', cls: 'idle' },
];
const tableHtml = (items: PrototypeListItem[], withStatus = false): string => {
  const rows = items
    .map((l, i) => {
      const st = STATUSES[i % STATUSES.length];
      return `<tr><td class="t-name">${esc(l.title)}</td><td class="t-desc">${esc(l.body)}</td>${
        withStatus ? `<td><span class="status ${st.cls}">${st.label}</span></td>` : ''
      }</tr>`;
    })
    .join('');
  return `<div class="panel"><table class="tbl"><thead><tr><th>항목</th><th>설명</th>${
    withStatus ? '<th>상태</th>' : ''
  }</tr></thead><tbody>${rows}</tbody></table></div>`;
};

// 관리자 콘솔 필터 바: 검색 input + 상태 select + 적용 버튼. 모두 입력 가능.
const filterBarHtml = (): string =>
  `<div class="filterbar"><input class="filter-input" type="text" placeholder="검색어를 입력하세요"><select class="filter-select"><option>전체 상태</option><option>활성</option><option>검토</option><option>완료</option><option>대기</option></select><button type="button" class="btn sm" data-toast="필터를 적용했습니다 (데모)">필터 적용</button></div>`;

// 관리자 상세 카드 + 액션 버튼(더미 토스트).
const detailCardHtml = (s: PrototypeScreen): string => {
  const item = (s.listItems ?? [])[0];
  return `<div class="detail-card"><div class="dc-head"><span class="status ok">활성</span><div class="dc-title">${esc(
    item?.title || s.headline || s.name,
  )}</div></div><div class="dc-body">${esc(item?.body || s.body || '선택한 항목의 상세 정보가 여기에 표시됩니다.')}</div><div class="dc-actions"><button type="button" class="btn sm" data-toast="변경 사항을 저장했습니다 (데모)">저장</button><button type="button" class="btn sm ghost" data-toast="항목을 삭제했습니다 (데모)">삭제</button></div></div>`;
};

const LAYOUT_ICON: Record<ScreenLayout, string> = {
  home: '🏠',
  input: '✏️',
  result: '✨',
  dashboard: '📊',
  detail: '📄',
  pricing: '💎',
  settings: '⚙️',
};

// --- mode/layout별 화면 본문 렌더 ---

const renderScreenBody = (s: PrototypeScreen, mode: ProductType): string => {
  const isMobile = mode === 'mobile-app';
  const isLanding = mode === 'web-landing';
  const isAdmin = mode === 'admin-console';
  const isDash = mode === 'saas-dashboard';
  const cardsBlock = (variant: string) =>
    (s.cards ?? []).length ? `<div class="cards">${(s.cards ?? []).map((c) => cardHtml(c, variant)).join('')}</div>` : '';

  switch (s.layout) {
    case 'home':
      if (isMobile || isLanding) {
        return `${heroHtml(s)}${cardsBlock('value')}${isLanding ? stepsHtml(s.listItems ?? []) : ''}`;
      }
      // dashboard/admin의 home은 개요처럼 — 타이틀 + 카드.
      return `${sectionTitle(s)}${cardsBlock('value')}${actionsHtml(s)}`;

    case 'input':
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}${formHtml(s)}${actionsHtml(s, true)}`;

    case 'result':
      if (isDash || isAdmin) {
        return `${sectionTitle(s)}${isAdmin ? filterBarHtml() : ''}${metricsHtml(s.metrics ?? [])}${
          isDash ? chartHtml('결과 추이') : ''
        }${tableHtml(s.listItems ?? [], isAdmin)}${actionsHtml(s)}`;
      }
      return `${sectionTitle(s)}${metricsHtml(s.metrics ?? [])}${listHtml(s.listItems ?? [])}${cardsBlock('')}${actionsHtml(
        s,
      )}`;

    case 'dashboard':
      if (isDash || isAdmin) {
        return `${sectionTitle(s)}${isAdmin ? filterBarHtml() : ''}${metricsHtml(s.metrics ?? [])}${
          isDash ? chartHtml('주간 추이') : ''
        }${tableHtml(s.listItems ?? [], isAdmin)}${actionsHtml(s)}`;
      }
      return `${sectionTitle(s)}${metricsHtml(s.metrics ?? [])}${listHtml(s.listItems ?? [])}${actionsHtml(s)}`;

    case 'pricing':
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}${plansHtml(s.cards ?? [])}${actionsHtml(
        s,
      )}`;

    case 'settings':
      return `${sectionTitle(s)}<div class="rows">${(s.listItems ?? [])
        .map((l) => `<div class="row"><span>${esc(l.title)}</span><span class="row-meta">${esc(l.body)}</span></div>`)
        .join('')}</div>${actionsHtml(s)}`;

    case 'detail':
    default:
      if (isAdmin) {
        return `${sectionTitle(s)}${detailCardHtml(s)}${tableHtml(s.listItems ?? [], true)}${actionsHtml(s)}`;
      }
      return `${sectionTitle(s)}${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}${stepsHtml(s.listItems ?? [])}${cardsBlock(
        '',
      )}${actionsHtml(s)}`;
  }
};

// --- CSS ---

// 톤(다크) + primary 색에서 CSS 변수 팔레트를 만든다. 모든 컴포넌트는 이 변수만 사용.
function buildVars(primary: string, dark: boolean): string {
  const { r, g, b } = hexToRgb(primary);
  const p = {
    soft: `rgba(${r},${g},${b},0.12)`,
    softer: `rgba(${r},${g},${b},0.06)`,
    border: `rgba(${r},${g},${b},0.30)`,
  };
  const light = `--bg:#eef1f6;--surface:#ffffff;--surface-2:#f6f8fb;--text:#0f172a;--text-2:#475569;--text-3:#94a3b8;--border:#e7ecf3;--border-2:#dbe2ea;--shadow:0 1px 2px rgba(15,23,42,.05);--shadow-lg:0 10px 30px rgba(15,23,42,.10)`;
  const darkVars = `--bg:#0b1120;--surface:#111a2e;--surface-2:#0e1626;--text:#f1f5f9;--text-2:#cbd5e1;--text-3:#8595ad;--border:#1e293b;--border-2:#28364d;--shadow:0 1px 2px rgba(0,0,0,.4);--shadow-lg:0 14px 36px rgba(0,0,0,.5)`;
  return `:root{--p:${primary};--p-soft:${p.soft};--p-softer:${p.softer};--p-border:${p.border};${dark ? darkVars : light}}`;
}

// 모든 모드 공통 컴포넌트 스타일(변수 기반).
function baseCss(): string {
  return `
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
#screens{position:relative}
.screen{display:none}.screen.active{display:block;animation:fade .22s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.scr-head{margin:0 0 14px}
.scr-title{font-size:20px;font-weight:800;margin:0;color:var(--text)}
.scr-sub{font-size:12px;color:var(--text-3);margin-top:4px}
.body{font-size:14px;color:var(--text-2);line-height:1.65;margin:0 0 16px}
.hero{background:linear-gradient(135deg,var(--p),rgba(0,0,0,.22));color:#fff;border-radius:20px;padding:28px 24px;margin:0 0 18px}
.hero-eyebrow{font-size:11px;opacity:.85;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.hero-title{font-size:26px;font-weight:800;margin:10px 0 0;line-height:1.22}
.hero-body{font-size:14px;opacity:.92;margin:12px 0 0;line-height:1.6}
.hero .actions{margin-top:18px}
.hero .btn.primary{background:#fff;color:var(--p)}
.hero .btn.secondary{background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.4)}
.cards{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow)}
.card.value{border-top:3px solid var(--p)}
.card.clickable{cursor:pointer;transition:transform .12s,box-shadow .12s}.card.clickable:hover{box-shadow:var(--shadow-lg)}.card.clickable:active{transform:scale(.99)}
.card-title{font-weight:700;font-size:14px;color:var(--text)}
.card-body{font-size:12px;color:var(--text-2);margin-top:6px;line-height:1.55}
.form{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:18px;margin-bottom:16px;box-shadow:var(--shadow)}
.field{display:block;margin-bottom:14px}
.field-label{display:block;font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:6px}
.field-input{width:100%;border:1px solid var(--border-2);border-radius:11px;padding:11px 12px;font-size:13px;background:var(--surface-2);color:var(--text);font-family:inherit;resize:vertical}
.field-input::placeholder{color:var(--text-3)}
.field-input:focus{outline:none;border-color:var(--p);background:var(--surface);box-shadow:0 0 0 3px var(--p-softer)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.chip{font-size:11px;font-weight:600;color:var(--p);background:var(--p-soft);border:1px solid var(--p-border);border-radius:999px;padding:6px 11px;cursor:pointer}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px}
.metric{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:var(--shadow)}
.metric-value{font-size:24px;font-weight:800;color:var(--p)}
.metric-label{font-size:12px;font-weight:700;color:var(--text-2);margin-top:4px}
.metric-cap{font-size:11px;color:var(--text-3);margin-top:2px}
.list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.list-item{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--p);border-radius:12px;padding:13px 15px}
.list-title{font-weight:700;font-size:13px;color:var(--text)}
.list-body{font-size:12px;color:var(--text-2);margin-top:3px;line-height:1.5}
.steps{margin:0 0 16px;padding-left:18px}
.steps li{margin-bottom:12px;font-size:13px;color:var(--text)}
.steps li b{display:block}
.steps li span{color:var(--text-2);font-size:12px}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:16px}
.plan{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;box-shadow:var(--shadow)}
.plan.featured{border:2px solid var(--p);background:var(--p-softer)}
.plan.clickable{cursor:pointer}
.badge{position:absolute;top:-9px;right:16px;background:var(--p);color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px}
.plan-name{font-size:17px;font-weight:800;color:var(--text)}
.plan-body{font-size:12px;color:var(--text-2);margin-top:6px;line-height:1.5}
.rows{display:flex;flex-direction:column;margin-bottom:16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
.row{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--text)}
.row:last-child{border-bottom:0}
.row-meta{color:var(--text-3);font-weight:500}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:var(--shadow)}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;padding:11px 16px;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.4px;background:var(--surface-2);border-bottom:1px solid var(--border)}
.tbl td{padding:12px 16px;border-bottom:1px solid var(--border);color:var(--text-2)}
.tbl tbody tr:last-child td{border-bottom:0}
.tbl .t-name{font-weight:700;color:var(--text)}
.status{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}
.status.ok{color:#0f7b46;background:rgba(16,185,129,.14)}
.status.warn{color:#9a6700;background:rgba(245,158,11,.16)}
.status.done{color:#1d4ed8;background:rgba(59,130,246,.14)}
.status.idle{color:#64748b;background:rgba(100,116,139,.14)}
.chart{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:var(--shadow)}
.chart-head{font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:14px}
.bars{display:flex;align-items:flex-end;gap:10px;height:120px}
.bar{flex:1;background:linear-gradient(180deg,var(--p),var(--p-soft));border-radius:6px 6px 0 0;min-height:6px}
.filterbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.filter-input{flex:1;min-width:140px;border:1px solid var(--border-2);border-radius:10px;padding:10px 12px;font-size:13px;background:var(--surface);color:var(--text);font-family:inherit}
.filter-input::placeholder{color:var(--text-3)}
.filter-input:focus{outline:none;border-color:var(--p)}
.filter-select{border:1px solid var(--border-2);border-radius:10px;padding:10px 12px;font-size:13px;background:var(--surface);color:var(--text);font-family:inherit}
.filter-select:focus{outline:none;border-color:var(--p)}
.detail-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:var(--shadow)}
.dc-head{display:flex;align-items:center;gap:10px}
.dc-title{font-size:16px;font-weight:800;color:var(--text)}
.dc-body{font-size:13px;color:var(--text-2);line-height:1.6;margin:12px 0 16px}
.dc-actions{display:flex;gap:8px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.btn{appearance:none;border:0;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:700;cursor:pointer}
.btn.primary{background:var(--p);color:#fff;box-shadow:0 6px 16px var(--p-soft)}
.btn.secondary{background:var(--surface);color:var(--p);border:1px solid var(--p-border)}
.btn.sm{padding:9px 14px;font-size:13px;border-radius:10px}
.btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--border-2);box-shadow:none}
.btn:active{opacity:.88}
#toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,16px);background:rgba(15,23,42,.92);color:#fff;font-size:13px;font-weight:600;padding:11px 18px;border-radius:12px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:50;max-width:80%;text-align:center}
#toast.show{opacity:1;transform:translate(-50%,0)}
`;
}

// 모바일 앱 프레임.
function mobileCss(): string {
  return `
#app.mobile{max-width:412px;margin:0 auto;min-height:100vh;background:var(--surface-2);display:flex;flex-direction:column;position:relative}
.mobile .statusbar{display:flex;justify-content:space-between;align-items:center;padding:8px 16px 0;font-size:11px;font-weight:600;color:var(--text)}
.mobile .statusbar .dots{letter-spacing:1px;opacity:.6}
.mobile .appbar{display:flex;align-items:center;gap:8px;padding:8px 16px 12px;font-weight:800;font-size:16px;color:var(--text)}
.mobile .logo{width:26px;height:26px;border-radius:8px;background:var(--p);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px}
.mobile #screens{flex:1;overflow-y:auto;padding:6px 16px 92px}
.mobile .cards{}
.mobile .hero{padding:24px 20px;border-radius:20px}
.mobile .hero-title{font-size:24px}
.mobile .metrics{grid-template-columns:1fr 1fr}
.mobile .plans{grid-template-columns:1fr}
.mobile .actions{flex-direction:column}
.mobile .btn{width:100%}
.tabbar{position:sticky;bottom:0;display:flex;background:var(--surface);border-top:1px solid var(--border);padding:6px 4px;gap:2px}
.tab{flex:1;appearance:none;border:0;background:none;padding:7px 4px;font-size:10px;font-weight:600;color:var(--text-3);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;overflow:hidden}
.tab .ti{font-size:16px;line-height:1}
.tab .tl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.tab.on{color:var(--p)}
`;
}

// 웹 랜딩 프레임(상단 nav + 와이드 본문 + 푸터).
function landingCss(): string {
  return `
#app.landing{min-height:100vh;display:flex;flex-direction:column}
.topnav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:14px 28px;background:var(--surface);border-bottom:1px solid var(--border)}
.topnav .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:16px;color:var(--text)}
.topnav .logo{width:28px;height:28px;border-radius:9px;background:var(--p);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px}
.navlinks{display:flex;gap:6px;margin-left:8px;flex-wrap:wrap}
.navlink{font-size:13px;font-weight:600;color:var(--text-2);padding:7px 11px;border-radius:9px;cursor:pointer}
.navlink:hover{background:var(--surface-2);color:var(--text)}
.navlink.on{color:var(--p);background:var(--p-soft)}
.nav-cta{margin-left:auto;padding:9px 16px;font-size:13px}
.landing #screens{flex:1;width:100%;max-width:1080px;margin:0 auto;padding:32px 28px 48px}
.landing .hero{padding:48px 40px;border-radius:24px;text-align:center}
.landing .hero-title{font-size:34px}
.landing .hero-body{max-width:560px;margin:14px auto 0;font-size:15px}
.landing .hero .actions{justify-content:center}
.landing .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.landing .card{padding:22px}
.landing .scr-title{font-size:26px}
.site-footer{padding:22px 28px;border-top:1px solid var(--border);color:var(--text-3);font-size:12px;text-align:center}
`;
}

// SaaS 대시보드 / 관리자 콘솔 공통 프레임(사이드바 + 탑바 + 본문).
function consoleCss(): string {
  return `
#app.dash,#app.admin{display:flex;min-height:100vh}
.sidebar{width:208px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:16px 12px}
.sidebar .brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:15px;color:var(--text);padding:6px 8px 16px}
.sidebar .logo{width:26px;height:26px;border-radius:8px;background:var(--p);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px}
.sidenav{display:flex;flex-direction:column;gap:2px}
.navitem{display:flex;align-items:center;gap:10px;width:100%;text-align:left;appearance:none;border:0;background:none;padding:10px 11px;border-radius:10px;font-size:13px;font-weight:600;color:var(--text-2);cursor:pointer}
.navitem:hover{background:var(--surface-2);color:var(--text)}
.navitem.on{background:var(--p-soft);color:var(--p)}
.navitem .ni-icon{font-size:15px;line-height:1}
.side-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:12px 8px 4px;border-top:1px solid var(--border);font-size:12px;color:var(--text-2)}
.side-foot .avatar{width:28px;height:28px;border-radius:50%;background:var(--p-soft);color:var(--p);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px}
.main-col{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--bg)}
.topbar{display:flex;align-items:center;gap:12px;padding:14px 24px;background:var(--surface);border-bottom:1px solid var(--border)}
.page-title{font-size:16px;font-weight:800;color:var(--text)}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.topbar .search{border:1px solid var(--border-2);border-radius:10px;padding:8px 12px;font-size:13px;background:var(--surface-2);color:var(--text);width:200px;font-family:inherit}
.topbar .search::placeholder{color:var(--text-3)}
.topbar .search:focus{outline:none;border-color:var(--p)}
.topbar .avatar{width:30px;height:30px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
.dash #screens,.admin #screens{flex:1;overflow-y:auto;padding:24px}
.dash .scr-title,.admin .scr-title{font-size:22px}
`;
}

function buildCss(spec: PrototypeSpec): string {
  const dark = spec.visualTone === 'dark';
  return `${buildVars(spec.primaryColor, dark)}${baseCss()}${mobileCss()}${landingCss()}${consoleCss()}`;
}

// 공통 클라이언트 스크립트: 화면 전환(show) + 더미 토스트(toast). 외부 네트워크 요청 없음.
const CLIENT_SCRIPT = (firstId: string) => `(function(){
  var first='scr-${esc(firstId)}';
  function show(id){
    var secs=document.querySelectorAll('.screen');var name='';
    for(var i=0;i<secs.length;i++){var on=secs[i].id===id;secs[i].classList.toggle('active',on);if(on){name=secs[i].getAttribute('data-name')||'';}}
    var navs=document.querySelectorAll('[data-nav]');
    for(var j=0;j<navs.length;j++){navs[j].classList.toggle('on',('scr-'+navs[j].getAttribute('data-target'))===id);}
    var pt=document.getElementById('page-title');if(pt&&name){pt.textContent=name;}
    var m=document.getElementById('screens');if(m){m.scrollTop=0;}
  }
  var toastTimer;
  function toast(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2200);}
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-target],[data-toast]'):null;
    if(!el)return;
    var msg=el.getAttribute('data-toast');if(msg){toast(msg);}
    var t=el.getAttribute('data-target');if(t&&document.getElementById('scr-'+t)){show('scr-'+t);}
  });
  show(first);
})();`;

// --- chrome(프레임) 빌더: 모드별로 nav 구조가 다르다 ---

const sectionsHtml = (spec: PrototypeSpec): string =>
  spec.screens
    .map(
      (s, i) =>
        `<section class="screen${i === 0 ? ' active' : ''}" id="scr-${esc(s.id)}" data-name="${esc(
          s.name,
        )}">${renderScreenBody(s, spec.productType)}</section>`,
    )
    .join('');

const logoCharOf = (title: string): string => esc((title || 'P').trim().charAt(0).toUpperCase() || 'P');

// 랜딩 CTA 대상: input 또는 pricing 화면 우선, 없으면 두 번째/첫 화면.
const ctaTarget = (spec: PrototypeSpec): PrototypeScreen => {
  const screens = spec.screens;
  return (
    screens.find((s) => s.layout === 'input') ??
    screens.find((s) => s.layout === 'pricing') ??
    screens[1] ??
    screens[0]
  );
};

function mobileFrame(spec: PrototypeSpec): string {
  const tabs = spec.screens
    .map(
      (s) =>
        `<button type="button" class="tab" data-nav data-target="${esc(s.id)}"><span class="ti">${
          LAYOUT_ICON[s.layout]
        }</span><span class="tl">${esc(s.name)}</span></button>`,
    )
    .join('');
  return `<div id="app" class="mobile"><div class="statusbar"><span>9:41</span><span class="dots">●●● ▲ ▮</span></div><div class="appbar"><span class="logo">${logoCharOf(
    spec.title,
  )}</span><span>${esc(spec.title)}</span></div><main id="screens">${sectionsHtml(
    spec,
  )}</main><nav class="tabbar">${tabs}</nav></div>`;
}

function landingFrame(spec: PrototypeSpec): string {
  const links = spec.screens
    .map((s) => `<a class="navlink" data-nav data-target="${esc(s.id)}">${esc(s.name)}</a>`)
    .join('');
  const cta = ctaTarget(spec);
  return `<div id="app" class="landing"><header class="topnav"><div class="brand"><span class="logo">${logoCharOf(
    spec.title,
  )}</span><span>${esc(spec.title)}</span></div><nav class="navlinks">${links}</nav><button type="button" class="btn primary nav-cta" data-target="${esc(
    cta.id,
  )}">${esc(cta.layout === 'pricing' ? '요금제 보기' : '시작하기')}</button></header><main id="screens">${sectionsHtml(
    spec,
  )}</main><footer class="site-footer">© ${esc(spec.title)} · 데모 프로토타입</footer></div>`;
}

function consoleFrame(spec: PrototypeSpec, klass: 'dash' | 'admin'): string {
  const nav = spec.screens
    .map(
      (s) =>
        `<button type="button" class="navitem" data-nav data-target="${esc(s.id)}"><span class="ni-icon">${
          LAYOUT_ICON[s.layout]
        }</span><span class="ni-label">${esc(s.name)}</span></button>`,
    )
    .join('');
  const first = spec.screens[0];
  const topRight =
    klass === 'dash'
      ? `<input class="search" type="text" placeholder="검색"><span class="avatar">U</span>`
      : `<button type="button" class="btn sm" data-toast="새 항목을 추가했습니다 (데모)">+ 새로 만들기</button><span class="avatar">A</span>`;
  return `<div id="app" class="${klass}"><aside class="sidebar"><div class="brand"><span class="logo">${logoCharOf(
    spec.title,
  )}</span><span>${esc(spec.title)}</span></div><nav class="sidenav">${nav}</nav><div class="side-foot"><span class="avatar">${
    klass === 'dash' ? 'U' : 'A'
  }</span><span>${klass === 'dash' ? '내 워크스페이스' : '관리자'}</span></div></aside><div class="main-col"><header class="topbar"><div class="page-title" id="page-title">${esc(
    first?.name ?? '',
  )}</div><div class="topbar-right">${topRight}</div></header><main id="screens">${sectionsHtml(spec)}</main></div></div>`;
}

function buildFrame(spec: PrototypeSpec): string {
  switch (spec.productType) {
    case 'web-landing':
      return landingFrame(spec);
    case 'saas-dashboard':
      return consoleFrame(spec, 'dash');
    case 'admin-console':
      return consoleFrame(spec, 'admin');
    case 'mobile-app':
    default:
      return mobileFrame(spec);
  }
}

/** PrototypeSpec → self-contained 클릭형 HTML 문자열. */
export function buildPrototypeHtmlFromSpec(spec: PrototypeSpec): string {
  const first = spec.screens[0]?.id ?? 'screen';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(
    spec.title,
  )}</title><style>${buildCss(spec)}</style></head><body>${buildFrame(
    spec,
  )}<div id="toast" role="status" aria-live="polite"></div><script>${CLIENT_SCRIPT(first)}</script></body></html>`;
}
