# DESIGN_ASSET_MAPPING — 브랜드 에셋 매핑 (UI-1)

확정된 July Canvas 브랜드 에셋을 디자인 시스템 원본에서 앱 `public/brand/`로 반영한 매핑 기록.

## 1. 디자인 시스템 원본 내 브랜드 파일 위치
```
design-system-source/july-canvas-design-system/public/brand/
  logo/      july-canvas-*.svg|png (심볼/락업/헤더/사이드바)
  favicon/   favicon.* / app-icon-* / apple-touch-icon / icon-maskable / site.webmanifest
  og/        og-image.png / og-logo.png
  README.md  브랜드 가이드 (3D layered-canvas 심볼, Primary #50FA6E, 퍼플/블루 금지)
```
> 원본은 참고용이며 앱에서 직접 import하지 않음. 실제 사용 파일만 `public/brand/`로 복사.

## 2. 복사 매핑 (원본 → 앱 public 경로)

### logo (접두사 `july-canvas-` 제거하여 타깃 파일명으로 복사)
| 원본 | → 앱 경로 |
|---|---|
| logo/july-canvas-symbol.svg | public/brand/logo/symbol.svg |
| logo/july-canvas-symbol.png (512·투명) | public/brand/logo/symbol-512.png |
| logo/july-canvas-symbol-256/128/64/32/16.png | public/brand/logo/symbol-256/128/64/32/16.png |
| logo/july-canvas-logo-light.svg/.png | public/brand/logo/logo-light.svg/.png |
| logo/july-canvas-logo-dark.svg/.png | public/brand/logo/logo-dark.svg/.png |
| logo/july-canvas-header.svg | public/brand/logo/header.svg |
| logo/july-canvas-header-dark.svg | public/brand/logo/header-dark.svg |
| logo/july-canvas-sidebar.svg/.png | public/brand/logo/sidebar.svg/.png |

### favicon (파일명 동일, 그대로 복사)
favicon.ico, favicon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, app-icon-512.png, app-icon-1024.png, icon-maskable-512.png, site.webmanifest

### og (파일명 동일)
og-image.png (1200×630), og-logo.png

## 3. 복사 후 public 경로
`public/brand/{logo,favicon,og}/` — 위 매핑대로 정리 완료(총 26개 파일).

## 4. layout.tsx metadata 연결 파일
- icons.icon: `/brand/favicon/favicon.ico`, `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`
- icons.apple: `/brand/favicon/apple-touch-icon.png`
- manifest: `/brand/favicon/site.webmanifest`
- openGraph/twitter images: `/brand/og/og-image.png`

## 5. header/sidebar 사용 파일
- **Header (CanvasApp 상단)**: `/brand/logo/header.svg` (심볼+워드마크 락업, 라이트 헤더용). 기존 `[파란 박스 + "July 캔버스" 텍스트]`를 제거하고 락업 1개로 대체(텍스트 중복 방지). `h-7 w-auto`, 클릭 시 `#`(대시보드) 이동, alt fallback.
- **Sidebar/Workspace 심볼**: `/brand/logo/sidebar.svg` (+ `symbol.svg`)는 **에셋만 준비**. 현재 앱에는 좌측 사이드바가 없으므로(드라이브형 내비게이션은 UI-4 범위) 이번 단계에서는 미배치 → UI-4에서 적용.
- 다크 헤더용 `header-dark.svg`는 향후 다크 배경 영역에서 사용(현재 헤더는 화이트).

## 6. favicon/manifest/OG 사용 파일
- favicon: ico/svg/32/16 + apple-touch-icon → layout.tsx icons
- manifest: site.webmanifest (이미 `/brand/favicon/...` 경로 + theme_color `#50FA6E`, background `#f6f8fa`) → **수정 없이 사용**
- OG: og-image.png → openGraph/twitter

## 7. 기존 파일과 충돌 여부
- 기존 `public/`에는 Next 기본 svg(next.svg, vercel.svg 등)만 있고 `brand/` 폴더는 없었음 → **충돌 없음**.
- 기존 `app/favicon.ico`(Next 기본)가 있으나, App Router는 `app/favicon.ico`를 자동 favicon으로 우선 사용할 수 있음. metadata.icons로 `/brand/favicon/*`를 명시 지정하므로 브랜드 favicon이 적용됨. (혼선을 줄이려면 후속 단계에서 `app/favicon.ico` 제거 검토 — 이번 단계 범위 밖, 기능 영향 없음)

## 8. 반영하지 않는 파일과 이유
- `logo/sidebar.svg/.png`, `symbol*.png`, `logo-dark.*`, `header-dark.svg`: 에셋은 복사했으나 현재 UI에 사이드바/다크 영역이 없어 **배치는 UI-4 이후**.
- `og/og-logo.png`: OG 기본은 og-image.png 사용, og-logo는 예비.
- 원본의 `ui_kits/`, `components/`, `tokens/`, `_ds_bundle.js` 등: UI-2(토큰)·UI-3(컴포넌트) 단계에서 참조 (UI-1 범위 아님).
