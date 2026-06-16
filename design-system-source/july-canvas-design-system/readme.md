# July Canvas — Design System

**July Canvas (July 캔버스)** is an all-in-one **AI Planning OS / Product Workspace**.
It carries a product idea through one continuous canvas:

> **조직 → 프로젝트 → 기획 문서 → 프로토타입 → 제품화 산출물**

Inside a project, teams run market research (시장조사), set direction (방향성), define
policy (정책 정의), write a feature spec (기능정의서), build clickable prototypes
(프로토타입), and ship product artifacts — a `PRD.md` and `.pptx` deliverables. The
distinctive idea: **the planning document and the prototype live on the same canvas.**
You click any UI element in a prototype and attach a versioned policy/spec to it, with
inline comments and @mentions.

The visual goal is a **calm, green-first product-planning workspace** — a structured
collaboration tool (think Naver Works / Drive), not a flashy design toy. A confident fresh
green leads; surfaces are clean white and warm off-white with hairline borders and quiet
shadows; **soft glass is used sparingly** (floating toolbar, sticky top bar) rather than as
the dominant surface. Information structure — left nav → top actions → center content →
right detail panel — carries the design.

---

## Sources this system was built from

All read-only inputs the design system was derived from (stored here so a future reader
can re-trace them — access not assumed):

- **Codebase (Next.js app)** — the live product implementation, mounted read-only:
  - `app/` — Next.js entry (`layout.tsx` sets the metadata + Geist fonts, `page.tsx` → `ClientApp`).
  - `components/` — the product UI: `CanvasApp.tsx` (shell, header, routing, toast), `views/Dashboard.tsx`, `views/ProjectDetail.tsx`, `views/ScreenEditor.tsx` (the prototype canvas + policy panel + floating toolbar), `views/ProjectDocuments.tsx`, `views/ProjectActivationWizard.tsx`, `common/Button.tsx`, and modals.
  - `lib/` — `documents.ts` (the 6-stage doc pipeline + PRD generator), `firebase.ts`, `firestore.ts`, `utils.ts`, `markdown.ts`, `export/*`.
  - `types/index.ts` — the full data model (Project, ProjectDocument, Screen, Annotation, Member, MockEmail, statuses).
- **Uploaded mockups** — `uploads/1.webp … 12.png` (early indigo/violet target) plus a later
  green-first re-brief: structured B2B workspace references (Naver Works / Drive style) and a
  vivid-green color reference. The **current** direction is green-first; representative shots
  are saved in `assets/reference/`. (1 = a generic prototyping tool, 2 = a neumorphism chat
  reference — inspiration only, not the product.)

> **Codebase vs. brief.** The shipped code uses plain Tailwind (blue-600, Geist, gray
> scale); an earlier mockup set explored indigo/violet glassmorphism. The latest brief
> re-orients the brand to **green-first**, with a **structured collaborative-workspace**
> layout and **restrained** glass. This system encodes that green-first direction while
> preserving the **code's structure, copy, data model, and flows** (organization → project →
> documents → prototype → deliverables).

---

## Content fundamentals — how July Canvas writes

- **Language.** Korean-first UI. Latin is used for product/tech nouns (PRD, MVP, IA,
  FREE/PREMIUM, `PRD.md`) and the "July Canvas" wordmark. The Korean product name is
  **July 캔버스**.
- **Voice.** Calm, instructive, second-person-implied. Copy tells the user what to do
  next: *"…선택하거나 접속 코드로 입장하세요."*, *"좌측 화면 요소를 클릭하여 정책을 추가하세요."*
  It rarely uses "I"; it addresses the operator directly without literal "당신".
- **Tone.** Professional and confident, never cute. Empty states are encouraging and
  action-oriented (*"등록된 프로젝트가 없습니다 — 위 입력창에 접속 코드를 입력하세요."*).
- **Casing.** Acronyms upper-case (PRD, MVP, IA, KYC). Membership tiers shout in caps:
  `FREE (TRIAL)`, `PREMIUM`. Korean headings are tight and noun-led (*"내 프로젝트"*,
  *"문서 파이프라인"*, *"기능 정책 / 기획서"*).
- **Microcopy patterns.** Counts in parentheses — *"문서 (5)"*, *"팀원 관리 (3)"*. Versions
  as `v1.0`. Filenames in mono — `PROJECT_BRIEF.md`. Pipeline arrows: *"브리프 → 시장조사
  → 제품화전략 → IA → 기능정의서 → PRD"*.
