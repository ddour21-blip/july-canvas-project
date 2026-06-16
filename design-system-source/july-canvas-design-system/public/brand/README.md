# July Canvas — Brand Assets

3D **layered-canvas** isometric symbol. 시장조사 → 정책 → 기능정의 → 프로토타입 → PRD/PPTX 산출물이
**레이어처럼 쌓이는** 구조를 얇은 캔버스 보드의 적층 + 그린 명도 차로 입체화한 마크입니다.
폴더 아이콘이 아닌 "쌓이는 작업 보드".

- Primary `#50FA6E` · depth ramp `#50FA6E`(top) → `#25C547`(left) → `#11982F`(right) · spark ink `#06371a`
- 퍼플/블루 메인 브랜딩 사용 금지.

## 파일 구조

```
public/brand/
├─ logo/
│  ├─ july-canvas-symbol.svg            심볼 (라이트·다크 공용 컬러 마크)
│  ├─ july-canvas-symbol.png            512 · 투명
│  ├─ july-canvas-symbol-256/128/64/32/16.png   심볼 PNG 사이즈 세트(투명)
│  ├─ july-canvas-logo-light.svg / .png  가로 락업 · 밝은 배경 (July=차콜)
│  ├─ july-canvas-logo-dark.svg / .png   가로 락업 · 어두운 배경 (July=화이트)
│  ├─ july-canvas-header.svg             헤더용 락업(=logo-light)
│  ├─ july-canvas-header-dark.svg        다크 헤더용 락업(=logo-dark)
│  └─ july-canvas-sidebar.svg / .png     접힌 사이드바용 심볼
├─ favicon/
│  ├─ favicon.ico                        16+32 임베드
│  ├─ favicon.svg                        초소형 최적화(2-보드, spark 제거)
│  ├─ favicon-16x16.png  favicon-32x32.png
│  ├─ apple-touch-icon.png               180 · 화이트 타일
│  ├─ app-icon-512.png  app-icon-1024.png
│  ├─ icon-maskable-512.png              maskable safe-zone
│  └─ site.webmanifest
└─ og/
   ├─ og-image.png                       1200×630 OG 기본 템플릿
   └─ og-logo.png                        OG/공유용 락업
```

## Next.js (App Router) — `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "July Canvas",
  description: "기획 올인원 워크스페이스 — 시장조사부터 PRD/PPTX 산출물까지",
  manifest: "/brand/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon/favicon.ico", sizes: "any" },
    ],
    apple: "/brand/favicon/apple-touch-icon.png",
  },
  openGraph: {
    title: "July Canvas",
    description: "레이어처럼 쌓이는 기획 올인원 워크스페이스",
    images: [{ url: "/brand/og/og-image.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = { themeColor: "#50FA6E" };
```

## 일반 HTML `<head>` 스니펫

```html
<link rel="icon" href="/brand/favicon/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/brand/favicon/favicon-32x32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/brand/favicon/favicon-16x16.png" sizes="16x16" type="image/png" />
<link rel="icon" href="/brand/favicon/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon.png" />
<link rel="manifest" href="/brand/favicon/site.webmanifest" />
<meta name="theme-color" content="#50FA6E" />
<meta property="og:image" content="/brand/og/og-image.png" />
```

## 헤더 / 사이드바 로고

```tsx
import Image from "next/image";

// 밝은 헤더
<Image src="/brand/logo/july-canvas-logo-light.svg" width={170} height={44} alt="July Canvas" priority />

// 드라이브형 다크 사이드바 (펼침)
<Image src="/brand/logo/july-canvas-logo-dark.svg" width={170} height={44} alt="July Canvas" />

// 접힌 사이드바 / 모바일 (심볼만)
<Image src="/brand/logo/july-canvas-sidebar.svg" width={28} height={28} alt="July Canvas" />
```

## 사용 규칙

- 심볼은 라이트/다크 어디서나 컬러 그대로 사용(반전 불필요). 주변 여백 ≥ 심볼 높이의 1/4.
- 최소 크기: 심볼 24px / 락업 높이 28px. 그 이하 favicon 영역에서는 단순화된 `favicon.svg`(또는 `favicon.ico`)를 사용.
- 색·그림자·글래스·외곽선을 임의로 추가하지 않습니다. 평면 입체 면 그대로.
- ❌ 블루 라운드 아이콘 / 퍼플 톤 / 폴더형 아이콘 사용 금지.

## favicon.ico 재생성(선택)

`favicon.ico`는 16+32를 임베드해 동봉했습니다. 더 많은 사이즈가 필요하면:

```bash
npx png-to-ico public/brand/favicon/favicon-16x16.png \
  public/brand/favicon/favicon-32x32.png > public/brand/favicon/favicon.ico
```
