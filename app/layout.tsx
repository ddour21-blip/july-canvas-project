import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin-kit.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION = "조직과 프로젝트 단위로 기획 문서와 프로토타입을 관리하는 제품화 워크스페이스";

export const metadata: Metadata = {
  title: "July Canvas",
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: "/brand/favicon/favicon.ico" },
      { url: "/brand/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/favicon/apple-touch-icon.png",
  },
  manifest: "/brand/favicon/site.webmanifest",
  openGraph: {
    title: "July Canvas",
    description: DESCRIPTION,
    images: ["/brand/og/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "July Canvas",
    description: DESCRIPTION,
    images: ["/brand/og/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