- **Emoji.** Sparing and functional, not decorative — a 👆 in the "click a UI element"
  banner, 👁️ for view-only. Prefer Lucide icons over emoji everywhere else.
- **Toasts.** Short confirmations ending in 습니다: *"화면이 성공적으로 추가되었습니다."*,
  *"프로토타입 URL이 복사되었습니다."*

---

## Visual foundations

- **Color.** **Green-first**, anchored on the vivid spring green **`#50FA6E`** (`--brand-400`
  = `--color-primary`). It is used as a **fill** for primary CTAs, active states, selection,
  focus and live status — always with **dark-green text/icons on top** (`--color-on-primary`
  `#06371a`), never white. For green **text/icons on white**, use the deeper readable
  `--color-primary-text` (`--brand-700 #0c7d28`). **Clean cool-mist neutrals** (`--gray-*`,
  a barely-there cool lean — not sage, not warm-yellow) on a bright off-white page
  (`--surface-page #f6f8fa`); cards are pure white; dark cool charcoal **ink** (`#141a22`)
  for the embedded prototype sidebar. The neutral system is deliberately fresh + low-contrast
  so `#50FA6E` reads crisp, not muddy. **Status:** gray=draft, **green=active** (vivid mint),
  amber=review, **soft green=approved**, slate=archived, soft red=danger. Membership: green
  `FREE (TRIAL)`, amber `PREMIUM`. **No purple / indigo / blue anywhere** — not as brand, not
  as status. When new colors are needed, derive from the brand/neutral ramps.
- **Type.** **Pretendard** for all UI (Korean + Latin), **Geist Mono** for code/versions/
  filenames. No separate display face — headings are Pretendard at **800 (extrabold)** with
  tight tracking (`-0.02em`). Body is **500 (medium)**; long-form Korean docs use 1.7
  line-height. Scale tops out at 36px (project name) / 30px (page title); dense tables go
  to 13px. Min UI text 11px (meta/badges only).
- **Spacing & layout.** 4px base grid. Generous card padding (20–24px). Page gutter 40px,
  content max-width 1600px. **Structured workspace shell:** 248px left nav (organization
  switcher → primary nav → recent projects → user card), a 61px sticky top bar (breadcrumb →
  search → live indicator → notifications → share → avatars), the center content, and a 420px
  right policy/detail panel. A floating bottom toolbar centers over the prototype canvas.
- **Backgrounds.** Bright off-white neutral surfaces carry the design. `--gradient-aurora`
  is now an **almost-imperceptible** green hint in the top corners over `--gray-50` (do not
  flood the screen with green). **Soft glass** (`--glass-fill`, `backdrop-filter: saturate(135%) blur(14px)`)
  is restrained — reserved for the sticky top bar and the floating canvas toolbar. Solid
  white is the default for all data-dense surfaces (cards, tables, panels, modals). No
  full-bleed photography, no repeating textures, no noise/grain.
- **Corners.** Soft everywhere: buttons/inputs 10px, cards/panels 16px, modals 20–24px,
  pills/badges/avatars full-round. Nothing sharp.
- **Borders.** Hairline `1px var(--gray-200)` on cards; `--gray-300` on inputs; glass uses
  a bright `rgba(255,255,255,.7)` edge. Dividers are `--gray-100`.
- **Shadows.** Soft, low, **cool-neutral** elevation (`--shadow-sm`→`--shadow-2xl`, tinted
  `rgba(18,26,38,…)` at low opacity) — "floating on light," never heavy old-admin drops.
  Primary CTAs add a subtle green lift (`--shadow-brand`). Borders are light + low-contrast
  (`--border-default #e4e8ee`). Inputs/code wells use a faint inset.
- **Elevation & blur.** Reserve `blur` for the restrained glass surfaces; don't blur opaque
  content. Modals dim the page with `rgba(21,33,27,.5)` (green-charcoal) + a light backdrop blur.
- **Motion.** Gentle and quick. `--ease-standard` for state changes (120–200ms),
  `--ease-out` for enters. Hover = subtle lift (`translateY(-2px)`) + shadow grow on cards;
  color darken on buttons (600→700). Press = `scale(0.99)` + 0.5px nudge. The live sync dot
  pulses (1.8s). Avoid bounce on chrome (the source uses a small bounce only on the
  transient "drop a marker here" affordance). Respect `prefers-reduced-motion`.
