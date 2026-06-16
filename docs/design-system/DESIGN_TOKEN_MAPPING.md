# DESIGN_TOKEN_MAPPING — 디자인 토큰 반영 (UI-2)

`design-system-source/july-canvas-design-system/tokens/*` 의 값을 **인라인 복사**하여 `app/globals.css`에 반영(원본 직접 import 금지). green-first.

## 1. 두 가지 반영 방식
1. **`:root` 디자인 토큰**: 원본 tokens(colors/spacing/effects/typography)의 CSS 변수를 그대로 정의 → UI-3+ 컴포넌트가 `var(--color-primary)`, `var(--surface-card)`, `var(--shadow-md)`, `var(--radius-xl)`, `var(--space-6)` 등으로 소비.
2. **`@theme` Tailwind 팔레트 리매핑**: 기존 컴포넌트가 쓰는 Tailwind 유틸 클래스(`bg-blue-600`, `text-gray-700` 등)를 **컴포넌트 수정 없이** green-first로 전환.

## 2. Tailwind 팔레트 리매핑 (@theme)
| Tailwind family | → 매핑 | 의도 |
|---|---|---|
| `blue-*` (138곳) | 브랜드 그린 ramp (`#e2fde8`…`#064214`) | 블루 잔재 제거. `blue-600=#11a132`/`blue-700=#0c7d28`은 흰 텍스트 가독 위해 진한 그린(밝은 `#50FA6E` 필 버튼은 UI-3 Button) |
| `purple-*` (4곳, handoff badge) | slate 중립 (`#dde2de`…) | 퍼플 제거 → 보관/전달 중립색 |
| `gray-*` (393곳) | 디자인 cool-mist ramp (`#f6f8fa`…`#141a22`) | clean cool-neutral 배경·소프트 보더·텍스트 |
| `green-*` (17곳) | 디자인 status green (`#e9f8ee`…) | approved/success/live |
| `amber-*` (10곳) | 디자인 amber (`#fdf3e3`…) | review/warning |
| `red-*` (25곳) | 디자인 red (`#fceced`…) | danger |
| `rose-*` (3곳) | 미변경 | 주석 마커 액센트(유지) |

## 3. 핵심 semantic 토큰
- `--color-primary: #50FA6E` (브랜드 필), `--color-primary-hover: #22e349`, `--color-primary-text: #0c7d28`(흰 배경 위 그린 텍스트), `--color-on-primary: #06371a`(밝은 필 위 다크 텍스트)
- surface: `--surface-page #f6f8fa` / `--surface-card #fff` / `--surface-hover #eef1f5` / `--surface-active #e2fde8`
- border: `--border-default #e4e8ee` / `--border-strong #d3dae2`
- text: `--text-strong #141a22` / `--text-body #343c47` / `--text-secondary #687181`
- shadow: `--shadow-xs … --shadow-2xl`(쿨뉴트럴 소프트) + `--shadow-brand`(그린 리프트)
- radius: xs4 sm6 md10 lg12 xl16 2xl20 3xl24 pill999
- spacing: 4px grid (`--space-1`…`--space-16`)
- status fg/bg 쌍: draft/active/review/approved/archived/handoff
- motion/z/typography(size·weight·leading·tracking) 전부 포함

## 4. body / 기타
- `body`: `background: var(--surface-page)`, `color: var(--text-body)`, `font-family: --font-sans-stack`(Pretendard 미로딩 → Apple SD Gothic Neo/시스템 폴백), **`word-break: keep-all` + `overflow-wrap: break-word` 유지(반응형 안정화)**.
- 기존 `prefers-color-scheme: dark` 강제 플립 제거(라이트 green-first 일관).
- `::selection` 브랜드 그린.

## 5. 적용 범위 / 제외
- UI-2는 **토큰 + 팔레트 리매핑까지**. 컴포넌트 파일은 미수정(`bg-blue-600` 등 유틸이 자동으로 그린).
- 밝은 `#50FA6E` 필 + 다크 텍스트의 "정식" primary 버튼, 카드/배지/인풋/모달의 토큰 직접 적용은 **UI-3(공통 컴포넌트)** 부터.
- 글래스는 절제 토큰만 제공(과한 glassmorphism 미사용).
- 폰트(Pretendard webfont) 로딩은 미적용(현재 Geist+시스템 폴백) — 추후 옵션.
