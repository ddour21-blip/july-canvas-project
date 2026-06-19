'use client';

/* =============================================================================
 * AnonymousLanding — 비로그인(익명) 사용자용 마케팅 랜딩 (v5)
 * July Canvas: AI 기반 기획 자동화 워크스페이스 브랜드 랜딩.
 *  - 레퍼런스 레이아웃 재현: 기능 bento 그리드 + 원형 Workflow 다이어그램 +
 *    블로그형 활용 사례 카드. 정식 July Canvas 심볼 로고.
 *  - Header → Hero → 핵심 기능(bento) → Workflow(ring) → 활용 사례(blog)
 *    → 공유·협업 → CTA → Footer
 *  - 스타일은 .jcl-root 하위로 스코프. [data-signin] → onSignIn
 *    (기존 Google 로그인/Auth/Firebase 로직 변경 없음).
 * ========================================================================== */

import { useEffect, useRef } from 'react';

const LANDING_CSS = `.jcl-root{
    --primary:#06C755; --primary-hover:#05B84F; --primary-active:#04A947;
    --primary-soft:#E9FBEF; --primary-light:#CFF8DD; --primary-subtle:#F5FFF8;
    --blue:#1EA7FF; --blue-soft:#EFF8FF; --purple:#7C5CFF; --purple-soft:#F4F1FF;
    --mint:#BFF7E2; --mint-soft:#F1FCF5;
    --navy:#111827; --footer-navy:#141E2B;
    --text:#111827; --muted:#64748B; --border:#E5E7EB; --line-soft:#EEF1F5;
    --shadow-xs:0 1px 2px rgba(17,24,39,.05);
    --shadow-sm:0 2px 6px rgba(17,24,39,.06),0 1px 2px rgba(17,24,39,.04);
    --shadow-md:0 10px 24px rgba(17,24,39,.08),0 2px 6px rgba(17,24,39,.05);
    --shadow-lg:0 24px 56px rgba(17,24,39,.12),0 6px 14px rgba(17,24,39,.06);
    --font:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  }.jcl-root *{box-sizing:border-box;margin:0;padding:0;}.jcl-root{scroll-behavior:smooth;}.jcl-root{font-family:var(--font);color:var(--text);background:#fff;-webkit-font-smoothing:antialiased;line-height:1.5;letter-spacing:-0.01em;}.jcl-root a{color:inherit;text-decoration:none;}.jcl-root img, .jcl-root svg{display:block;}.jcl-root .wrap{max-width:1200px;margin:0 auto;padding:0 40px;}.jcl-root .ico{stroke:currentColor;stroke-width:1.9;fill:none;stroke-linecap:round;stroke-linejoin:round;flex:none;}.jcl-root /* ===== buttons ===== */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;border-radius:999px;cursor:pointer;border:1.5px solid transparent;transition:background .16s,border-color .16s,transform .16s,box-shadow .16s;font-size:15px;height:52px;padding:0 26px;white-space:nowrap;}.jcl-root .btn:active{transform:translateY(1px);}.jcl-root .btn-primary{background:var(--primary);color:#fff;box-shadow:0 6px 16px rgba(6,199,85,.28);}.jcl-root .btn-primary:hover{background:var(--primary-hover);box-shadow:0 8px 22px rgba(6,199,85,.34);}.jcl-root .btn-ghost{background:#fff;color:var(--text);border-color:var(--border);}.jcl-root .btn-ghost:hover{border-color:#cbd3dd;background:#fafbfc;}.jcl-root .btn-sm{height:42px;font-size:14px;padding:0 18px;}.jcl-root /* ===== header ===== */
  header.site{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.88);backdrop-filter:saturate(160%) blur(12px);border-bottom:1px solid var(--line-soft);}.jcl-root .nav{display:flex;align-items:center;gap:14px;height:74px;}.jcl-root .brand{display:flex;align-items:center;gap:11px;font-weight:800;font-size:20px;letter-spacing:-0.03em;color:var(--navy);}.jcl-root .brand-mark{width:36px;height:36px;display:grid;place-items:center;flex:none;}.jcl-root .brand-mark svg,.jcl-root .brand-mark img{width:36px;height:36px;}.jcl-root .nav-menu{display:flex;gap:32px;margin-left:40px;font-size:15px;font-weight:600;color:#374151;}.jcl-root .nav-menu a:hover{color:var(--primary-active);}.jcl-root .nav-right{margin-left:auto;display:flex;align-items:center;gap:8px;}.jcl-root .nav-login{font-size:15px;font-weight:700;color:#374151;padding:10px 14px;border-radius:10px;}.jcl-root .nav-login:hover{color:var(--primary-active);background:var(--primary-soft);}.jcl-root /* ===== generic ===== */
  .section{padding:120px 0;}.jcl-root .kicker{font-size:14px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--primary);}.jcl-root h2.title{font-size:44px;font-weight:800;line-height:1.25;letter-spacing:-0.035em;color:var(--navy);margin-top:16px;text-wrap:balance;}.jcl-root .lead{font-size:18px;color:var(--muted);line-height:1.7;margin-top:22px;font-weight:500;max-width:720px;}.jcl-root .sec-head{max-width:820px;}.jcl-root .sec-head.center{margin:0 auto;text-align:center;}.jcl-root .sec-head.center .lead{margin-left:auto;margin-right:auto;}.jcl-root .card{background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-sm);}.jcl-root .tile{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none;}.jcl-root .tile svg{width:20px;height:20px;}.jcl-root .tile-green{background:var(--primary-soft);color:var(--primary-active);}.jcl-root .tile-blue{background:var(--blue-soft);color:var(--blue);}.jcl-root .tile-purple{background:var(--purple-soft);color:var(--purple);}.jcl-root .tile-navy{background:#eef1f6;color:var(--navy);}.jcl-root .chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:5px 11px;border-radius:8px;background:#fff;border:1px solid #e7ecf2;color:#475569;}.jcl-root .chip-green{color:var(--primary-active);border-color:var(--primary-light);background:var(--primary-soft);}.jcl-root .chip-blue{color:#0a78c4;border-color:#cfe7fb;background:var(--blue-soft);}.jcl-root .chip-purple{color:#5b3ee0;border-color:#ddd2ff;background:var(--purple-soft);}.jcl-root .pin{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--primary-soft);color:var(--primary-active);}.jcl-root /* ===== HERO ===== */
  .hero{position:relative;overflow:hidden;padding:80px 0 104px;background:
      radial-gradient(900px 560px at 92% 0%,var(--mint-soft),transparent 62%),
      radial-gradient(760px 520px at 102% 42%,var(--blue-soft),transparent 60%),
      linear-gradient(180deg,#fff,#fbfdff);}.jcl-root .hero-grid{display:grid;grid-template-columns:1.1fr 1.05fr;gap:46px;align-items:center;}.jcl-root .eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:var(--primary-active);background:var(--primary-soft);padding:8px 15px;border-radius:999px;}.jcl-root h1.hero-h{font-size:50px;line-height:1.2;font-weight:800;letter-spacing:-0.04em;color:var(--navy);margin-top:24px;}.jcl-root .hero-h em{font-style:normal;background:linear-gradient(120deg,var(--primary),var(--blue));-webkit-background-clip:text;background-clip:text;color:transparent;}.jcl-root .hero-sub{font-size:18.5px;color:#475569;line-height:1.72;margin-top:26px;max-width:540px;font-weight:500;}.jcl-root .hero-cta{display:flex;gap:13px;margin-top:36px;flex-wrap:wrap;}.jcl-root .btn-google{background:#fff;color:#1f2937;border:1.5px solid #dadce0;box-shadow:0 1px 2px rgba(60,64,67,.12);font-weight:700;}.jcl-root .btn-google:hover{background:#f8fafb;border-color:#cbd2d9;box-shadow:0 2px 6px rgba(60,64,67,.16);}.jcl-root .btn-google svg{width:20px;height:20px;}.jcl-root .hero-trust{display:flex;align-items:center;gap:9px;margin-top:22px;font-size:13.5px;color:#94a3b8;font-weight:600;}.jcl-root .art{position:relative;height:600px;border-radius:28px;
    background:linear-gradient(150deg,var(--mint-soft),var(--blue-soft) 60%,#fff);
    border:1px solid #eaf2f7;box-shadow:var(--shadow-lg);overflow:hidden;}.jcl-root .art .blob{position:absolute;border-radius:50%;filter:blur(10px);opacity:.5;}.jcl-root .ac{position:absolute;background:#fff;border:1px solid #eef1f5;border-radius:15px;box-shadow:var(--shadow-md);}.jcl-root .ac-h{display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid #f2f4f7;}.jcl-root .ac-h .dot{width:8px;height:8px;border-radius:50%;}.jcl-root .ac-t{font-size:12.5px;font-weight:800;color:#334155;}.jcl-root .flabel{position:absolute;display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #e6eef4;border-radius:999px;padding:9px 15px;box-shadow:var(--shadow-md);z-index:7;font-size:13px;font-weight:800;color:#334155;letter-spacing:-0.02em;white-space:nowrap;}.jcl-root .flabel .fdot{width:9px;height:9px;border-radius:50%;flex:none;}.jcl-root .flabel .tile{width:26px;height:26px;border-radius:7px;}.jcl-root .flabel .tile svg{width:15px;height:15px;}.jcl-root /* ===== FEATURES BENTO ===== */
  .bento{display:grid;grid-template-columns:1.32fr 1fr;gap:22px;align-items:stretch;}.jcl-root .bento-col{display:flex;flex-direction:column;gap:22px;}.jcl-root .b-bottom{display:grid;grid-template-columns:1fr 1fr;gap:22px;flex:1;}.jcl-root .bcard{border-radius:26px;padding:34px;position:relative;overflow:hidden;border:1px solid rgba(17,24,39,.05);display:flex;flex-direction:column;}.jcl-root .bcard h3{font-size:23px;font-weight:800;letter-spacing:-0.03em;color:var(--navy);line-height:1.3;}.jcl-root .bcard .desc{font-size:14px;color:#51607a;line-height:1.62;margin-top:10px;font-weight:500;}.jcl-root .b-core{background:linear-gradient(150deg,#eafaf1,#d6f5e4);min-height:360px;}.jcl-root .b-mgmt{background:linear-gradient(150deg,#f1edff,#e6ddff);min-height:190px;}.jcl-root .b-ai{background:linear-gradient(155deg,#eaf5ff,#eee9ff);flex:1;}.jcl-root .b-drive{background:linear-gradient(150deg,#eaf5ff,#dbeeff);}.jcl-root .b-note{background:linear-gradient(150deg,#eafaf1,#d8f6e6);}.jcl-root .b-arrow{width:36px;height:36px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:var(--shadow-sm);color:var(--navy);margin-top:auto;}.jcl-root .b-arrow svg{width:18px;height:18px;}.jcl-root /* core icon cluster */
  .cluster{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px;align-self:center;width:100%;max-width:340px;}.jcl-root .gtile{aspect-ratio:1;border-radius:16px;display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px rgba(17,24,39,.12);}.jcl-root .gtile svg{width:26px;height:26px;}.jcl-root .g1{background:linear-gradient(150deg,#10e066,#06c755);}.jcl-root .g2{background:linear-gradient(150deg,#46baff,#1ea7ff);}.jcl-root .g3{background:linear-gradient(150deg,#9a80ff,#7c5cff);}.jcl-root .g4{background:linear-gradient(150deg,#2d3e57,#172231);}.jcl-root .g5{background:linear-gradient(150deg,#06c755,#04a847);}.jcl-root .g6{background:linear-gradient(150deg,#1ea7ff,#0d8fe0);}.jcl-root .g7{background:linear-gradient(150deg,#7c5cff,#5f3ef0);}.jcl-root .g8{background:linear-gradient(150deg,#34c759,#10b981);}.jcl-root .mini{background:#fff;border:1px solid #eef1f5;border-radius:12px;box-shadow:var(--shadow-sm);}.jcl-root /* ===== WORKFLOW RING ===== */
  .flow{background:radial-gradient(680px 480px at 22% 36%,var(--blue-soft),transparent 60%),radial-gradient(560px 420px at 80% 70%,var(--mint-soft),transparent 60%),#fbfdff;border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft);}.jcl-root .flow-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;}.jcl-root .ring{position:relative;width:500px;height:500px;margin:0 auto;}.jcl-root .ring-orbit{position:absolute;inset:0;border-radius:50%;border:2px dashed #c8dceb;}.jcl-root .ring-disc{position:absolute;inset:62px;border-radius:50%;background:radial-gradient(circle at 50% 42%,#ffffff,var(--mint-soft));border:1px solid #e1edf4;box-shadow:inset 0 2px 20px rgba(17,24,39,.04);}.jcl-root .ring-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:142px;height:142px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center;box-shadow:0 16px 40px rgba(17,24,39,.14),inset 0 0 0 1px #eef2f6;z-index:6;}.jcl-root .ring-core svg,.jcl-root .ring-core img{width:46px;height:46px;margin:0 auto 1px;}.jcl-root .ring-core b{font-size:14.5px;font-weight:800;display:block;letter-spacing:-0.03em;color:var(--navy);line-height:1.1;}.jcl-root .ring-core span{font-size:10.5px;color:var(--muted);font-weight:600;margin-top:1px;}.jcl-root .rnode{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:7px;width:104px;text-align:center;z-index:5;}.jcl-root .rnode .gt{width:50px;height:50px;border-radius:16px;display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px rgba(17,24,39,.14);}.jcl-root .rnode .gt svg{width:24px;height:24px;}.jcl-root .rnode span{font-size:12px;font-weight:700;color:#1f2937;line-height:1.3;letter-spacing:-0.02em;}.jcl-root .orbit-dot{position:absolute;width:34px;height:34px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:var(--shadow-md);transform:translate(-50%,-50%);z-index:6;color:var(--primary);}.jcl-root .orbit-dot svg{width:17px;height:17px;}.jcl-root /* ===== USE CASES (blog) ===== */
  .uc-top{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;}.jcl-root .uc-all{font-size:15px;font-weight:700;color:#475569;display:inline-flex;align-items:center;gap:7px;}.jcl-root .uc-all:hover{color:var(--primary-active);}.jcl-root .uc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:48px;}.jcl-root .uc{display:flex;flex-direction:column;}.jcl-root .uc-thumb{height:230px;border-radius:18px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:22px;box-shadow:var(--shadow-sm);}.jcl-root .uc-thumb .ov{position:absolute;color:#fff;}.jcl-root .uc h3{font-size:18px;font-weight:800;letter-spacing:-0.025em;color:var(--navy);margin-top:18px;line-height:1.4;}.jcl-root .uc .meta{font-size:13px;color:#94a3b8;font-weight:600;margin-top:12px;}.jcl-root .th-green{background:linear-gradient(145deg,#0bd35f,#06c755 55%,#04a046);}.jcl-root .th-blue{background:linear-gradient(140deg,#5cc0ff,#1ea7ff 55%,#0c84d6);}.jcl-root .th-purple{background:linear-gradient(145deg,#9a80ff,#7c5cff 55%,#5d3cef);}.jcl-root .th-navy{background:linear-gradient(145deg,#2e4straight);background:linear-gradient(145deg,#2e4057,#15203057 60%,#0e1826);}.jcl-root .th-navy{background:linear-gradient(145deg,#2e4057,#152030 60%,#0e1826);}.jcl-root .swoosh{position:absolute;width:150%;height:150%;border-radius:46%;background:rgba(255,255,255,.16);right:-40%;bottom:-55%;}.jcl-root .swoosh.s2{right:-58%;bottom:-40%;background:rgba(255,255,255,.12);}.jcl-root /* ===== SHARE ===== */
  .share-sec{background:linear-gradient(180deg,#fff,var(--mint-soft));border-top:1px solid var(--line-soft);}.jcl-root .share-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:60px;align-items:center;}.jcl-root .checklist{display:flex;flex-direction:column;gap:14px;margin-top:30px;}.jcl-root .ck{display:flex;align-items:center;gap:13px;font-size:15.5px;font-weight:600;color:#334155;}.jcl-root .ck .ci{width:26px;height:26px;border-radius:8px;background:var(--primary-soft);color:var(--primary-active);display:grid;place-items:center;flex:none;}.jcl-root .ck .ci svg{width:15px;height:15px;stroke-width:2.4;}.jcl-root .share-art{position:relative;height:480px;}.jcl-root /* ===== CTA ===== */
  .cta{padding:60px 0 110px;}.jcl-root .cta-box{position:relative;border-radius:34px;padding:88px 48px;text-align:center;overflow:hidden;
    background:linear-gradient(135deg,var(--blue-soft) 0%,var(--mint-soft) 48%,var(--primary-light) 100%);border:1px solid #e3f1ea;}.jcl-root .cta-box h2{font-size:44px;font-weight:800;letter-spacing:-0.035em;color:var(--navy);line-height:1.22;position:relative;z-index:2;}.jcl-root .cta-box p{font-size:18.5px;color:#41566b;margin-top:18px;line-height:1.6;font-weight:500;position:relative;z-index:2;}.jcl-root .cta-btns{display:flex;gap:14px;justify-content:center;margin-top:38px;position:relative;z-index:2;}.jcl-root .cta-card{position:absolute;background:#fff;border:1px solid #eaf2f7;border-radius:13px;box-shadow:var(--shadow-md);padding:11px 14px;display:flex;align-items:center;gap:9px;z-index:1;}.jcl-root .cta-card .tile{width:30px;height:30px;border-radius:8px;}.jcl-root .cta-card .tile svg{width:16px;height:16px;}.jcl-root .cta-card b{font-size:12.5px;font-weight:800;color:#1f2937;letter-spacing:-0.02em;display:block;}.jcl-root .cta-card span{font-size:10.5px;color:#94a3b8;font-weight:600;}@media(max-width:1000px){.jcl-root .cta-card{display:none;}}.jcl-root /* ===== FOOTER ===== */
  footer.site{background:var(--footer-navy);color:#9aa6b6;padding:84px 0 44px;}.jcl-root .foot-grid{display:grid;grid-template-columns:1.5fr repeat(4,1fr);gap:40px;}.jcl-root .foot-brand{display:flex;align-items:center;gap:11px;font-weight:800;font-size:20px;color:#fff;margin-bottom:18px;}.jcl-root .foot-tag{font-size:14px;color:#8492a4;line-height:1.7;max-width:260px;font-weight:500;}.jcl-root .foot-col h4{font-size:13.5px;font-weight:800;color:#e6ebf2;margin-bottom:18px;letter-spacing:0.02em;}.jcl-root .foot-col ul{list-style:none;display:flex;flex-direction:column;gap:12px;}.jcl-root .foot-col a{font-size:14px;color:#8d99a9;font-weight:500;}.jcl-root .foot-col a:hover{color:#fff;}.jcl-root .foot-bottom{margin-top:60px;padding-top:30px;border-top:1px solid #28323f;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;font-size:13.5px;color:#6b7889;}.jcl-root .foot-bottom .lk{display:flex;gap:20px;font-weight:600;}.jcl-root .foot-bottom .lk a:hover{color:#fff;}@media(max-width:960px){.jcl-root .hero-grid, .jcl-root .flow-grid, .jcl-root .share-grid, .jcl-root .bento{grid-template-columns:1fr;}.jcl-root .uc-grid{grid-template-columns:1fr 1fr;}.jcl-root h1.hero-h{font-size:38px;}.jcl-root h2.title, .jcl-root .cta-box h2{font-size:30px;}.jcl-root .ring{width:340px;height:340px;}.jcl-root .nav-menu{display:none;}.jcl-root .wrap{padding:0 22px;}.jcl-root .art{height:auto;}
  }.jcl-root .ring-lines{position:absolute;inset:0;width:100%;height:100%;z-index:2;}.jcl-root .avatar{border-radius:50%;overflow:hidden;flex:none;background:#eaf1ff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),0 1px 2px rgba(17,24,39,.12);}.jcl-root .avatar svg{width:100%;height:100%;display:block;}.jcl-root .cta-card .tile{color:#fff;box-shadow:0 8px 18px rgba(17,24,39,.18);}.jcl-root .cta-card .tile-green{background:linear-gradient(150deg,#10e066,#06c755);}.jcl-root .cta-card .tile-blue{background:linear-gradient(150deg,#46baff,#1ea7ff);}.jcl-root .cta-card .tile-purple{background:linear-gradient(150deg,#9a80ff,#7c5cff);}.jcl-root .cta-card .tile-md{background:linear-gradient(150deg,#2d3e57,#141e2b);color:#fff;}.jcl-root .btn-lg{height:60px;font-size:17px;padding:0 42px;}.jcl-root /* ===== HERO PRODUCT SHOWCASE ===== */
  .pframe{position:absolute;left:40px;top:44px;width:642px;border-radius:16px;background:#fff;box-shadow:0 32px 72px rgba(17,24,39,.20),0 10px 24px rgba(17,24,39,.08);overflow:hidden;border:1px solid #eef1f5;z-index:3;}.jcl-root .pf-top{height:46px;background:var(--footer-navy);display:flex;align-items:center;gap:12px;padding:0 16px;}.jcl-root .pf-logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#fff;}.jcl-root .pf-logo svg,.jcl-root .pf-logo img{width:22px;height:22px;}.jcl-root .pf-ic{width:18px;height:18px;color:#c4cdda;flex:none;}.jcl-root .pf-user{display:flex;align-items:center;gap:8px;margin-left:auto;color:#e6ebf2;font-size:12px;font-weight:700;}.jcl-root .pf-av{width:26px;height:26px;border-radius:50%;background:#1f6f47;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none;}.jcl-root .pf-body{display:flex;height:362px;}.jcl-root .pf-side{width:154px;background:#fff;border-right:1px solid #f0f2f5;padding:16px 12px;flex:none;}.jcl-root .pf-grp{font-size:9px;font-weight:800;color:#aab3c0;letter-spacing:.05em;margin:0 8px 11px;}.jcl-root .pf-nav{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;font-size:12px;font-weight:700;color:#475569;margin-bottom:2px;}.jcl-root .pf-nav svg{width:16px;height:16px;color:#94a3b8;flex:none;}.jcl-root .pf-nav.on{background:var(--primary-soft);color:var(--primary-active);}.jcl-root .pf-nav.on svg{color:var(--primary-active);}.jcl-root .pf-chev{margin-left:auto;width:13px;height:13px;color:#c4cdda;}.jcl-root .pf-sub{font-size:11.5px;font-weight:600;color:#64748b;padding:6px 10px 6px 35px;}.jcl-root .pf-sub.on{color:var(--primary-active);font-weight:800;}.jcl-root .pf-main{flex:1;padding:18px 20px;min-width:0;}.jcl-root .pf-bc{font-size:10px;color:#aab3c0;font-weight:600;margin-bottom:9px;}.jcl-root .pf-mh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}.jcl-root .pf-mh h4{font-size:17px;font-weight:800;color:var(--navy);}.jcl-root .pf-mh p{font-size:10.5px;color:#94a3b8;margin-top:3px;font-weight:500;}.jcl-root .pf-new{background:var(--primary);color:#fff;font-size:11px;font-weight:800;padding:8px 12px;border-radius:9px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex:none;}.jcl-root .pf-new svg{width:13px;height:13px;}.jcl-root .pf-cards{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px;}.jcl-root .pf-card{border:1px solid #eef1f5;border-radius:11px;padding:11px 13px;}.jcl-root .pf-r1{display:flex;align-items:center;justify-content:space-between;}.jcl-root .pf-nm{font-size:13px;font-weight:800;color:var(--navy);}.jcl-root .pf-st{font-size:9.5px;font-weight:700;display:flex;align-items:center;gap:4px;color:#64748b;}.jcl-root .pf-st .d{width:6px;height:6px;border-radius:50%;flex:none;}.jcl-root .pf-meta{font-size:9.5px;color:#aab3c0;margin-top:2px;font-weight:600;}.jcl-root .pf-stat{display:flex;gap:13px;margin-top:9px;font-size:10.5px;font-weight:700;color:#64748b;align-items:center;}.jcl-root .pf-stat span{display:flex;align-items:center;gap:4px;}.jcl-root .pf-stat svg{width:13px;height:13px;color:#aab3c0;flex:none;}.jcl-root .pf-cft{display:flex;align-items:center;justify-content:space-between;margin-top:9px;padding-top:9px;border-top:1px solid #f3f5f8;}.jcl-root .pf-cft .mb{font-size:10px;color:#94a3b8;font-weight:600;}.jcl-root .pf-owner{font-size:9px;font-weight:800;color:var(--primary-active);background:var(--primary-soft);padding:3px 8px;border-radius:5px;}.jcl-root /* hero floating cards + edge badges */
  .hfloat{position:absolute;background:#fff;border:1px solid #eef1f5;border-radius:13px;box-shadow:var(--shadow-lg);padding:11px 13px;display:flex;align-items:center;gap:11px;z-index:6;}.jcl-root .hfloat .tile{width:36px;height:36px;border-radius:10px;}.jcl-root .hfloat .tile svg{width:19px;height:19px;}.jcl-root .hfloat b{font-size:12.5px;font-weight:800;color:var(--navy);display:block;letter-spacing:-0.02em;}.jcl-root .hfloat span{font-size:10.5px;color:#94a3b8;font-weight:600;}`;