- **Hover/press states.** Buttons darken; ghost/secondary fill gray; cards lift + gain a
  brand border; row actions fade in on hover (opacity 0→1). Destructive hovers tint red.
- **Transparency & blur — when.** Glass = floating-over-content only. Data surfaces stay
  opaque for legibility.

---

## Iconography

- **System: [Lucide](https://lucide.dev).** The product uses **`lucide-react`** throughout
  (`import { Plus, Rocket, … } from 'lucide-react'`), so this system standardises on Lucide
  — 2px stroke, 24px grid, rounded caps/joins. Typical sizes: 16–18px inline in buttons,
  20–28px for feature/empty-state glyphs.
- **No bespoke SVG icons, no emoji as icons.** Emoji appears only as functional accents in
  two product banners (👆 / 👁️). Everywhere else, use a Lucide glyph.
- **How to use it here.** Lucide is loaded from CDN
  (`https://unpkg.com/lucide@0.474.0/dist/umd/lucide.min.js`). `assets/cardkit.js` provides a
  React wrapper `<Lc n="plus" size={18} />` that builds a **real React-owned `<svg>`** from
  Lucide's icon data (it does *not* emit an `<i data-lucide>` placeholder, so it never
  conflicts with React's DOM reconciliation — `window.refreshIcons()` is a kept-for-compat
  no-op). React primitives (`Button`, `IconButton`, `Badge`) take a **rendered icon node** as
  a prop, so you can pass any `<Lc … />` element. *(Substitution note: Lucide is linked from
  CDN rather than vendored — if you need offline assets, vendor the Lucide sprite into
  `assets/`.)*
- **Common glyphs** (from the codebase): `plus, rocket, folder, file-text, file-code-2,
  download, external-link, link-2, trash-2, pencil, x, bell, users, database, globe, lock,
  save, history, message-circle, message-square-plus, chevron-right, arrow-left,
  check-circle-2, alert-circle, sparkles, list-checks, send, grip-vertical`.
- **Logo.** Gradient (**green**) rounded-square **canvas mark with a sparkle**, paired
  with the *July Canvas* / *July 캔버스* wordmark. See `assets/logo-mark.svg` and
  `assets/logo-full.svg`.

---

## Index — what's in this system

**Foundations**
- `styles.css` — the single entry point consumers link (import manifest only).
- `tokens/fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `effects.css` · `base.css`
- `components.css` — shared component classes (`.jc-btn`, `.jc-card`, `.jc-badge`, …) used by both the React primitives and the UI kit.

**Components** (`components/<group>/` — React primitives, namespace `window.JulyCanvasDesignSystem_…`)
- `core/` — `Button`, `IconButton`, `Badge`, `StatusBadge`, `Avatar` + `AvatarStack`, `Card`
- `forms/` — `Input`, `Textarea`
- `navigation/` — `Tabs`
- `feedback/` — `Toast`, `LiveIndicator`

**Specimen cards** (`guidelines/*.card.html`) — Colors (brand / neutral / semantic), Type
(families / scale), Spacing (scale / radii / elevation), Brand (logo / glass + aurora).

**UI kit** (`ui_kits/workspace/`) — the full interactive product recreation, in a
**structured workspace shell** (left org/projects nav + sticky top bar + content + right
panel): Dashboard (내 프로젝트, with activity rail) → Project detail (개요 / 문서 / 프로토타입,
with deliverables) → Canvas (prototype + policy panel + floating toolbar, embedded *KAKE
ADMIN* demo) → Share & members modal. Entry: `ui_kits/workspace/index.html`.

**Assets** (`assets/`) — `logo-mark.svg`, `logo-full.svg`, `cardkit.js`, `reference/` (product mockups).

**Skill** — `SKILL.md` (Agent Skills compatible).

---

## Using it

Link the one stylesheet and read components off the namespace:

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script>
  const { Button, StatusBadge, Card } = window.JulyCanvasDesignSystem_d81917;
</script>
```

Prefer **semantic tokens** (`--text-body`, `--surface-card`, `--color-primary`) over raw
ramps. Use the `.jc-*` classes for plain HTML; use the React primitives in JSX.
