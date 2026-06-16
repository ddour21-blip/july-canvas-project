---
name: july-canvas-design
description: Use this skill to generate well-branded interfaces and assets for July Canvas (July 캔버스), the AI Planning OS / Product Workspace — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# July Canvas design skill

July Canvas (July 캔버스) is an all-in-one AI Planning OS / Product Workspace that carries an
idea through one canvas: **조직 → 프로젝트 → 기획 문서 → 프로토타입 → 제품화 산출물**. The look is a
green-first, structured collaborative workspace — vivid spring-green brand (`#50FA6E`) used
as fills with dark-green text, clean white + warm off-white surfaces, restrained soft glass,
dense scannable layouts, Lucide icons, Pretendard type. No purple/indigo/blue.

## Start here

Read **`readme.md`** for the full design guide (content fundamentals, visual foundations,
iconography, and the file index). Then explore:

- `styles.css` — the single stylesheet to link. It `@import`s every token + the shared
  `components.css`.
- `tokens/` — colors, typography, spacing, effects (as CSS custom properties).
- `components/` — React primitives (`Button`, `Card`, `Badge`, `StatusBadge`, `Input`,
  `Tabs`, `Toast`, …) with `.d.ts` contracts and `.prompt.md` usage notes.
- `ui_kits/workspace/` — the full interactive product recreation (Dashboard → Project →
  Canvas). The best reference for real screen composition.
- `guidelines/*.card.html` — foundation specimens.
- `assets/` — `logo-mark.svg`, `logo-full.svg`, `cardkit.js`, product reference mockups.

## How to build

- **Visual artifacts (slides, mocks, throwaway prototypes):** copy the assets you need out
  of this skill and produce static/standalone HTML the user can open. Link `styles.css`,
  load `_ds_bundle.js`, and read components from `window.JulyCanvasDesignSystem_…` (run the
  design-system check or grep a card to confirm the exact namespace suffix). Use the `.jc-*`
  classes for plain HTML.
- **Production code:** copy assets and follow the rules here to design natively with the
  brand. Match the Korean-first, action-oriented voice; use semantic tokens, not raw hexes.
- **Icons:** Lucide (2px stroke, 24px grid), via CDN. Never hand-roll SVG icons or use emoji
  as icons.

If invoked with no further guidance, ask what the user wants to build, ask a few focused
questions (surface, audience, fidelity, variations), then act as an expert July Canvas
designer who outputs HTML artifacts _or_ production code as needed.