const LANDING_HTML = `<header class="site">
  <div class="wrap nav">
    <a class="brand" href="#"><span class="brand-mark"><img src="/brand/logo/symbol.svg" alt=""></span> July Canvas</a>
    <nav class="nav-menu">
      <a href="#features">기능</a>
      <a href="#flow">서비스 흐름</a>
      <a href="#usecases">활용 사례</a>
      <a href="#share">공유/협업</a>
      <a href="#footer">자료</a>
    </nav>
    <div class="nav-right">
      <a class="nav-login" data-signin href="#">로그인</a>
    </div>
  </div>
</header>

<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <span class="eyebrow">
        <svg class="ico" style="width:14px;height:14px" viewBox="0 0 24 24"><path d="M12 3l1.9 4.8L19 9.5l-4 3.4 1.3 5.1L12 15.6 7.7 18l1.3-5.1-4-3.4 5.1-1.7z"/></svg>
        AI 기획 자동화 워크스페이스
      </span>
      <h1 class="hero-h">기획 문서와 프로토타입을<br/><em>한 곳에서 제품으로</em></h1>
      <p class="hero-sub">아이디어나 요구사항을 입력하면 프로젝트 브리프, 시장조사·레퍼런스, 제품화 전략, PRD, 인터랙티브 프로토타입, 개발 전달 패키지까지 하나의 흐름으로 정리됩니다.</p>
      <div class="hero-cta">
        <a class="btn btn-google btn-lg" data-signin href="#">
          <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Google 계정으로 로그인
        </a>
      </div>
    </div>

    <div class="art">
      <div class="blob" style="width:220px;height:220px;left:-60px;top:-50px;background:var(--mint);"></div>
      <div class="blob" style="width:200px;height:200px;right:-50px;bottom:20px;background:#bfe0ff;"></div>

      
      <div class="pframe">
        <div class="pf-top">
          <svg class="pf-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          <span class="pf-logo"><img src="/brand/logo/symbol.svg" alt=""> July Canvas</span>
          <span class="pf-user">
            <svg class="pf-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span class="pf-av">H</span>HeeSun Kim
          </span>
        </div>
        <div class="pf-body">
          <div class="pf-side">
            <div class="pf-grp">공통 관리</div>
            <div class="pf-nav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>대시보드</div>
            <div class="pf-nav on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>프로젝트<svg class="pf-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></div>
            <div class="pf-sub on">프로젝트 목록</div>
            <div class="pf-nav" style="margin-top:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>멤버 · 권한<svg class="pf-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></div>
            <div class="pf-nav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>설정<svg class="pf-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></div>
          </div>
          <div class="pf-main">
            <div class="pf-bc">메인 › 프로젝트 › 프로젝트 목록</div>
            <div class="pf-mh">
              <div><h4>프로젝트 목록</h4><p>기획 → 문서 → 승인까지, 진행 중인 프로젝트를 한곳에서 관리합니다.</p></div>
              <span class="pf-new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>프로젝트 만들기</span>
            </div>
            <div class="pf-cards">
              <div class="pf-card">
                <div class="pf-r1"><span class="pf-nm">555</span><span class="pf-st"><span class="d" style="background:#cbd5e1"></span>초안</span></div>
                <div class="pf-meta">1시간 전 · 최근 수정</div>
                <div class="pf-stat"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>문서 0</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>화면 0</span></div>
                <div class="pf-cft"><span class="mb">멤버 1명</span><span class="pf-owner">OWNER</span></div>
              </div>
              <div class="pf-card">
                <div class="pf-r1"><span class="pf-nm">222</span><span class="pf-st"><span class="d" style="background:var(--primary)"></span>진행 중</span></div>
                <div class="pf-meta">2시간 전 · 최근 수정</div>
                <div class="pf-stat"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>문서 6</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>화면 0</span></div>
                <div class="pf-cft"><span class="mb">멤버 1명</span><span class="pf-owner">OWNER</span></div>
              </div>
              <div class="pf-card">
                <div class="pf-r1"><span class="pf-nm">app</span><span class="pf-st"><span class="d" style="background:var(--primary)"></span>진행 중</span></div>
                <div class="pf-meta">1일 전 · 최근 수정</div>
                <div class="pf-stat"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>문서 4</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>화면 0</span></div>
                <div class="pf-cft"><span class="mb">멤버 1명</span><span class="pf-owner">OWNER</span></div>
              </div>
              <div class="pf-card">
                <div class="pf-r1"><span class="pf-nm">KAKE</span><span class="pf-st"><span class="d" style="background:var(--primary)"></span>진행 중</span></div>
                <div class="pf-meta">2시간 전 · 최근 수정</div>
                <div class="pf-stat"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>문서 5</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>화면 1</span></div>
                <div class="pf-cft"><span class="mb">멤버 1명</span><span class="pf-owner">OWNER</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="hfloat" style="left:8px;top:158px;width:212px;">
        <span class="tile tile-blue"><svg class="ico" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg></span>
        <div><b>프로젝트 브리프</b><span>시장조사·레퍼런스 포함</span></div>
      </div>
      <div class="hfloat" style="left:20px;bottom:54px;width:206px;">
        <span class="tile tile-purple"><svg class="ico" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg></span>
        <div><b>프로토타입</b><span>화면 3개 연결</span></div>
      </div>
      <div class="hfloat" style="right:18px;bottom:34px;width:216px;">
        <span class="tile tile-green"><svg class="ico" viewBox="0 0 24 24"><path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg></span>
        <div><b>개발 전달 패키지</b><span>HANDOFF.md · PRD.md</span></div>
      </div>

    </div>
  </div>
</section>

<section class="section" id="features" style="padding-bottom:60px;">
  <div class="wrap">
    <div class="sec-head center" style="margin-bottom:60px;">
      <div class="kicker">Core Features</div>
      <h2 class="title">아이디어를 제품으로 만드는<br/>July Canvas의 핵심 기능</h2>
      <p class="lead">입력에서 전략·문서·프로토타입·개발 전달까지, 기획의 모든 단계를 하나의 워크스페이스에서 연결합니다.</p>
    </div>

    <div class="bento">
      
      <div class="bento-col">
        
        <div class="bcard b-core" style="flex:1;">
          <h3>July Canvas Core</h3>
          <p class="desc">브리프, 시장조사, 전략, IA, PRD, 프로토타입, 공유, 개발 전달까지<br/>제품 기획에 필요한 모든 기능을 하나로 묶은 통합 워크스페이스.</p>
          <div class="cluster">
            <div class="gtile g1"><svg class="ico" viewBox="0 0 24 24"><path d="M12 3l1.9 4.8L19 9.5l-4 3.4 1.3 5.1L12 15.6 7.7 18l1.3-5.1-4-3.4 5.1-1.7z"/></svg></div>
            <div class="gtile g2"><svg class="ico" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></svg></div>
            <div class="gtile g3"><svg class="ico" viewBox="0 0 24 24"><path d="M4 7h6M4 12h10M4 17h7"/><path d="M16 4h4v16h-4z"/></svg></div>
            <div class="gtile g4"><svg class="ico" viewBox="0 0 24 24"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14 4v5h5"/></svg></div>
            <div class="gtile g5"><svg class="ico" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/></svg></div>
            <div class="gtile g6"><svg class="ico" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.4 13.3l7.2 4.4M15.6 6.3l-7.2 4.4"/></svg></div>
            <div class="gtile g7"><svg class="ico" viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.9A8.4 8.4 0 1 1 21 11.5Z"/></svg></div>
            <div class="gtile g8"><svg class="ico" viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></div>
          </div>
        </div>
        
        <div class="b-bottom">
          <div class="bcard b-drive">
            <h3 style="font-size:20px;">문서 / PRD 관리</h3>
            <p class="desc">브리프·IA·기능정의서·PRD를 한 프로젝트 히스토리로 관리.</p>
            <div style="margin-top:auto;padding-top:20px;display:flex;flex-direction:column;gap:8px;">
              <div class="mini" style="padding:9px 11px;display:flex;align-items:center;gap:9px;"><span style="width:24px;height:24px;border-radius:6px;background:var(--navy);color:#fff;font-size:8px;font-weight:800;display:grid;place-items:center;">MD</span><div style="flex:1;"><div style="font-size:11.5px;font-weight:800;color:#334155;">PRD.md 업데이트됨</div><div style="font-size:9.5px;color:#94a3b8;font-weight:600;">오전 10:34</div></div></div>
              <div class="mini" style="padding:9px 11px;display:flex;align-items:center;gap:9px;"><span class="tile tile-purple" style="width:24px;height:24px;border-radius:6px;"><svg class="ico" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M4 7h6M4 12h10"/><path d="M16 4h4v16h-4z"/></svg></span><div style="flex:1;"><div style="font-size:11.5px;font-weight:800;color:#334155;">IA 문서 수정됨</div><div style="font-size:9.5px;color:#94a3b8;font-weight:600;">오후 03:10</div></div></div>
            </div>
          </div>
          <div class="bcard b-note">
            <h3 style="font-size:20px;">프로토타입 / 피드백</h3>
            <p class="desc">검증용 프로토타입과 코멘트를 한 곳에서 정리.</p>
            <div style="margin-top:auto;padding-top:20px;">
              <div class="mini" style="padding:11px 13px;">
                <div style="display:flex;align-items:center;gap:7px;"><span style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#7c5cff,#1ea7ff)"></span><span style="font-size:11px;font-weight:800;color:#334155;">기획자</span><span class="pin" style="margin-left:auto;background:var(--primary-soft);color:var(--primary-active);">확인</span></div>
                <p style="font-size:11px;color:#64748b;margin-top:7px;line-height:1.5;font-weight:500;">온보딩 플로우 검토 완료했어요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="bento-col">
        
        <div class="bcard b-mgmt">
          <h3 style="font-size:20px;">제품화 전략</h3>
          <p class="desc">누가 돈을 낼지, 어떤 MVP부터 검증할지 정리합니다.</p>
          <div class="mini" style="margin-top:auto;padding:12px 14px;display:flex;align-items:center;gap:10px;">
            <span class="tile tile-purple" style="width:30px;height:30px;border-radius:8px;"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg></span>
            <div style="flex:1;display:flex;gap:6px;flex-wrap:wrap;"><span class="chip chip-purple">MVP 범위</span><span class="chip">수익 모델</span></div>
          </div>
        </div>
        
        <div class="bcard b-ai">
          <h3>AI 기획 자동화</h3>
          <p class="desc">아이디어와 요구사항을 입력하면 기획 초안이 자동으로 생성됩니다.</p>
          <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px;">
            <div class="mini" style="padding:11px 14px;display:flex;align-items:center;gap:10px;"><span style="font-size:12.5px;color:#94a3b8;font-weight:600;flex:1;">아이디어를 입력하세요…</span><span style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#06c755,#1ea7ff);display:grid;place-items:center;color:#fff;"><svg class="ico" viewBox="0 0 24 24" style="width:15px;height:15px"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#5b3ee0;"><span style="width:18px;height:18px;border-radius:50%;background:var(--purple-soft);display:grid;place-items:center;"><svg class="ico" viewBox="0 0 24 24" style="width:11px;height:11px;color:var(--purple)"><path d="M12 3l1.9 4.8L19 9.5l-4 3.4 1.3 5.1L12 15.6 7.7 18l1.3-5.1-4-3.4 5.1-1.7z"/></svg></span> 브리프·시장조사 분석 중…</div>
            <div class="mini" style="padding:13px 15px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span class="pin" style="background:var(--primary-soft);color:var(--primary-active);">제품화 전략</span><span style="font-size:10.5px;color:#94a3b8;font-weight:600;">초안 생성됨</span></div>
              <div style="font-size:11.5px;color:#475569;line-height:1.55;font-weight:500;">타깃 고객 · 수익 모델 · 진입 시장 · MVP 범위를 한 번에 정리합니다.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section flow" id="flow">
  <div class="wrap flow-grid">
    <div class="ring">
      <div class="ring-disc"></div>
      <svg class="ring-lines" viewBox="0 0 500 500" fill="none"><g stroke="#cfe0ee" stroke-width="1.6"><line x1="250" y1="250" x2="250" y2="86"/><line x1="250" y1="250" x2="393" y2="168"/><line x1="250" y1="250" x2="393" y2="332"/><line x1="250" y1="250" x2="250" y2="414"/><line x1="250" y1="250" x2="107" y2="332"/><line x1="250" y1="250" x2="107" y2="168"/></g></svg>
      <div class="ring-core">
        <img src="/brand/logo/symbol.svg" alt="">
        <b>July Canvas</b>
      </div>
      <div class="rnode" style="left:250px;top:86px;"><span class="gt g5"><svg class="ico" viewBox="0 0 24 24"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14 4v5h5"/></svg></span><span>프로젝트 브리프</span></div>
      <div class="rnode" style="left:393px;top:168px;"><span class="gt g2"><svg class="ico" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></svg></span><span>시장조사 ·<br/>레퍼런스</span></div>
      <div class="rnode" style="left:393px;top:332px;"><span class="gt g3"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg></span><span>제품화 전략</span></div>
      <div class="rnode" style="left:250px;top:414px;"><span class="gt g7"><svg class="ico" viewBox="0 0 24 24"><path d="M4 7h6M4 12h10M4 17h7"/><path d="M16 4h4v16h-4z"/></svg></span><span>PRD · IA ·<br/>기능정의서</span></div>
      <div class="rnode" style="left:107px;top:332px;"><span class="gt g6"><svg class="ico" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/></svg></span><span>인터랙티브<br/>프로토타입</span></div>
      <div class="rnode" style="left:107px;top:168px;"><span class="gt g4"><svg class="ico" viewBox="0 0 24 24"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M16 12h6"/></svg></span><span>개발 전달<br/>패키지</span></div>
    </div>
    <div>
      <div class="kicker">Workflow</div>
      <h2 class="title">기획의 시작부터 개발 전달까지<br/>하나의 플랫폼에서 이어집니다.</h2>
      <p class="lead">아이디어 입력, 브리프, 시장조사, 제품화 전략, PRD, 프로토타입, 개발 전달 패키지가 하나의 July Canvas 워크스페이스에서 연결됩니다. 문서와 화면이 분리되지 않고 프로젝트 히스토리로 축적됩니다.</p>
      <div style="display:flex;gap:10px;margin-top:30px;flex-wrap:wrap;">
        <span class="chip chip-green">입력</span><span class="chip chip-blue">→ 생성</span><span class="chip chip-purple">→ 검토</span><span class="chip">→ 공유</span><span class="chip chip-green">→ 전달</span>
      </div>
    </div>
  </div>
</section>

<section class="section" id="usecases">
  <div class="wrap">
    <div class="uc-top">
      <div class="sec-head"><div class="kicker">Use Cases</div><h2 class="title" style="margin-top:14px;">July Canvas 활용 시나리오</h2></div>
      <a class="uc-all" href="#">전체보기 <svg class="ico" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    </div>
    <div class="uc-grid">
      <div class="uc">
        <div class="uc-thumb th-green"><div class="swoosh"></div>
          <div class="mini ov" style="position:relative;width:100%;max-width:200px;padding:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span class="tile tile-green" style="width:26px;height:26px;border-radius:7px;"><svg class="ico" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M12 3l1.9 4.8L19 9.5l-4 3.4 1.3 5.1L12 15.6 7.7 18l1.3-5.1-4-3.4 5.1-1.7z"/></svg></span><b style="font-size:12.5px;color:#1f2937;">MVP 정의</b></div>
            <div style="font-size:11px;color:#475569;font-weight:600;line-height:1.5;">타깃 고객 · 수익 모델 · 진입 시장</div>
            <div style="display:flex;gap:5px;margin-top:9px;"><span class="chip chip-green" style="padding:3px 8px;">시장조사</span></div>
          </div>
        </div>
        <h3>아이디어를 MVP로 정리할 때</h3>
        <div class="meta">활용 가이드 · 아이디어 → MVP</div>
      </div>

      <div class="uc">
        <div class="uc-thumb th-blue"><div class="swoosh s2"></div>
          <div class="ov" style="position:relative;text-align:center;">
            <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;opacity:.9;">JULY CANVAS</div>
            <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:4px;">RFP → 실행</div>
            <div style="font-size:11.5px;font-weight:600;opacity:.9;margin-top:10px;">요구사항 분석 · 기획 초안 자동화</div>
          </div>
        </div>
        <h3>요구사항/RFP를 받았을 때</h3>
        <div class="meta">활용 가이드 · RFP → 실행</div>
      </div>

      <div class="uc">
        <div class="uc-thumb th-purple"><div class="swoosh"></div>
          <div class="ov" style="position:relative;width:208px;height:152px;">
            <div class="mini" style="position:absolute;left:6px;top:20px;width:84px;height:118px;padding:7px;transform:rotate(-7deg);"><div style="height:22px;border-radius:6px 6px 3px 3px;background:linear-gradient(160deg,#06c755,#04a847);"></div><div style="padding:7px 3px;display:flex;flex-direction:column;gap:5px;"><span style="height:7px;border-radius:3px;background:#eef1f5;display:block;"></span><span style="height:7px;width:68%;border-radius:3px;background:#eef1f5;display:block;"></span></div></div>
            <div class="mini" style="position:absolute;left:62px;top:6px;width:86px;height:130px;padding:7px;z-index:3;box-shadow:var(--shadow-lg);"><div style="height:24px;border-radius:6px 6px 3px 3px;background:linear-gradient(160deg,#1ea7ff,#0d8fe0);"></div><div style="padding:7px 3px;display:flex;flex-direction:column;gap:5px;"><span style="height:7px;border-radius:3px;background:#eef1f5;display:block;"></span><span style="height:20px;border-radius:5px;background:var(--primary);display:block;"></span></div></div>
            <div class="mini" style="position:absolute;left:120px;top:22px;width:82px;height:114px;padding:7px;transform:rotate(7deg);"><div style="height:22px;border-radius:6px 6px 3px 3px;background:linear-gradient(160deg,#7c5cff,#5f3ef0);"></div><div style="padding:7px 3px;display:flex;flex-direction:column;gap:5px;"><span style="height:7px;border-radius:3px;background:#eef1f5;display:block;"></span><span style="height:7px;width:60%;border-radius:3px;background:#eef1f5;display:block;"></span></div></div>
          </div>
        </div>
        <h3>프로토타입으로 빠르게 검증할 때</h3>
        <div class="meta">활용 가이드 · 검증</div>
      </div>

      <div class="uc">
        <div class="uc-thumb th-navy"><div class="swoosh s2"></div>
          <div class="mini ov" style="position:relative;width:100%;max-width:200px;padding:13px;">
            <div style="display:flex;flex-direction:column;gap:7px;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:23px;height:23px;border-radius:6px;background:var(--navy);color:#fff;font-size:8px;font-weight:800;display:grid;place-items:center;">MD</span><span style="font-size:11.5px;font-weight:800;color:#334155;">HANDOFF.md</span></div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:23px;height:23px;border-radius:6px;background:var(--navy);color:#fff;font-size:8px;font-weight:800;display:grid;place-items:center;">MD</span><span style="font-size:11.5px;font-weight:800;color:#334155;">PRD.md</span></div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:23px;height:23px;border-radius:6px;background:var(--primary);color:#fff;font-size:7px;font-weight:800;display:grid;place-items:center;">URL</span><span style="font-size:11.5px;font-weight:800;color:#334155;">PROTOTYPE</span></div>
            </div>
          </div>
        </div>
        <h3>개발팀에 전달해야 할 때</h3>
        <div class="meta">활용 가이드 · 개발 전달</div>
      </div>
    </div>
  </div>
</section>

<section class="section share-sec" id="share">
  <div class="wrap share-grid">
    <div>
      <div class="kicker">Share &amp; Collaborate</div>
      <h2 class="title">프로젝트와 문서를<br/>안전하게 공유하고 검토하세요.</h2>
      <p class="lead">프로젝트, 문서, 개발 전달 패키지를 각각 공유할 수 있고, 외부 읽기 전용 링크와 비로그인 코멘트를 통해 팀 밖의 피드백도 안전하게 관리할 수 있습니다.</p>
      <div class="checklist">
        <div class="ck"><span class="ci"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>프로젝트 · 문서 · 개발 전달 패키지 공유 링크</div>
        <div class="ck"><span class="ci"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>외부 읽기 전용 공유 · 비로그인 열람</div>
        <div class="ck"><span class="ci"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>비로그인 코멘트 · 승인 후 공개</div>
        <div class="ck"><span class="ci"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>코멘트 승인 / 숨김 / 삭제 관리</div>
      </div>
    </div>
    <div class="share-art">
      <div class="card" style="position:absolute;left:0;top:8px;width:330px;padding:18px 20px;box-shadow:var(--shadow-lg);z-index:3;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;"><span class="tile tile-green" style="border-radius:9px"><svg class="ico" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></span><b style="font-size:15px;color:#1f2937;">공유 링크 만들기</b></div>
        <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:9px;padding:9px 12px;background:#f8fafc;"><span style="font-size:12.5px;color:#64748b;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">july.canvas/p/health-app</span><span class="chip chip-green">복사</span></div>
        <div style="display:flex;gap:7px;margin-top:13px;flex-wrap:wrap;"><span class="chip">프로젝트</span><span class="chip">문서</span><span class="chip chip-blue">전달 패키지</span><span class="chip" style="background:var(--blue-soft);color:#0a78c4;border-color:#cfe7fb;">읽기 전용</span></div>
      </div>
      <div class="card" style="position:absolute;right:0;top:172px;width:300px;padding:16px 18px;box-shadow:var(--shadow-lg);z-index:4;">
        <div style="display:flex;align-items:center;gap:9px;"><span class="avatar" style="width:30px;height:30px;"><svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" fill="#FBE3CE"/><path d="M24 27c-8.5 0-15.5 6-16.5 14.5h33C39.5 33 32.5 27 24 27Z" fill="#6486E8"/><circle cx="24" cy="19" r="9" fill="#F4C8A0"/><path d="M14 21c-1.6-8 3.5-14 10-14s11.6 6 10 14c-1-4.4-3-5.6-5-6.6-3 3.4-11 3.4-13.4-.6C14.4 16 13.6 18 14 21Z" fill="#3C2B25"/></svg></span><b style="font-size:13px;color:#1f2937;">정지수 · 외부 검토자</b><span class="pin" style="background:#fff5e6;color:#b97400;margin-left:auto;">pending</span></div>
        <p style="font-size:13px;color:#475569;margin-top:10px;line-height:1.55;font-weight:500;">온보딩 단계가 한 단계 더 필요해 보여요. 검토 부탁드립니다.</p>
        <div style="display:flex;gap:7px;margin-top:13px;"><span class="btn btn-primary btn-sm" style="height:32px;font-size:12px;padding:0 13px;">승인</span><span class="chip">숨김</span><span class="chip">삭제</span></div>
      </div>
      <div class="card" style="position:absolute;left:40px;bottom:0;width:250px;padding:15px 17px;box-shadow:var(--shadow-md);z-index:2;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;"><svg class="ico" style="width:16px;color:var(--blue)" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><b style="font-size:13px;color:#1f2937;">읽기 전용 문서</b></div>
        <div style="font-size:11.5px;color:#475569;line-height:1.7;font-weight:500;">1. 서비스 개요<br/>2. 핵심 기능 정의<br/>3. 화면 흐름과 IA</div>
        <div style="display:flex;gap:5px;margin-top:12px;"><span class="chip" style="padding:3px 8px">소유자</span><span class="chip" style="padding:3px 8px">편집자</span><span class="chip" style="padding:3px 8px;background:var(--blue-soft);color:#0a78c4;border-color:#cfe7fb">뷰어</span></div>
      </div>
    </div>
  </div>
</section>

<section class="cta">
  <div class="wrap">
    <div class="cta-box">
      <div class="cta-card" style="left:40px;top:46px;transform:rotate(-7deg);"><span class="tile tile-green"><svg class="ico" viewBox="0 0 24 24"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14 4v5h5"/></svg></span><div><b>프로젝트 브리프</b><span>시장조사·레퍼런스</span></div></div>
      <div class="cta-card" style="left:88px;bottom:52px;transform:rotate(5deg);"><span class="tile tile-blue"><svg class="ico" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></svg></span><div><b>시장조사</b><span>국내 200만</span></div></div>
      <div class="cta-card" style="right:54px;top:54px;transform:rotate(6deg);"><span class="tile tile-md"><svg class="ico" viewBox="0 0 24 24" style="color:#fff"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 16.5h4"/></svg></span><div><b>PRD.md</b><span>v1.2 · 승인</span></div></div>
      <div class="cta-card" style="right:40px;bottom:92px;transform:rotate(-5deg);"><span class="tile tile-green"><svg class="ico" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></span><div><b>프로토타입 URL</b><span>확정 링크</span></div></div>
      <div class="cta-card" style="right:104px;bottom:34px;transform:rotate(4deg);"><span class="tile tile-purple"><svg class="ico" viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.9A8.4 8.4 0 1 1 21 11.5Z"/><path d="M9 11h6"/></svg></span><div><b>승인된 코멘트</b><span>외부 검토자</span></div></div>
      <h2>July Canvas를 지금 시작해보세요.</h2>
      <p>기획 문서, 프로토타입, 공유와 개발 전달까지 하나의 워크스페이스에서 연결해보세요.</p>
      <div class="cta-btns">
        <a class="btn btn-google btn-lg" data-signin href="#"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Google 계정으로 로그인</a>
      </div>
    </div>
  </div>
</section>

<footer class="site" id="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-brand"><span class="brand-mark"><img src="/brand/logo/symbol.svg" alt=""></span> July Canvas</div>
        <p class="foot-tag">아이디어와 요구사항을 제품화 전략, PRD, 프로토타입, 개발 전달 패키지까지 잇는 AI 기획 자동화 워크스페이스.</p>
      </div>
      <div class="foot-col"><h4>제품</h4><ul><li><a href="#">기능 소개</a></li><li><a href="#">문서 자동화</a></li><li><a href="#">프로토타이핑</a></li><li><a href="#">공유</a></li><li><a href="#">개발 전달 패키지</a></li></ul></div>
      <div class="foot-col"><h4>활용</h4><ul><li><a href="#">아이디어 제품화</a></li><li><a href="#">요구사항/RFP 기반 기획</a></li><li><a href="#">시장조사</a></li><li><a href="#">PRD 작성</a></li><li><a href="#">팀 협업</a></li></ul></div>
      <div class="foot-col"><h4>자료</h4><ul><li><a href="#">사용 가이드</a></li><li><a href="#">업데이트 노트</a></li><li><a href="#">도입 문의</a></li><li><a href="#">자주 묻는 질문</a></li></ul></div>
      <div class="foot-col"><h4>회사 / 정책</h4><ul><li><a href="#">서비스 소개</a></li><li><a href="#">이용약관</a></li><li><a href="#">개인정보처리방침</a></li></ul></div>
    </div>
    <div class="foot-bottom">
      <span>© July Canvas</span>
      <div class="lk"><a href="#">이용약관</a><a href="#">개인정보처리방침</a></div>
    </div>
  </div>
</footer>`;

export default function AnonymousLanding({ onSignIn }: { onSignIn: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-signin]');
      if (target) { e.preventDefault(); onSignIn(); }
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onSignIn]);
  return (
    <div ref={rootRef} className="jcl-root">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </div>
  );
}
