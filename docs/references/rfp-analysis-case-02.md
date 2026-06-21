# RFP Analysis Case 02 — AI 360 팬 인터랙션

## 원본 공유 링크

https://chatgpt.com/share/6a376a7c-e50c-83e8-a221-e655e2effaee

## 상태

ChatGPT 공유 링크 본문을 자동으로 안정적으로 가져오지 못했습니다.  
Claude Code 또는 외부 WebFetch 환경에서도 로그인 화면만 보이거나 본문이 비어 있을 수 있으므로, 이 파일에는 원본 링크와 붙여넣기 위치를 남깁니다.

## 사용 방법

1. 위 공유 링크를 브라우저에서 직접 엽니다.
2. 대화 본문 전체를 복사합니다.
3. 아래 `원문 대화` 섹션에 붙여넣습니다.
4. 이 파일을 July Canvas 레포의 `docs/references/` 경로에 저장합니다.
5. Claude Code에는 `docs/references/rfp-analysis-case-01~03.md`를 참고하라고 지시합니다.

## 원문 대화

ChatGPT





















공유된 ChatGPT 대화의 사본입니다.

대화 신고하기

파일 업로드됨
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Music, Image as ImageIcon, CheckSquare, Search, Bell, 
  MonitorPlay, Settings, MessageCircle, DollarSign, Users, BarChart, 
  ChevronRight, ChevronDown, X, Plus, PlayCircle, CheckCircle, Check, Sparkles,
  Folder, BarChart2, DownloadCloud, PenTool, Book, HelpCircle, CreditCard,
  Layout, Crosshair, MapPin, Box, ImagePlus, ShieldCheck, Video, Mic, FileText, Activity, Server,
  Wand2, Undo, Redo, MousePointer2, AlertCircle, Move, Filter, Heart, Share2, MoreHorizontal, ThumbsUp, MessageSquare,
  Play, RotateCcw, UserPlus, Edit3, Trash2, Eye, PowerOff, FileCheck2, Lock, Info, ExternalLink, Link, AlertTriangle, Monitor, Smartphone, MessageCircleHeart, PauseCircle
} from 'lucide-react';

// 사용자가 첨부한 실제 로컬 이미지 파일명 매핑 (웹에서 바로 보이도록 샘플 URL로 대체)
const IMAGE_URL_HALF = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=400&h=400"; // 상반신 샘플
const IMAGE_URL_FULL = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400&h=800"; // 전신 샘플

// ==========================================
// 시나리오 데이터 정의 (사업계획서 기준 10종)
// ==========================================
const REACTION_SETS = [
  // 자유 대화형
  { id: "free_01", name: "기본 팬 소통형", category: "자유 대화형", isRecommended: true, description: "인사, 하트 요청, 춤 요청, 응원 댓글에 반응합니다.", tags: ["인사", "하트", "춤", "응원"], examples: [{ userInput: "안녕, 반가워", aiAction: "환영 인사" }, { userInput: "하트해줘", aiAction: "하트 제스처" }, { userInput: "춤춰줘", aiAction: "짧은 춤 액션" }, { userInput: "오늘도 예뻐", aiAction: "감사 인사" }] },
  { id: "free_02", name: "라이브 토크형", category: "자유 대화형", isRecommended: false, description: "질문 답변, 짧은 대화, 감정 리액션 중심입니다.", tags: ["질문답변", "감정리액션", "소통"], examples: [{ userInput: "오늘 뭐했어?", aiAction: "일상 공유 및 답변" }, { userInput: "너무 웃겨", aiAction: "함께 웃는 리액션" }] },
  { id: "free_03", name: "팬덤 친화형", category: "자유 대화형", isRecommended: false, description: "팬 이름 부르기, 칭찬, 감사 인사 중심입니다.", tags: ["팬이름", "칭찬", "감사"], examples: [{ userInput: "나 왔어!", aiAction: "이름 부르며 반갑게 환영" }, { userInput: "항상 응원해", aiAction: "감동받은 표정과 감사 인사" }] },
  // 참여 선택형
  { id: "choice_01", name: "선택지 반응형", category: "참여 선택형", isRecommended: false, description: "팬이 선택지를 고르면 AI 휴먼이 반응합니다.", tags: ["선택지", "인터랙션", "결과반응"], examples: [{ userInput: "나는 1번!", aiAction: "1번 선택에 따른 리액션" }] },
  { id: "choice_02", name: "투표 참여형", category: "참여 선택형", isRecommended: false, description: "팬 투표, 선호도 질문, 결과 반응 중심입니다.", tags: ["투표", "선호도", "참여유도"], examples: [{ userInput: "A가 더 좋은 거 같아", aiAction: "투표 현황 언급 및 공감" }] },
  // 일상 공유형
  { id: "daily_01", name: "데일리 토크형", category: "일상 공유형", isRecommended: false, description: "오늘의 기분, 일상 인사, 가벼운 잡담 중심입니다.", tags: ["일상", "기분", "잡담"], examples: [{ userInput: "오늘 너무 피곤해", aiAction: "위로와 격려의 말" }] },
  { id: "daily_02", name: "루틴 공유형", category: "일상 공유형", isRecommended: false, description: "공부, 운동, 식사, 하루 계획 같은 루틴형 대화 중심입니다.", tags: ["루틴", "공부/운동", "목표"], examples: [{ userInput: "방금 운동하고 왔어", aiAction: "칭찬과 에너지 넘치는 응원" }] },
  // 이벤트·시즌형
  { id: "event_01", name: "생일·기념일형", category: "이벤트·시즌형", isRecommended: false, description: "생일 축하, 기념일 축하, 특별 인사 중심입니다.", tags: ["생일", "기념일", "축하"], examples: [{ userInput: "오늘 내 생일이야!", aiAction: "생일 축하 노래/특별 제스처" }] },
  { id: "event_02", name: "시즌 이벤트형", category: "이벤트·시즌형", isRecommended: false, description: "크리스마스, 새해, 컴백 등 시즌성 대화 중심입니다.", tags: ["시즌", "명절", "이벤트"], examples: [{ userInput: "새해 복 많이 받아", aiAction: "새해 인사 및 덕담" }] },
  // 미니게임형
  { id: "game_01", name: "미니게임형", category: "미니게임형", isRecommended: false, description: "간단한 선택 게임, 랜덤 반응, 포인트성 리액션 중심입니다.", tags: ["미니게임", "랜덤", "포인트"], examples: [{ userInput: "주사위 굴려줘", aiAction: "주사위 던지는 액션 및 결과 발표" }] }
];

const BGM_LIST = [
  { id: "bgm_01", name: "BGM_001 로파이·칠", tag: "차분하고 편안한 팬 소통 공간" },
  { id: "bgm_02", name: "BGM_002 에너지 팝", tag: "밝고 활기찬 분위기" },
  { id: "bgm_03", name: "BGM_003 몽환적 신스", tag: "신비롭고 독특한 세계관" },
  { id: "bgm_04", name: "BGM_004 편안한 어쿠스틱", tag: "따뜻하고 일상적인 대화" },
  { id: "bgm_05", name: "BGM_005 이벤트 업비트", tag: "축하, 파티, 미니게임" },
];

const preDeployedContents = [
  { id: 1, title: "X:IN 아리아 팬 스페이스", type: "AI 360", status: "공개", date: "2026.06.05", views: "1.2K", avatar: "아리아" },
  { id: 2, title: "X:IN 루나 인터랙션 룸", type: "AI 360", status: "공개", date: "2026.06.04", views: "980", avatar: "루나" },
  { id: 3, title: "X:IN 미카의 숲속 산책", type: "AI 360", status: "공개", date: "2026.06.03", views: "2.1K", avatar: "미카" },
  { id: 4, title: "X:IN 세라 모던 갤러리", type: "AI 360", status: "공개", date: "2026.06.02", views: "850", avatar: "세라" },
  { id: 5, title: "X:IN 유나 팬미팅", type: "AI 360", status: "공개", date: "2026.06.01", views: "3.4K", avatar: "유나" },
  { id: 6, title: "하린의 버츄얼 라이브", type: "AI 360", status: "공개", date: "2026.05.30", views: "4.5K", avatar: "하린" },
  { id: 7, title: "린과 함께하는 Q&A", type: "AI 360", status: "공개", date: "2026.05.29", views: "2.8K", avatar: "린" },
  { id: 8, title: "노아의 비밀 아지트", type: "AI 360", status: "공개", date: "2026.05.28", views: "5.1K", avatar: "노아" },
  { id: 9, title: "이브의 프라이빗 룸", type: "AI 360", status: "공개", date: "2026.05.25", views: "1.1K", avatar: "이브" },
  { id: 10, title: "카이 스트리밍 공간", type: "AI 360", status: "공개", date: "2026.05.20", views: "3.2K", avatar: "카이" },
];

// ==========================================
// 공통 컴포넌트 & 레이아웃
// ==========================================

const PrototypeNav = ({ current, setScreen }) => (
  <div className="bg-[#111] text-[11px] md:text-xs text-white p-2 flex items-center justify-between border-b border-gray-800 shadow-md">
    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
      <span className="font-bold text-fuchsia-400 border border-fuchsia-400/50 px-2 py-0.5 rounded bg-fuchsia-400/10">PROTOTYPE NAV</span>
      <NavBtn active={current === 'home'} onClick={() => setScreen('home')}>0. 메인(팬 화면)</NavBtn>
      <ChevronRight size={12} className="text-gray-600 hidden sm:block shrink-0" />
      <NavBtn active={current === 'channel_settings'} onClick={() => setScreen('channel_settings')}>1. 채널설정(AI휴먼)</NavBtn>
      <ChevronRight size={12} className="text-gray-600 hidden sm:block shrink-0" />
      <NavBtn active={current === 'content_list'} onClick={() => setScreen('content_list')}>2. 콘텐츠 관리</NavBtn>
      <ChevronRight size={12} className="text-gray-600 hidden sm:block shrink-0" />
      <NavBtn active={current === 'pipeline'} onClick={() => setScreen('pipeline')}>3. AI 360 제작</NavBtn>
      <ChevronRight size={12} className="text-gray-600 hidden sm:block shrink-0" />
      <NavBtn active={current === 'approval'} onClick={() => setScreen('approval')}>4. 게시 정보 설정</NavBtn>
      <ChevronRight size={12} className="text-gray-600 hidden sm:block shrink-0" />
      <NavBtn active={current === 'player'} onClick={() => setScreen('player')}>5. 팬 플레이어</NavBtn>
    </div>
    <div className="hidden lg:flex text-gray-500 font-mono text-[10px] border border-gray-700 px-2 py-0.5 rounded shrink-0 ml-4">
      MVP Workflow Simulation
    </div>
  </div>
);

const NavBtn = ({ active, onClick, children }) => (
  <button 
    onClick={onClick} 
    className={px-2 py-1 rounded transition pointer-events-auto ${active ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}}
  >
    {children}
  </button>
);

const XromedaLayout = ({ children, currentTab, setScreen }) => {
  return (
    <div className="flex h-full w-full bg-[#f9fafb] text-gray-900 font-sans relative z-0">
      <div className="w-64 border-r border-gray-200 flex flex-col bg-white shrink-0 relative z-30 shadow-sm">
        <div className="h-16 flex items-center px-6">
          <span className="text-red-500 font-black text-2xl tracking-tighter">XROMEDA</span>
        </div>
        
        <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">X</div>
          <div>
            <div className="font-bold text-sm text-gray-800">X:IN Official</div>
            <div className="text-xs text-gray-400 mt-0.5">channel_admin</div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          <MenuButton icon={<MonitorPlay size={18}/>} label="콘텐츠 관리" active={currentTab === 'content_list' || currentTab === 'approval'} onClick={() => setScreen('content_list')} isRed={currentTab === 'content_list' || currentTab === 'approval'} />
          <MenuButton icon={<MessageCircle size={18}/>} label="커뮤니티" />
          <MenuButton icon={<DollarSign size={18}/>} label="상품 & 수익" />
          <MenuButton icon={<Users size={18}/>} label="회원 관리" />
          <MenuButton icon={<BarChart size={18}/>} label="분석" />
          <MenuButton icon={<CreditCard size={18}/>} label="정산" />
          <MenuButton icon={<Settings size={18}/>} label="채널설정" active={currentTab === 'channel_settings'} onClick={() => setScreen('channel_settings')} isRed={currentTab === 'channel_settings'} />
          <MenuButton icon={<Book size={18}/>} label="크리에이터 가이드" />
        </nav>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-h-0 bg-white">
         <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 shrink-0 relative z-20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
           <div className="font-bold text-lg text-gray-800">
             {currentTab === 'channel_settings' ? '채널설정' : '콘텐츠 관리'}
           </div>
           <div className="flex items-center gap-5 text-gray-500">
             <button className="hover:text-gray-800 transition"><Search size={20} /></button>
             <button className="hover:text-gray-800 transition"><Bell size={20} /></button>
           </div>
         </div>
         <div className="flex-1 overflow-hidden relative min-h-0">
           {children}
         </div>
      </div>
    </div>
  );
};

const MenuButton = ({ icon, label, active, onClick, isRed }) => {
  const baseClass = "w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer";
  const activeClass = isRed 
    ? "text-red-500 border-r-4 border-red-500 bg-red-50" 
    : "text-gray-900 border-r-4 border-gray-900 bg-gray-100";
  const inactiveClass = "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent";
  
  return (
    <div onClick={onClick} className={${baseClass} ${active ? activeClass : inactiveClass}}>
      <span className={active ? (isRed ? 'text-red-500' : 'text-gray-900') : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </div>
  );
};

// ==========================================
// 0. 팬 화면 (메인 홈)
// ==========================================
const FanLayout = ({ children, setScreen, currentScreen }) => {
  return (
    <div className="flex h-full w-full bg-white text-gray-900 font-sans relative z-0">
      <div className="w-64 border-r border-gray-200 flex flex-col bg-[#fcfcfc] shrink-0 relative z-30 h-full overflow-y-auto custom-scrollbar shadow-sm">
        <div className="h-16 flex items-center px-6 shrink-0">
          <span className="text-red-500 font-black text-2xl tracking-tighter">XROMEDA</span>
        </div>
        
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm">US</div>
          <div>
            <div className="font-bold text-sm text-gray-900">user123</div>
            <div className="text-[10px] text-gray-500">user123@example.com</div>
          </div>
        </div>
        
        <div className="py-3">
          <div className="px-6 py-2.5 flex items-center gap-3 text-sm font-bold text-red-500 bg-red-50 cursor-pointer border-r-4 border-red-500">
             <Layout size={18}/> 홈
          </div>
          <div className="px-6 py-2.5 flex items-center gap-3 text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer border-r-4 border-transparent">
             <Search size={18}/> 둘러보기
          </div>
          <div className="px-6 py-2.5 flex items-center gap-3 text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer border-r-4 border-transparent">
             <PenTool size={18}/> 브러시
          </div>
          <div className="px-6 py-2.5 flex items-center gap-3 text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer border-r-4 border-transparent">
             <Bell size={18}/> 알림
             <span className="ml-auto w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px]">N</span>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
           <button className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition text-gray-800">
             <Plus size={14}/> 업로드
           </button>
        </div>

        <div className="py-4">
           <div className="px-6 text-[10px] text-gray-400 font-bold mb-3 uppercase tracking-wider">가입채널</div>
           <div className="px-6 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-100">
             <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-[8px] flex items-center justify-center font-bold">X:IN</div>
             <span className="text-xs font-bold text-gray-800">X:IN Official</span>
           </div>
           <div className="px-6 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-100">
             <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center font-bold">IB</div>
             <span className="text-xs font-bold text-gray-800">인피니티 블루</span>
           </div>
           <div className="px-6 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-100">
             <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-bold">RS</div>
             <span className="text-xs font-bold text-gray-800">RESCENE Official</span>
           </div>
           <div className="px-6 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-100">
             <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition ml-1"><Plus size={14}/> 전체보기</button>
           </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative z-10 min-h-0">
        {children}
      </div>
    </div>
  )
}

const MainHomeView = ({ onPlayContent }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex flex-col bg-white">
      {/* 상단 배너 */}
      <div className="w-full bg-[#FFE5E5] relative">
         <img src="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=1600&h=400" className="w-full h-[250px] md:h-[320px] object-cover opacity-80" alt="banner" />
         <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-bold tracking-widest uppercase bg-red-500/80 px-3 py-1 rounded-full mb-3 shadow-lg">New AI 360 Experience</span>
            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-xl text-center">X:IN 팬 스페이스 오픈</h1>
            <p className="text-white/90 font-medium mt-3 drop-shadow-md text-sm">30인의 AI 휴먼과 함께하는 360 공간에서 실시간 소통을 경험하세요.</p>
         </div>
      </div>
      
      {/* 채널 헤더 */}
      <div className="max-w-6xl mx-auto w-full px-8 pb-8 -mt-12 relative z-10">
         <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-900 rounded-3xl border-4 border-white shadow-lg flex items-center justify-center text-white font-black text-2xl overflow-hidden mb-4">
               X:IN
            </div>
            <h2 className="text-2xl font-black text-gray-900">X:IN Official</h2>
            <p className="text-sm text-gray-500 mt-1">X:IN의 공식 360 공간. 자유롭게 대화하고 교감하세요!</p>
            <div className="text-xs font-bold text-gray-400 mt-2">회원 12.4K · 콘텐츠 173</div>
            <button className="mt-4 bg-black hover:bg-gray-800 text-white font-bold px-8 py-3 rounded-xl transition shadow-md">무료로 가입하기</button>
         </div>
         
         {/* 탭 */}
         <div className="flex justify-center gap-8 border-b border-gray-200 mt-8">
            <button className="pb-3 border-b-2 border-black text-sm font-bold text-gray-900">홈</button>
            <button className="pb-3 border-b-2 border-transparent text-sm font-bold text-gray-500 hover:text-gray-900 transition">멤버십</button>
            <button className="pb-3 border-b-2 border-transparent text-sm font-bold text-gray-500 hover:text-gray-900 transition">팬보드</button>
            <button className="pb-3 border-b-2 border-transparent text-sm font-bold text-gray-500 hover:text-gray-900 transition">소개</button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 pb-20 flex gap-12">
        {/* 메인 피드 (좌측) */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-900">최근 콘텐츠</h3>
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition"><Filter size={14}/></button>
          </div>
          
          <div className="flex flex-col gap-10">
            {preDeployedContents.map(content => (
              <div key={content.id} className="pb-8 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">X:IN</div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 leading-tight">X:IN Official</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 font-medium">{content.date}</div>
                  </div>
                  <button className="ml-auto text-gray-400 hover:text-gray-900 transition"><MoreHorizontal size={20}/></button>
                </div>
                
                <h4 className="text-lg font-black text-gray-900 mb-1.5 cursor-pointer hover:text-blue-600 transition" onClick={() => onPlayContent(content)}>{content.title}</h4>
                <p className="text-sm text-gray-600 mb-4 cursor-pointer leading-relaxed" onClick={() => onPlayContent(content)}>
                  {content.avatar}와 함께하는 360 공간에 오신 걸 환영합니다! 다양한 독점 콘텐츠와 대화를 만나보세요!
                </p>
                
                <div 
                  className="aspect-video w-full rounded-2xl bg-gray-100 overflow-hidden relative cursor-pointer group shadow-sm border border-gray-200"
                  onClick={() => onPlayContent(content)}
                >
                  <img src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=800&h=450" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="thumbnail"/>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-16 h-16 bg-white/95 backdrop-blur rounded-full text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                       <Play size={28} fill="currentColor" className="ml-1" />
                     </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                     <Sparkles size={12} className="text-blue-300"/> AI 360 Play
                  </div>
                </div>
                
                <div className="flex items-center gap-5 mt-4 text-gray-500 text-sm font-medium">
                  <button className="flex items-center gap-1.5 hover:text-red-500 transition"><Heart size={18}/> {content.views}</button>
                  <button className="flex items-center gap-1.5 hover:text-blue-500 transition"><MessageCircle size={18}/> 42</button>
                  <button className="ml-auto flex items-center gap-1.5 hover:text-gray-900 transition"><Share2 size={18}/> 공유</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 사이드 영역 (우측) */}
        <div className="w-[300px] shrink-0 hidden lg:block">
          <div className="sticky top-8 flex flex-col gap-6">
            <div className="relative">
               <input type="text" placeholder="콘텐츠 검색" className="w-full border border-gray-300 rounded-full pl-5 pr-10 py-2.5 text-sm outline-none focus:border-black font-medium transition shadow-sm" />
               <Search size={18} className="absolute right-4 top-3 text-gray-400" />
            </div>
            
            <div className="border border-gray-200 rounded-3xl p-6 bg-white shadow-sm">
               <h3 className="font-bold text-gray-900 mb-5">인기 콘텐츠</h3>
               <div className="flex flex-col gap-5">
                 {preDeployedContents.slice(0,4).map(content => (
                   <div key={content.id} className="flex gap-3 cursor-pointer group" onClick={() => onPlayContent(content)}>
                     <div className="w-28 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative border border-gray-200/50">
                       <img src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=200&h=120" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="thumb"/>
                     </div>
                     <div className="flex flex-col justify-center flex-1">
                       <div className="text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition leading-snug">{content.title}</div>
                       <div className="text-[10px] text-gray-500 mt-1 font-medium">{content.date}</div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 1. 채널설정 > AI 휴먼 관리
// ==========================================

const ChannelSettingsView = ({ aiHumans, setAiHumans, onGoToPipeline }) => {
  const [view, setView] = useState('list');
  const [currentEditId, setCurrentEditId] = useState(null);
  
  const [statusModal, setStatusModal] = useState({ show: false, human: null, type: 'disable' });
  const [toastMsg, setToastMsg] = useState("");

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case '사용 가능': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
      case '제작 중': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>{status}</span>;
      case '비활성': return <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
      default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
    }
  };

  const handleSaveForm = (formData, mode) => {
    const today = new Date();
    const dateStr = ${today.getFullYear()}.${String(today.getMonth()+1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')};
    
    if (mode === 'create') {
      const newId = Date.now();
      const newAvatar = {
        ...formData,
        id: newId,
        status: '제작 중',
        lastModified: dateStr,
        avatarId: NEW_AVA_${Math.floor(Math.random()*1000)},
        personaId: NEW_PER_${Math.floor(Math.random()*1000)},
        voiceId: formData.voice || 'VOICE_DEFAULT'
      };
      
      setAiHumans(prev => [newAvatar, ...prev]);
      setView('list');
      triggerToast('AI 휴먼 제작 요청이 완료되었습니다.');

      setTimeout(() => {
        setAiHumans(prev => prev.map(h => h.id === newId ? { ...h, status: '사용 가능' } : h));
      }, 5000);

    } else {
      const newHumans = [...aiHumans];
      const index = newHumans.findIndex(h => h.id === currentEditId);
      if(index !== -1) {
        newHumans[index] = { 
          ...newHumans[index], 
          ...formData,
          lastModified: dateStr
        };
      }
      setAiHumans(newHumans);
      setView('list');
      triggerToast('변경사항이 저장되었습니다.');
    }
  };

  const handleDelete = (id) => {
    setAiHumans(prev => prev.filter(h => h.id !== id));
    triggerToast('AI 휴먼이 삭제되었습니다.');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f9fafb] relative flex flex-col custom-scrollbar">
      <div className="bg-white border-b border-gray-200 px-8 pt-6 flex gap-6 text-sm font-bold sticky top-0 z-10 shrink-0">
        <button className="pb-4 text-gray-400 hover:text-gray-700">기본 설정</button>
        <button className="pb-4 text-gray-400 hover:text-gray-700">크리에이터 추천</button>
        <button className="pb-4 border-b-2 border-red-500 text-red-500">AI 휴먼 관리</button>
      </div>
      
      {view === 'list' ? (
        <div className="flex-1 max-w-6xl mx-auto w-full p-8 animate-in fade-in min-h-0">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold mb-1 text-gray-900">내 AI 휴먼 목록</h2>
              <p className="text-gray-500 text-sm">콘텐츠에 사용할 수 있는 AI 휴먼을 등록하고 관리합니다.</p>
            </div>
            <button onClick={() => { setCurrentEditId(null); setView('form'); }} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition">
              <Plus size={16}/> 새 AI 휴먼 만들기
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-xs">
                <tr>
                  <th className="p-4 w-16 text-center">이미지</th>
                  <th className="p-4">이름</th>
                  <th className="p-4">역할</th>
                  <th className="p-4">목소리</th>
                  <th className="p-4">상태</th>
                  <th className="p-4">최근 수정일</th>
                  <th className="p-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aiHumans.map(human => (
                  <tr key={human.id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                       <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden relative bg-gray-100 flex items-center justify-center shrink-0">
                         <img 
                           src={human.img} 
                           className={w-full h-full object-cover ${human.imgType === 'full' ? 'object-center' : 'object-top'}} 
                           alt="AI Human"
                         />
                       </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">{human.name}</td>
                    <td className="p-4 text-gray-600 font-medium">{human.role}</td>
                    <td className="p-4 text-gray-500 text-xs">{human.voice}</td>
                    <td className="p-4"><StatusBadge status={human.status} /></td>
                    <td className="p-4 text-gray-500 text-xs">{human.lastModified}</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      {human.status !== '제작 중' && (
                        <>
                          <button onClick={() => { setCurrentEditId(human.id); setView('form'); }} className="p-1.5 text-gray-400 hover:text-blue-600 transition rounded" title="수정"><Edit3 size={16}/></button>
                          <button onClick={() => setStatusModal({ show: true, human, type: human.status === '비활성' ? 'enable' : 'disable' })} className={p-1.5 transition rounded ${human.status === '비활성' ? 'text-gray-400 hover:text-emerald-600' : 'text-gray-400 hover:text-amber-600'}} title={human.status === '비활성' ? '활성화' : '비활성'}>
                            {human.status === '비활성' ? <CheckCircle size={16}/> : <PowerOff size={16}/>}
                          </button>
                        </>
                      )}
                      {!human.isDefault && (
                        <button onClick={() => handleDelete(human.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition rounded" title="삭제"><Trash2 size={16}/></button>
                      )}
                    </td>
                  </tr>
                ))}
                {aiHumans.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-500 font-medium">
                      등록된 AI 휴먼이 없습니다. 새 AI 휴먼을 제작해 보세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <AiHumanFormView 
          human={currentEditId ? aiHumans.find(h => h.id === currentEditId) : null}
          onCancel={() => setView('list')} 
          onSave={handleSaveForm} 
        />
      )}

      {statusModal.show && statusModal.human && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setStatusModal({show:false, human:null, type: 'disable'})}></div>
           <div className="bg-white border border-gray-200 text-gray-900 p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 duration-200">
             <div className={w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${statusModal.type === 'disable' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}}>
                {statusModal.type === 'disable' ? <PowerOff size={32} /> : <CheckCircle size={32} />}
             </div>
             <h3 className="text-xl font-black mb-2 text-gray-900">
               {statusModal.type === 'disable' ? 'AI 휴먼을 비활성화하시겠습니까?' : 'AI 휴먼을 활성화하시겠습니까?'}
             </h3>
             <p className="text-gray-500 text-sm mb-6 leading-relaxed">
               {statusModal.type === 'disable' 
                 ? '비활성화하면 신규 AI 360 콘텐츠 제작 시 이 휴먼을 선택할 수 없습니다. 기존에 배포된 콘텐츠에는 영향을 주지 않습니다.'
                 : '활성화하면 신규 AI 360 콘텐츠 제작 시 이 휴먼을 다시 선택할 수 있습니다.'}
             </p>
             <div className="flex gap-3">
               <button onClick={() => setStatusModal({show:false, human:null, type: 'disable'})} className="w-full px-5 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition shadow-sm">취소</button>
               <button onClick={() => {
                 const updated = [...aiHumans];
                 const idx = updated.findIndex(h => h.id === statusModal.human.id);
                 updated[idx].status = statusModal.type === 'disable' ? '비활성' : '사용 가능';
                 setAiHumans(updated);
                 setStatusModal({show:false, human:null, type: 'disable'});
                 triggerToast(statusModal.type === 'disable' ? '비활성화되었습니다.' : '활성화되었습니다.');
               }} className={w-full px-5 py-3.5 text-white font-bold text-sm rounded-xl shadow-sm transition ${statusModal.type === 'disable' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}}>
                 {statusModal.type === 'disable' ? '비활성화' : '활성화'}
               </button>
             </div>
           </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5 font-bold text-sm flex items-center gap-2 z-50">
          <CheckCircle size={16} className="text-emerald-400"/> {toastMsg}
        </div>
      )}
    </div>
  );
};

const AiHumanFormView = ({ human, onCancel, onSave }) => {
  const isCreateMode = !human;
  
  const [formData, setFormData] = useState({
    name: human?.name || '',
    shortDescription: human?.shortDescription || '',
    role: human?.role || '아이돌',
    personality: human?.personality || '친절한, 밝은',
    speakLanguage: human?.speakLanguage || '한국어',
    listenLanguage: human?.listenLanguage || '한국어',
    voice: human?.voice || '유리(기본)',
    aiService: human?.aiService || 'ChatGPT',
    
    // 대화 설정
    greeting: human?.greeting || '안녕하세요! 오늘도 와줘서 고마워요.',
    fallbackMsg: human?.fallbackMsg || '미안해요, 다시 한 번 말해줄래요?',
    forbiddenTopics: human?.forbiddenTopics || '정치, 종교, 성인 주제, 비속어, 차별적 표현, 불법 활동, 타인 비하',
    characterDescription: human?.characterDescription || '팬들과 친근하게 소통하는 AI 휴먼입니다. 인사, 응원, 하트 요청, 간단한 리액션에 짧고 밝게 반응합니다.',
    
    status: human?.status || '사용 가능'
  });

  const [previewImg, setPreviewImg] = useState(human?.img || "");
  const [previewImgType, setPreviewImgType] = useState(human?.imgType || "half"); // 'half' | 'full'
  const [photoUploaded, setPhotoUploaded] = useState(!!human?.img);

  const [rightsChecked, setRightsChecked] = useState(!isCreateMode);
  const fileInputRef = useRef(null);

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if(file) {
       const url = URL.createObjectURL(file);
       setPreviewImg(url);
       setPhotoUploaded(true);
    }
  };

  const [resultModal, setResultModal] = useState({ show: false, type: null });

  const handleSaveClick = () => {
    const badWords = ['욕설', '폭력', '바보', '사칭']; 
    const textToValidate = (formData.characterDescription || '') + (formData.personality || '') + (formData.forbiddenTopics || '');
    const hasBadWord = badWords.some(word => textToValidate.includes(word));

    if (hasBadWord) {
      setResultModal({ show: true, type: 'warning' });
    } else {
      setResultModal({ show: true, type: 'save' });
    }
  };

  const handleCancelClick = () => {
    const initialFormDataString = JSON.stringify({
      name: human?.name || '',
      shortDescription: human?.shortDescription || '',
      role: human?.role || '아이돌',
      personality: human?.personality || '친절한, 밝은',
      speakLanguage: human?.speakLanguage || '한국어',
      listenLanguage: human?.listenLanguage || '한국어',
      voice: human?.voice || '유리(기본)',
      aiService: human?.aiService || 'ChatGPT',
      greeting: human?.greeting || '안녕하세요! 오늘도 와줘서 고마워요.',
      fallbackMsg: human?.fallbackMsg || '미안해요, 다시 한 번 말해줄래요?',
      forbiddenTopics: human?.forbiddenTopics || '정치, 종교, 성인 주제, 비속어, 차별적 표현, 불법 활동, 타인 비하',
      characterDescription: human?.characterDescription || '팬들과 친근하게 소통하는 AI 휴먼입니다. 인사, 응원, 하트 요청, 간단한 리액션에 짧고 밝게 반응합니다.',
      status: human?.status || '사용 가능'
    });
    const isDirty = JSON.stringify(formData) !== initialFormDataString || photoUploaded !== !!human?.img || previewImgType !== (human?.imgType || "half");
    
    if (isDirty) {
      setResultModal({ show: true, type: 'cancel_confirm' });
    } else {
      onCancel();
    }
  };

  const confirmSave = () => { 
    setResultModal({ show: false, type: null }); 
    onSave({ ...formData, img: previewImg, imgType: previewImgType }, isCreateMode ? 'create' : 'edit'); 
  };
  
  const isFormValid = formData.name.trim() !== '' && formData.role && formData.personality && formData.speakLanguage && formData.listenLanguage && formData.voice && formData.aiService && photoUploaded && rightsChecked;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-8 animate-in fade-in slide-in-from-right-4 pb-32 min-h-0">
      <div className="mb-6 flex items-start gap-3">
        <button onClick={handleCancelClick} className="text-gray-400 hover:text-gray-800 transition mt-1"><ChevronRight size={24} className="rotate-180"/></button>
        <div>
          <h2 className="text-2xl font-black text-gray-900">{isCreateMode ? '새 AI 휴먼 만들기' : ${human.name} 정보 수정}</h2>
          <p className="text-gray-500 text-sm mt-1.5">
            {isCreateMode ? '사진과 대화 설정을 입력하면 AI 360 콘텐츠에서 사용할 AI 휴먼을 등록할 수 있습니다.' : 'AI 휴먼의 기본 정보와 대화 설정을 수정할 수 있습니다.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-6">
        {/* 좌측: 이미지 업로드 영역 */}
        <div className="w-full md:w-[320px] flex flex-col gap-4">
          <div>
             <h3 className="text-sm font-bold text-gray-900 mb-4 block">AI 휴먼 이미지</h3>
             <label className="text-xs font-bold text-gray-700 mb-2 block">AI 휴먼 표시 방식</label>
             <div className="flex gap-2 w-full mb-3">
               <button 
                 onClick={(e) => { e.preventDefault(); setPreviewImgType('half'); }}
                 className={flex-1 py-2.5 border text-xs font-bold rounded-lg transition ${previewImgType === 'half' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}}
               >
                 상반신
               </button>
               <button 
                 onClick={(e) => { e.preventDefault(); setPreviewImgType('full'); }}
                 className={flex-1 py-2.5 border text-xs font-bold rounded-lg transition ${previewImgType === 'full' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}}
               >
                 전신
               </button>
             </div>
             <div className="mb-4 text-[11px] text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
               {previewImgType === 'half' 
                 ? '팬 화면에서 화상통화처럼 자연스럽게 보입니다. 정면 얼굴과 상반신이 잘 보이는 사진을 권장합니다.' 
                 : '공간 안에 서 있는 형태로 표시됩니다. 머리부터 발끝까지 보이는 전신 사진을 권장합니다.'}
             </div>
          </div>

          <div className="flex flex-col items-center w-full">
            <div 
              className={w-full rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden relative group cursor-pointer ${photoUploaded ? 'border border-gray-200 shadow-md bg-white' : 'border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'}}
              style={{
                aspectRatio: previewImgType === 'full' ? '9/16' : '3/4'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoUploaded ? (
                <>
                  <img 
                    src={previewImg} 
                    className={w-full h-full transition-transform ${previewImgType === 'full' ? 'object-contain object-bottom' : 'object-cover object-top'}} 
                    alt="AI Human"
                  />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={24} className="text-white mb-1"/>
                    <span className="text-white text-xs font-bold">다시 업로드</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 p-4 w-full">
                  <Upload size={32} className="mx-auto mb-2 text-gray-400"/>
                  <div className="text-sm font-bold text-gray-700 mb-1">{previewImgType === 'half' ? '상반신 사진 업로드' : '전신 사진 업로드'}</div>
                  <div className="text-[10px] text-gray-400 mb-2">
                     {previewImgType === 'half' 
                       ? '정면 얼굴과 상반신이 잘 보이는\n사진을 올려주세요.' 
                       : '머리부터 발끝까지 보이는\n전신 사진을 올려주세요.'}
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImg(IMAGE_URL_FULL);
                setPreviewImgType('full');
                setPhotoUploaded(true);
              }}
              className="w-full py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-[11px] font-bold rounded-lg shadow-sm transition"
            >
              샘플 전신 적용
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImg(IMAGE_URL_HALF);
                setPreviewImgType('half');
                setPhotoUploaded(true);
              }}
              className="w-full py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-[11px] font-bold rounded-lg shadow-sm transition"
            >
              샘플 상반신 적용
            </button>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-start gap-2 mt-2">
            <input type="checkbox" checked={rightsChecked} onChange={e=>setRightsChecked(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer shrink-0" />
            <span className="text-[11px] font-bold text-gray-700 leading-relaxed">업로드한 사진이 본인 또는 사용 권한을 가진 이미지임을 확인합니다.</span>
          </div>
        </div>

        {/* 우측: 정보 및 설정 영역 */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900">기본 정보</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">AI 휴먼 이름 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={e=>handleChange('name', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-900 font-bold focus:border-blue-500 outline-none" placeholder="예: 아리아" />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">한 줄 소개</label>
                <input type="text" value={formData.shortDescription} onChange={e=>handleChange('shortDescription', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none" placeholder="예: 팬들과 밝고 친근하게 대화하는 AI 휴먼입니다." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">역할 <span className="text-red-500">*</span></label>
                <select value={formData.role} onChange={e=>handleChange('role', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="아이돌">아이돌</option>
                  <option value="버튜버">버튜버</option>
                  <option value="팬 소통형">팬 소통형</option>
                  <option value="라이브 진행자">라이브 진행자</option>
                  <option value="자유">자유</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">기본 성격 <span className="text-red-500">*</span></label>
                <select value={formData.personality} onChange={e=>handleChange('personality', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="밝고 활발함">밝고 활발함</option>
                  <option value="차분하고 지적임">차분하고 지적임</option>
                  <option value="애교 많고 귀여움">애교 많고 귀여움</option>
                  <option value="시크하고 도도함">시크하고 도도함</option>
                  <option value="시크한">시크한</option>
                  <option value="열정적인">열정적인</option>
                  <option value="차분한">차분한</option>
                  <option value="친절한, 밝은">친절한, 밝은</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">말하기 언어 <span className="text-red-500">*</span></label>
                <select value={formData.speakLanguage} onChange={e=>handleChange('speakLanguage', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="한국어">한국어</option>
                  <option value="영어">영어</option>
                  <option value="일본어">일본어</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">듣기 언어 <span className="text-red-500">*</span></label>
                <select value={formData.listenLanguage} onChange={e=>handleChange('listenLanguage', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="한국어">한국어</option>
                  <option value="영어">영어</option>
                  <option value="일본어">일본어</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">목소리 <span className="text-red-500">*</span></label>
                <select value={formData.voice} onChange={e=>handleChange('voice', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="강일">강일</option>
                  <option value="마이클(기본)">마이클(기본)</option>
                  <option value="유리(기본)">유리(기본)</option>
                  <option value="유리(밝은 목소리)">유리(밝은 목소리)</option>
                  <option value="제니(부드러운 목소리)">제니(부드러운 목소리)</option>
                  <option value="차누(기본)">차누(기본)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">AI 서비스 <span className="text-red-500">*</span></label>
                <select value={formData.aiService} onChange={e=>handleChange('aiService', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:border-blue-500 outline-none cursor-pointer">
                  <option value="ChatGPT">ChatGPT</option>
                  <option value="Gemini">Gemini</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900">대화 설정</h3>
                <p className="text-[11px] text-gray-500 mt-1">AI 휴먼이 팬에게 어떤 말투와 기준으로 반응할지 설정합니다.</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
               <div className="col-span-1 sm:col-span-2">
                 <label className="text-xs font-bold text-gray-700 mb-1.5 block">인사말</label>
                 <input type="text" value={formData.greeting} onChange={e=>handleChange('greeting', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-blue-500" />
               </div>
               <div className="col-span-1 sm:col-span-2">
                 <label className="text-xs font-bold text-gray-700 mb-1.5 block">이해하지 못했을 때 응답</label>
                 <input type="text" value={formData.fallbackMsg} onChange={e=>handleChange('fallbackMsg', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-blue-500" />
               </div>
               <div className="col-span-1 sm:col-span-2">
                 <label className="text-xs font-bold text-gray-700 mb-1.5 block">응답 제한 주제</label>
                 <input type="text" value={formData.forbiddenTopics} onChange={e=>handleChange('forbiddenTopics', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-blue-500" />
               </div>
               <div className="col-span-1 sm:col-span-2">
                 <label className="text-xs font-bold text-gray-700 mb-1.5 block">캐릭터 설명</label>
                 <textarea value={formData.characterDescription} onChange={e=>handleChange('characterDescription', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-blue-500 resize-none h-24" />
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-30 flex justify-end items-center gap-4">
         <button onClick={handleCancelClick} className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm">
           취소
         </button>
         <div className="relative group/submit">
           <button 
             onClick={handleSaveClick} 
             disabled={!isFormValid}
             className={px-8 py-3.5 font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2 ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}}
           >
             {isCreateMode ? <Sparkles size={18}/> : <FileCheck2 size={18}/>} 
             {isCreateMode ? 'AI 휴먼 제작 요청' : '변경사항 저장'}
           </button>
           {!isFormValid && (
             <div className="absolute right-0 bottom-full mb-3 w-72 bg-gray-900 text-white text-[11px] p-3 rounded-lg opacity-0 group-hover/submit:opacity-100 transition-opacity pointer-events-none z-50 text-center font-medium shadow-lg">
               사진, 이름, 역할, 성격, 언어, 목소리, 사용 권한 확인을 모두 완료해 주세요.
             </div>
           )}
         </div>
      </div>

      {resultModal.show && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
           <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setResultModal({show:false, type:null})}></div>
           <div className="bg-white border border-gray-200 text-gray-900 p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 duration-200">
             
             {resultModal.type === 'cancel_confirm' && (
               <>
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertCircle size={32} className="text-red-500" />
                 </div>
                 <h3 className="text-xl font-black mb-2 text-gray-900">작성 중인 내용이 있습니다.</h3>
                 <p className="text-gray-500 text-sm mb-6 leading-relaxed">저장하지 않고 나가면 변경사항이 사라집니다.</p>
                 <div className="flex flex-col gap-3">
                   <button onClick={() => setResultModal({show:false, type:null})} className="w-full px-5 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition shadow-sm">계속 작성</button>
                   <button onClick={onCancel} className="w-full px-5 py-3.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 shadow-sm transition">저장하지 않고 나가기</button>
                 </div>
               </>
             )}

             {resultModal.type === 'warning' && (
               <>
                 <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Info size={32} className="text-amber-500" />
                 </div>
                 <h3 className="text-xl font-black mb-2 text-gray-900">저장할 수 없습니다.</h3>
                 <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                   입력한 내용에 부적절한 표현이나 타인 사칭 가능성이 있는 문구가 포함되어 있습니다. 내용을 수정해 주세요.
                 </p>
                 <button onClick={() => setResultModal({show:false, type:null})} className="w-full px-5 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm transition">확인 및 수정하기</button>
               </>
             )}

             {resultModal.type === 'save' && (
               <>
                 <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle size={32} className="text-emerald-500" />
                 </div>
                 <h3 className="text-xl font-black mb-2 text-gray-900">{isCreateMode ? 'AI 휴먼 제작 요청 완료' : '변경사항 저장 완료'}</h3>
                 <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                   {isCreateMode ? 'AI 휴먼 제작 요청이 정상적으로 접수되었습니다.\n제작 완료 후 AI 360 콘텐츠에서 사용할 수 있습니다.' : 'AI 휴먼 정보가 업데이트되었습니다.'}
                 </p>
                 <button onClick={() => confirmSave()} className="w-full px-5 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm transition">목록으로 이동</button>
               </>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. 콘텐츠 관리 (목록) 
// ==========================================

const ContentManagementList = ({ onOpenPipeline, onOpenApproval, contentStatus }) => {
  const [showUploadModal, setShowUploadModal] = useState(false); 
  const [hoveredRow, setHoveredRow] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showDetailSettings, setShowDetailSettings] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const StatusBadge = ({ status }) => {
    switch(status) {
      case '공개': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
      case '게시 승인 대기': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
      case '비공개': return <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[11px] font-bold">{status}</span>;
      default: return null;
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleShareClick = (e, status) => {
    e.stopPropagation();
    if(status === '공개') triggerToast('공유 링크가 복사되었습니다.');
    else triggerToast('공개된 콘텐츠만 공유할 수 있습니다.');
  };

  const handleSaveShareLink = (e, status) => {
    e.stopPropagation();
    if(status === '공개') triggerToast('공유 링크가 저장되었습니다.');
    else triggerToast('공개된 콘텐츠만 공유 링크를 저장할 수 있습니다.');
  };

  const handleAi360Click = () => {
    setShowUploadModal(false);
    onOpenPipeline();
  };

  return (
    <div className="h-full w-full relative bg-white flex flex-col min-h-0">
      <div className="p-6 border-b border-gray-200 bg-white z-10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={() => setShowUploadModal(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-1.5 transition shadow-sm">
              <Plus size={16}/> 업로드
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">멤버십 설정</button>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50">삭제</button>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input type="text" placeholder="검색" className="pl-9 pr-4 py-2 border border-gray-300 rounded text-sm w-64 outline-none focus:border-gray-500" />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <button className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded flex items-center gap-1 hover:bg-gray-50"><Filter size={16}/> 필터</button>
          </div>
        </div>

        <div className="border border-gray-200 rounded overflow-hidden flex flex-col">
          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[600px]">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300"/></th>
                  <th className="p-3">콘텐츠</th>
                  <th className="p-3 w-28">유형</th>
                  <th className="p-3 w-24">공개 상태</th>
                  <th className="p-3 w-28">게시된 날짜</th>
                  <th className="p-3 w-24 text-right">댓글/조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 시뮬레이션용 신규 초안 */}
                <tr 
                  onMouseEnter={() => setHoveredRow('new')} 
                  onMouseLeave={() => setHoveredRow(null)}
                  className="bg-white hover:bg-gray-50 transition relative group h-16"
                >
                  <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300"/></td>
                  <td className="p-3 font-bold text-gray-900 flex flex-col justify-center h-full relative">
                    {hoveredRow === 'new' ? (
                      <div className="absolute left-0 flex gap-1.5 items-center h-full bg-gray-50 pr-4 animate-in fade-in">
                        <button onClick={onOpenApproval} className="p-1.5 text-gray-500 hover:text-blue-600 rounded transition" title="게시 정보 설정"><Edit3 size={16}/></button>
                        <button onClick={(e)=>handleShareClick(e, contentStatus)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded transition" title="공유"><Share2 size={16}/></button>
                        <div className="relative group/more">
                          <button className="p-1.5 text-gray-500 hover:text-gray-800 rounded transition" title="더보기"><MoreHorizontal size={16}/></button>
                          <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover/more:block z-50 text-sm py-1 font-medium text-gray-700">
                             <div onClick={()=>setShowDetailSettings(true)} className="px-4 py-2 hover:bg-gray-50 cursor-pointer">상세 설정</div>
                             <div onClick={(e)=>handleSaveShareLink(e, contentStatus)} className="px-4 py-2 hover:bg-gray-50 cursor-pointer">공유 링크 저장</div>
                             <div onClick={()=>setShowDeleteModal(true)} className="px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer">삭제</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenApproval}>
                        <div className="w-12 h-8 bg-[url('https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=100&h=60')] bg-cover bg-center rounded border border-gray-200 flex items-center justify-center shadow-sm relative overflow-hidden">
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white"><Sparkles size={12}/></div>
                        </div>
                        내가 만든 팬 공간 (초안)
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-gray-600 font-medium text-xs cursor-pointer" onClick={onOpenApproval}>
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">AI 360 콘텐츠</span>
                  </td>
                  <td className="p-3"><StatusBadge status={contentStatus} /></td>
                  <td className="p-3 text-gray-500 text-xs">{contentStatus === '공개' ? '2026.06.11' : '-'}</td>
                  <td className="p-3 text-right text-gray-500 text-xs font-mono">-</td>
                </tr>

                {/* 10체 기본 배포 콘텐츠 */}
                {preDeployedContents.map((content) => (
                  <tr 
                    key={content.id}
                    onMouseEnter={() => setHoveredRow(content.id)} 
                    onMouseLeave={() => setHoveredRow(null)}
                    className="bg-white hover:bg-gray-50 transition relative group h-16"
                  >
                    <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300"/></td>
                    <td className="p-3 font-bold text-gray-900 flex flex-col justify-center h-full relative">
                      {hoveredRow === content.id ? (
                        <div className="absolute left-0 flex gap-1.5 items-center h-full bg-gray-50 pr-4 animate-in fade-in">
                          <button onClick={()=>triggerToast('콘텐츠 수정 화면으로 이동합니다.')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded transition" title="수정"><Edit3 size={16}/></button>
                          <button onClick={(e)=>handleShareClick(e, '공개')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded transition" title="공유"><Share2 size={16}/></button>
                          <div className="relative group/more">
                            <button className="p-1.5 text-gray-500 hover:text-gray-800 rounded transition" title="더보기"><MoreHorizontal size={16}/></button>
                            <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover/more:block z-50 text-sm py-1 font-medium text-gray-700">
                               <div onClick={(e)=>handleSaveShareLink(e, '공개')} className="px-4 py-2 hover:bg-gray-50 cursor-pointer">공유 링크 저장</div>
                               <div className="px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer">삭제</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 cursor-pointer">
                          <div className="w-12 h-8 bg-[url('https://images.unsplash.com/photo-1522158637959-30385a09e0aa?auto=format&fit=crop&q=80&w=100&h=60')] bg-cover bg-center rounded border border-gray-200 flex items-center justify-center shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white"><Sparkles size={12}/></div>
                          </div>
                          {content.title}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 font-medium text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">{content.type}</span>
                    </td>
                    <td className="p-3"><StatusBadge status={content.status} /></td>
                    <td className="p-3 text-gray-500 text-xs">{content.date}</td>
                    <td className="p-3 text-right text-gray-500 text-xs font-mono">12 / {content.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5 font-bold text-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400"/> {toastMsg}
        </div>
      )}

      {/* 상세 설정 모달 */}
      {showDetailSettings && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDetailSettings(false)}></div>
           <div className="bg-white text-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
               <h3 className="text-lg font-black">상세 설정</h3>
             </div>
             <div className="p-6 space-y-4 text-sm font-bold text-gray-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>콘텐츠 공개</span>
                  <input type="checkbox" defaultChecked={contentStatus === '공개'} className="w-4 h-4 rounded text-blue-600" />
                </label>
                <div className="w-full h-px bg-gray-100"></div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>댓글 사용</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                </label>
             </div>
             <div className="p-4 border-t border-gray-100 flex justify-end">
               <button onClick={() => {setShowDetailSettings(false); triggerToast('상세 설정이 저장되었습니다.');}} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm w-full hover:bg-blue-700">확인</button>
             </div>
           </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
           <div className="bg-white border border-gray-200 text-gray-900 p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 size={32} className="text-red-500" />
             </div>
             <h3 className="text-xl font-black mb-2 text-gray-900">콘텐츠를 삭제하시겠습니까?</h3>
             <p className="text-gray-500 text-sm mb-6">삭제한 콘텐츠는 복구할 수 없습니다.</p>
             <div className="flex gap-3">
               <button onClick={() => setShowDeleteModal(false)} className="w-full px-5 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition">취소</button>
               <button onClick={() => {setShowDeleteModal(false); triggerToast('콘텐츠가 삭제되었습니다.');}} className="w-full px-5 py-3.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 shadow-sm transition">삭제</button>
             </div>
           </div>
        </div>
      )}

      {/* 업로드 유형 선택 모달 */}
      {showUploadModal && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
           <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
           <div className="bg-white text-gray-900 w-full max-w-[600px] rounded-2xl shadow-2xl relative z-30 border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
               <h3 className="text-lg font-bold">업로드 콘텐츠 유형 선택</h3>
               <button onClick={() => setShowUploadModal(false)} className="hover:bg-gray-200 p-1.5 rounded-lg transition"><X size={20} className="text-gray-500" /></button>
             </div>
             <div className="p-6 space-y-3">
                <div 
                  onClick={() => {setShowUploadModal(false); onOpenPipeline();}}
                  className="flex items-center gap-4 p-4 border-2 border-blue-500/40 rounded-xl bg-blue-50/40 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition relative overflow-hidden group shadow-sm"
                >
                   <div className="absolute top-0 right-0 bg-blue-500 text-[10px] font-bold px-2.5 py-0.5 text-white rounded-bl-lg shadow-sm">AI 360 신규</div>
                   <div className="w-14 h-14 flex flex-col items-center justify-center border border-blue-200 rounded-lg bg-white text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                     <Sparkles size={20} />
                   </div>
                   <div>
                     <h4 className="text-base font-black mb-0.5 text-blue-800">AI 360 팬 공간 만들기</h4>
                     <p className="text-xs text-gray-600">360 공간을 선택하고, 채널에 등록된 AI 휴먼을 불러와 팬과 대화하는 360 공간을 배포합니다.</p>
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-400 cursor-pointer transition bg-white group">
                   <div className="w-14 h-14 flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition">
                     <MonitorPlay size={24} className="text-gray-500" />
                   </div>
                   <div>
                     <h4 className="text-base font-bold mb-0.5 text-gray-900">LiteVR 업로드</h4>
                     <p className="text-xs text-gray-500">일반 영상을 VR 180°로 변환해 공유하세요.</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-400 cursor-pointer transition bg-white group">
                   <div className="w-14 h-14 flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition">
                     <Video size={24} className="text-gray-500" />
                   </div>
                   <div>
                     <h4 className="text-base font-bold mb-0.5 text-gray-900">VR 영상 업로드</h4>
                     <p className="text-xs text-gray-500">180°, 360° 영상을 생생하게 공유하세요.</p>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. AI 360 제작 스튜디오
// ==========================================
const Ai360PipelineView = ({ onSubmit, aiHumans, onGoToChannelSettings }) => {
  const [step, setStep] = useState(1);
  const [toastMsg, setToastMsg] = useState("");
  const triggerToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

  const [selectedTemplate, setSelectedTemplate] = useState("팬 미팅 룸");
  const templates = [
    {name: "도시의 거리", cat: "일상·사적", img: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&q=80&w=600&h=300"},
    {name: "동화같은 숲", cat: "취미·테마", img: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600&h=300"},
    {name: "마녀 키키 베이커리", cat: "취미·테마", img: "https://images.unsplash.com/photo-1555529733-0e670560f7e1?auto=format&fit=crop&q=80&w=600&h=300"},
    {name: "마트 주차장", cat: "일상·사적", img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=600&h=300"},
    {name: "모던 갤러리", cat: "작업·활동", img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&q=80&w=600&h=300"},
    {name: "팬 미팅 룸", cat: "팬 참여형", img: "https://images.unsplash.com/photo-1522158637959-30385a09e0aa?auto=format&fit=crop&q=80&w=600&h=300"},
  ];
  const currentBgImage = selectedTemplate ? templates.find(t => t.name === selectedTemplate)?.img : templates[5].img;

  // Step 2: 공간 다듬기 상태
  const [tuningPrompt, setTuningPrompt] = useState("");
  const [tuningStatus, setTuningStatus] = useState("idle"); // 'idle', 'loading', 'success', 'fail'
  const [panPercent, setPanPercent] = useState(50);
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [viewMode, setViewMode] = useState('refined'); // 'original' or 'refined'
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Step 3 & 4 상태
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [framePos, setFramePos] = useState({ x: 50, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const frameRef = useRef(null);

  const handleDrag = (e) => {
    if (!isDragging || !frameRef.current) return;
    const parentRect = frameRef.current.parentElement.getBoundingClientRect();
    let newX = ((e.clientX - parentRect.left) / parentRect.width) * 100;
    let newY = ((e.clientY - parentRect.top) / parentRect.height) * 100;
    newX = Math.max(15, Math.min(85, newX));
    newY = Math.max(30, Math.min(85, newY));
    setFramePos({ x: newX, y: newY });
  };

  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [showBgmModal, setShowBgmModal] = useState(false);
  const [selectedBgm, setSelectedBgm] = useState(BGM_LIST[0]);
  
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(REACTION_SETS[0]);
  const [reactionFilter, setReactionFilter] = useState("전체");

  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [autoCheckStatus, setAutoCheckStatus] = useState('idle'); // 'idle', 'checking', 'success', 'fail'

  // Step 5: 최종 미리보기 상태
  const [showChatPreview, setShowChatPreview] = useState(false); // 채팅 패널 토글
  const [messagesStep5, setMessagesStep5] = useState([
    { sender: 'user123', text: '360 공간 분위기 너무 좋다!!' }
  ]);
  const [inputStep5, setInputStep5] = useState('');
  const [aiResponseStep5, setAiResponseStep5] = useState('별빛들! 저와 대화를 나눠보세요.');
  const [isAnimatingStep5, setIsAnimatingStep5] = useState(false);

  const handleSendStep5 = (e) => {
    e.preventDefault();
    if(!inputStep5.trim()) return;

    setMessagesStep5(prev => [...prev, { sender: '운영자', text: inputStep5 }]);
    setIsAnimatingStep5(true);

    setTimeout(() => {
      if(inputStep5.includes('하트해줘') || inputStep5.includes('하트')) {
        setAiResponseStep5('하트 받아주세요! 🫶');
      } else if (inputStep5.includes('안녕')) {
        setAiResponseStep5('안녕하세요! 오늘도 와줘서 고마워요. ✨');
      } else if (inputStep5.includes('춤춰줘') || inputStep5.includes('춤')) {
        setAiResponseStep5('좋아요, 짧게 춰볼게요! 💃');
      } else {
        setAiResponseStep5("${inputStep5}" 라고 하셨군요! 확인했어요.);
      }
      setTimeout(() => setIsAnimatingStep5(false), 3500);
    }, 600);
    setInputStep5('');
  }

  const handleEditSubmit = () => {
    if(!tuningPrompt.trim()) return;
    setTuningStatus('loading');
    setTimeout(() => { 
      if(tuningPrompt.includes('실패')) {
        setTuningStatus('fail');
      } else {
        setTuningStatus('success'); 
        setViewMode('refined');
      }
    }, 2000);
  };

  const handleNextToStep3 = () => {
    if (tuningPrompt.trim() !== '' && tuningStatus !== 'success') {
      setShowUnsavedWarning(true);
    } else {
      setStep(3);
    }
  };

  const handleNextToStep5 = () => {
    setAutoCheckStatus('checking');
    setTimeout(() => {
      setAutoCheckStatus('success');
      setTimeout(() => {
        setStep(5);
        setAutoCheckStatus('idle');
      }, 800);
    }, 1500);
  };

  const renderStep1 = () => (
    <div className="flex-1 overflow-y-auto p-10 bg-white animate-in fade-in flex flex-col h-full relative z-10 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-2"><Layout className="text-blue-600"/> 공간 선택</h2>
            <p className="text-gray-500 text-sm">AI 휴먼이 활동할 360 공간을 선택하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <span className="bg-gray-900 text-white px-3 py-1.5 rounded-full cursor-pointer shadow-sm">전체</span>
            <span className="text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-full cursor-pointer border border-transparent hover:border-gray-200 transition">작업·활동</span>
            <span className="text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-full cursor-pointer border border-transparent hover:border-gray-200 transition">일상·사적</span>
            <span className="text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-full cursor-pointer border border-transparent hover:border-gray-200 transition">취미·테마</span>
            <span className="text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-full cursor-pointer border border-transparent hover:border-gray-200 transition">팬 참여형</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {templates.map((tpl, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedTemplate(tpl.name)}
              className={cursor-pointer rounded-xl overflow-hidden border-2 bg-white transition-all group ${
                selectedTemplate === tpl.name 
                  ? 'border-blue-600 shadow-md ring-4 ring-blue-50' 
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }}
            >
              <div className="h-40 w-full relative overflow-hidden bg-gray-100 flex items-center justify-center">
                <img 
                  src={tpl.img} 
                  alt={tpl.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600&h=300"; }}
                />
                {selectedTemplate === tpl.name && (
                  <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                    <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg animate-in zoom-in-50"><Check size={20} strokeWidth={3}/></div>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className={text-sm font-bold ${selectedTemplate === tpl.name ? 'text-blue-800' : 'text-gray-900'}}>
                  {tpl.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">{tpl.cat}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-auto pt-8 flex justify-center pb-8 border-t border-gray-100 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative z-20">
        <button 
          onClick={() => setStep(2)}
          disabled={!selectedTemplate}
          className={px-12 py-4 rounded-xl font-bold text-base transition shadow-md flex items-center gap-2 ${
            selectedTemplate ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }}
        >
          이 공간으로 시작 <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black animate-in fade-in z-10 custom-scrollbar">
        
        {/* 미저장 경고 모달 (Step 2) */}
        {showUnsavedWarning && (
          <div className="fixed inset-0 flex items-center justify-center z-[70]">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowUnsavedWarning(false)}></div>
             <div className="bg-white border border-gray-200 text-gray-900 p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 duration-200">
               <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} className="text-amber-500" />
               </div>
               <h3 className="text-lg font-black mb-2 text-gray-900">입력한 공간 다듬기 요청이 적용되지 않았습니다.</h3>
               <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                 공간을 다듬지 않고 다음 단계로 이동하시겠습니까?
               </p>
               <div className="flex gap-3">
                 <button onClick={() => { setShowUnsavedWarning(false); setStep(3); }} className="w-full px-5 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition shadow-sm">계속 이동</button>
                 <button onClick={() => { setShowUnsavedWarning(false); handleEditSubmit(); }} className="w-full px-5 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition transform hover:-translate-y-0.5">다듬기 적용하기</button>
               </div>
             </div>
          </div>
        )}

        {/* 360 Viewer (Simulated Panning) */}
        <div 
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing min-h-0"
          onMouseDown={() => setIsDraggingBg(true)}
          onMouseUp={() => setIsDraggingBg(false)}
          onMouseLeave={() => setIsDraggingBg(false)}
          onMouseMove={(e) => {
            if(!isDraggingBg) return;
            setPanPercent(prev => Math.max(0, Math.min(100, prev - e.movementX * 0.15)));
          }}
        >
          {/* Container is wider than screen to allow panning */}
          <div 
            className="h-full absolute top-0 left-0 transition-transform duration-75 ease-out"
            style={{ width: '150%', transform: translateX(-${(panPercent / 100) * 33.33}%) }} 
          >
            <img 
              src={currentBgImage} 
              className={w-full h-full object-cover select-none pointer-events-none transition-all duration-700 ${tuningStatus === 'success' && viewMode === 'refined' ? 'sepia-[.2] hue-rotate-15 saturate-150 contrast-125' : ''}}
              alt="360 background viewer"
              draggable={false}
            />
          </div>

          {/* Loading Overlay */}
          {tuningStatus === 'loading' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-in fade-in">
               <div className="w-16 h-16 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
               <div className="bg-black/80 px-6 py-3 rounded-full text-white text-sm font-bold shadow-2xl tracking-wide">공간을 다듬고 있습니다...</div>
            </div>
          )}
        </div>

        {/* Bottom Control Panel (Unified layout for inputs & global nav) */}
        <div className="bg-white shrink-0 z-40 relative rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.15)] flex flex-col">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2"></div>
          
          <div className="p-6 md:p-8 pb-4 max-w-5xl mx-auto w-full mt-2">
            {tuningStatus === 'idle' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Wand2 size={20} className="text-blue-600"/> 공간 다듬기</h3>
                   <p className="text-xs text-gray-500 mt-1 font-medium">선택한 공간의 분위기나 색감을 원하는 방향으로 조정할 수 있습니다.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#f8f9fa] border border-gray-200 rounded-2xl p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-50 transition-all shadow-inner">
                   <textarea 
                     rows={2}
                     value={tuningPrompt}
                     onChange={e=>setTuningPrompt(e.target.value)}
                     placeholder="예: 조명을 따뜻하게 바꾸고, 네온사인 분위기를 추가해줘."
                     className="flex-1 w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 font-medium resize-none px-2 py-1 custom-scrollbar"
                     onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey && tuningPrompt.trim()) { e.preventDefault(); handleEditSubmit(); } }}
                   />
                   <button onClick={handleEditSubmit} disabled={!tuningPrompt.trim()} className="px-6 py-3.5 h-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:bg-gray-300 disabled:text-gray-500 transition shadow-sm whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 w-full sm:w-auto"><Sparkles size={16}/> 다듬기 적용</button>
                 </div>
              </div>
            )}

            {tuningStatus === 'loading' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Wand2 size={20} className="text-blue-600"/> 공간 다듬기</h3>
                   <p className="text-xs text-gray-500 mt-1 font-medium">선택한 공간의 분위기나 색감을 원하는 방향으로 조정할 수 있습니다.</p>
                 </div>
                 <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-blue-800">공간을 다듬고 있습니다...</span>
                 </div>
              </div>
            )}

            {tuningStatus === 'success' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Wand2 size={20} className="text-blue-600"/> 공간 다듬기</h3>
                   <p className="text-xs text-gray-500 mt-1 font-medium">선택한 공간의 분위기나 색감을 원하는 방향으로 조정할 수 있습니다.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} className="text-emerald-500"/>
                      <span className="text-sm font-bold text-emerald-800">공간 다듬기 결과가 적용되었습니다.</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={()=>setViewMode('original')} className={px-4 py-2.5 rounded-xl text-xs font-bold transition border ${viewMode === 'original' ? 'bg-white text-gray-900 border-gray-300 shadow-sm' : 'bg-transparent text-gray-500 border-transparent hover:bg-emerald-100'}}>원본 보기</button>
                      <button onClick={()=>setViewMode('refined')} className={px-4 py-2.5 rounded-xl text-xs font-bold transition border ${viewMode === 'refined' ? 'bg-white text-emerald-700 border-emerald-200 shadow-sm' : 'bg-transparent text-gray-500 border-transparent hover:bg-emerald-100'}}>결과 보기</button>
                      <div className="w-px h-6 bg-emerald-200 mx-1 self-center"></div>
                      <button onClick={()=>{setTuningStatus('idle'); setTuningPrompt(''); setViewMode('original');}} className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 transition shadow-sm flex items-center gap-1.5"><RotateCcw size={14}/> 다시 다듬기</button>
                    </div>
                 </div>
              </div>
            )}

            {tuningStatus === 'fail' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Wand2 size={20} className="text-blue-600"/> 공간 다듬기</h3>
                   <p className="text-xs text-gray-500 mt-1 font-medium">선택한 공간의 분위기나 색감을 원하는 방향으로 조정할 수 있습니다.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50 border border-red-100 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="text-red-500"/>
                      <span className="text-sm font-bold text-red-800">공간 다듬기에 실패했습니다. 원본 공간은 유지됩니다.</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={handleEditSubmit} className="px-5 py-2.5 bg-white border border-red-200 text-red-700 font-bold rounded-xl text-xs hover:bg-red-100 transition shadow-sm flex items-center gap-1.5"><RotateCcw size={14}/> 다시 시도</button>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* 하단 고정 액션바 */}
          <div className="border-t border-gray-100 px-10 py-5 flex justify-between items-center w-full bg-white relative z-10">
             <button onClick={() => setStep(1)} className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-1.5"><ChevronRight size={16} className="rotate-180"/> 이전</button>
             <button 
               onClick={handleNextToStep3}
               className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2 animate-in slide-in-from-right-2"
             >
               다음: AI 휴먼 선택 <ChevronRight size={18}/>
             </button>
          </div>

        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const availableAvatars = aiHumans.filter(h => h.status !== '비활성');
    const hasSelectable = availableAvatars.some(h => h.status === '사용 가능');

    if (availableAvatars.length === 0 || !hasSelectable) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-gray-50 text-center animate-in fade-in custom-scrollbar min-h-0">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 shadow-sm border border-amber-200">
                  <AlertCircle size={40} className="text-amber-500"/>
                </div>
                <h3 className="text-xl font-black mb-3 text-gray-900">사용 가능한 AI 휴먼이 없습니다.</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  채널설정의 AI 휴먼 관리에서 AI 휴먼을 등록하거나 활성화한 뒤 다시 선택해 주세요.
                </p>
                <button onClick={onGoToChannelSettings} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition transform hover:-translate-y-0.5">
                  AI 휴먼 관리로 이동
                </button>
            </div>
        );
    }

    return (
      <div className="flex-1 overflow-y-auto p-10 bg-white animate-in fade-in flex flex-col relative pb-32 custom-scrollbar min-h-0">
        <div className="max-w-6xl mx-auto w-full">
          <div className="mb-6 border-b border-gray-100 pb-4 flex justify-between items-end">
             <div>
               <h2 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-2"><UserPlus className="text-blue-600"/> AI 휴먼 선택</h2>
               <p className="text-gray-500 text-sm">이 360 공간에 등장할 AI 휴먼을 선택하세요. 표시 방식과 기본 대화 설정은 AI 휴먼 관리에 저장된 값을 사용합니다.</p>
             </div>
             <div className="text-sm font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                사용 가능한 AI 휴먼 <span className="text-blue-600">{aiHumans.filter(h => h.status === '사용 가능').length}개</span>
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {availableAvatars.map(avatar => {
                const isAvailable = avatar.status === '사용 가능';
                const isCreating = avatar.status === '제작 중';
                const isError = avatar.status === '수정 필요' || avatar.status === '오류';
                const isSelected = selectedAvatar?.id === avatar.id;
                
                const fallbackImgUrl = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=400&h=400";

                return (
                    <div 
                        key={avatar.id} 
                        className={group border-2 rounded-2xl p-4 flex flex-col relative overflow-hidden transition select-none h-[380px]
                            ${isAvailable ? 'cursor-pointer hover:border-blue-400 bg-white shadow-sm' : 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200'} 
                            ${isSelected ? 'border-blue-600 bg-blue-50/20 shadow-md ring-4 ring-blue-50' : ''}}
                        onClick={() => isAvailable && setSelectedAvatar(avatar)}
                    >
                        <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100 mb-4 border border-gray-200 relative flex items-center justify-center shrink-0">
                           <img 
                             src={avatar.img || fallbackImgUrl} 
                             onError={(e) => { e.target.onerror = null; e.target.src = fallbackImgUrl; }}
                             className={w-full h-full object-cover ${avatar.imgType === 'full' ? 'object-center' : 'object-top'} } 
                             alt={avatar.name}
                           />
                           
                           {isSelected && (
                             <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg animate-in zoom-in-50">
                               <Check size={16} strokeWidth={3}/>
                             </div>
                           )}
                           
                           {!isAvailable && (
                             <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center text-white text-xs font-bold px-3 text-center backdrop-blur-[1px]">
                               {isCreating ? 'AI 휴먼 제작 중입니다' : isError ? '채널설정에서 확인 필요' : '선택 불가'}
                             </div>
                           )}
                        </div>
                        
                        <div className="flex flex-col flex-1 text-left">
                           <div className="font-black text-gray-900 text-base mb-0.5 truncate">{avatar.name}</div>
                           <div className="text-[11px] text-gray-500 font-bold mb-3 truncate">{avatar.personaName || X:IN ${avatar.name}}</div>
                           
                           <div className="space-y-1.5 flex-1">
                              <div className="text-[10px] text-gray-700 font-medium truncate">
                                 <span className="text-gray-400 mr-1">유형:</span> {avatar.role || '아이돌'} · {avatar.personality}
                              </div>
                              <div className="text-[10px] text-gray-700 font-medium truncate">
                                 <span className="text-gray-400 mr-1">표시:</span> {avatar.imgType === 'full' ? '전신 뷰' : '상반신 뷰'}
                              </div>
                              <div className="text-[10px] text-gray-700 font-medium truncate">
                                 <span className="text-gray-400 mr-1">언어:</span> {avatar.speakLanguage || '한국어'} / {avatar.listenLanguage || '한국어'}
                              </div>
                              <div className="text-[10px] text-gray-700 font-medium truncate">
                                 <span className="text-gray-400 mr-1">음성:</span> {avatar.voice}
                              </div>
                           </div>
                           
                           <div className="mt-auto border-t border-gray-100 pt-2.5">
                              {isAvailable ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 사용 가능
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {avatar.status}
                                </span>
                              )}
                           </div>
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-30 flex justify-between items-center px-10">
           <button onClick={() => setStep(2)} className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-1.5"><ChevronRight size={16} className="rotate-180"/> 이전</button>
           <button 
             onClick={() => setStep(4)}
             disabled={!selectedAvatar}
             className={px-8 py-3.5 font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2 ${selectedAvatar ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}}
           >
             다음: 360 공간 설정 <ChevronRight size={18}/>
           </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const isFull = selectedAvatar?.imgType === 'full';
    const avatarWidth = isFull ? '260px' : '500px';
    const avatarHeight = isFull ? '480px' : '380px';

    return (
      <div className="flex-1 overflow-y-auto p-10 bg-white animate-in fade-in flex flex-col relative pb-32 custom-scrollbar min-h-0">
        <div className="max-w-4xl mx-auto w-full">
          <div className="mb-8 border-b border-gray-100 pb-4">
             <h2 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-2"><Settings className="text-gray-700"/> 360 공간 설정</h2>
             <p className="text-gray-500 text-sm">AI 휴먼이 360 공간에서 어떻게 보이고 반응할지 설정하세요.</p>
          </div>
          
          <div className="space-y-8">
            
            {/* 1. AI 휴먼 배치 */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6">
              <h3 className="font-bold text-gray-900 mb-2 text-base flex items-center gap-2"><Crosshair size={18} className="text-blue-500"/> AI 휴먼 위치</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">팬 화면에서 AI 휴먼이 보일 위치를 조정하세요.</p>
              
              <div className="h-[450px] relative bg-black rounded-xl overflow-hidden shadow-inner border border-gray-200 flex items-center justify-center" ref={frameRef} onMouseMove={handleDrag} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
                <img src={currentBgImage} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="bg"/>
                <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-white text-[11px] font-bold border border-white/10 z-20 pointer-events-none">
                   AI 휴먼을 드래그해 위치를 조정하세요.
                </div>

                <div 
                  className={absolute border-2 border-dashed ${isDragging ? 'border-blue-400 shadow-2xl scale-105' : 'border-white/80 shadow-lg'} rounded-[20px] overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'} transition-all duration-200}
                  style={{ 
                    width: avatarWidth,
                    height: avatarHeight,
                    left: ${framePos.x}%, 
                    top: ${framePos.y}%, 
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseDown={() => setIsDragging(true)}
                >
                  <img 
                    src={selectedAvatar?.img || IMAGE_URL_HALF} 
                    alt="AI Human" 
                    className={w-full h-full pointer-events-none opacity-95 object-contain object-bottom}
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/80 cursor-se-resize m-2"></div>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/80 cursor-nw-resize m-2"></div>
                </div>
              </div>
            </div>

            {/* 2. 팬 반응 세트 */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6">
              <h3 className="font-bold text-gray-900 mb-2 text-base flex items-center gap-2"><MessageCircleHeart size={18} className="text-rose-500"/> 팬 반응 세트</h3>
              <p className="text-xs text-gray-500 mb-5">AI 휴먼이 팬 입장과 댓글에 어떻게 반응할지 정합니다.</p>
              
              <div className="bg-white border border-rose-100 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ring-1 ring-rose-50">
                 <div>
                   <div className="flex items-center gap-2 mb-1.5">
                     <span className="font-black text-gray-900 text-base">{selectedReaction.name}</span>
                     {selectedReaction.isRecommended && (
                       <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100">자동 추천</span>
                     )}
                   </div>
                   <p className="text-xs text-gray-600 font-medium leading-relaxed">{selectedReaction.description}</p>
                 </div>
                 <div className="flex gap-2 shrink-0">
                   <button onClick={() => setShowScenarioModal(true)} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-gray-700 transition shadow-sm">요약 보기</button>
                   <button onClick={() => setShowReactionModal(true)} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-gray-700 transition shadow-sm">다른 반응 세트 선택</button>
                 </div>
              </div>

              {/* 3. 안전 필터 안내 */}
              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <ShieldCheck size={14} className="text-gray-400 shrink-0"/> 팬 댓글과 닉네임은 자동으로 필터링되며, 부적절한 내용에는 AI 휴먼이 응답하지 않습니다.
              </div>
            </div>

            {/* 4. BGM */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-2"><Music size={18} className="text-fuchsia-500"/> BGM</h3>
              <p className="text-xs text-gray-500 mb-5">360 공간 분위기와 AI 휴먼 성격을 기준으로 자동 추천합니다.</p>
              
              <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {bgmPlaying ? <Music size={16} className="text-fuchsia-500 animate-pulse"/> : <Music size={16} className="text-gray-400"/>}
                    <span className="text-sm font-bold text-gray-900">{selectedBgm.name}</span>
                    {bgmPlaying && <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-100 px-2 py-0.5 rounded-full">재생 중</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">360 공간 분위기에 맞춰 자동 추천되었습니다.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBgmPlaying(!bgmPlaying)} className={text-xs border px-4 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${bgmPlaying ? 'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-700' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}}>
                    {bgmPlaying ? <PauseCircle size={14}/> : <Play size={14}/>} {bgmPlaying ? '정지' : '미리듣기'}
                  </button>
                  <button onClick={() => setShowBgmModal(true)} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-gray-700 transition shadow-sm">다른 BGM 선택</button>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* 하단 고정 영역 */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <button onClick={() => setStep(3)} className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-1.5"><ChevronRight size={16} className="rotate-180"/> 이전</button>
             
             <div className="flex items-center gap-4">
               {autoCheckStatus === 'checking' && (
                 <span className="text-sm font-bold text-blue-600 flex items-center gap-2 animate-pulse">
                   <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   자동 연결 확인 중...
                 </span>
               )}
               {autoCheckStatus === 'success' && (
                 <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                   <CheckCircle size={16}/> 자동 확인 완료
                 </span>
               )}
               {autoCheckStatus === 'fail' && (
                 <span className="text-sm font-bold text-red-500 flex items-center gap-1.5 animate-in fade-in">
                   <AlertCircle size={16}/> 연결 실패. 다시 시도해 주세요.
                 </span>
               )}

               <button 
                 onClick={handleNextToStep5}
                 disabled={autoCheckStatus === 'checking' || !selectedAvatar || !selectedReaction || !selectedBgm}
                 className={px-8 py-3.5 font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2 ${autoCheckStatus === 'checking' || !selectedAvatar || !selectedReaction || !selectedBgm ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 hover:bg-black text-white transform hover:-translate-y-0.5'} whitespace-nowrap}
               >
                 다음: 최종 미리보기 <ChevronRight size={18}/>
               </button>
             </div>
          </div>
        </div>

        {/* 요약 보기 모달 (읽기 전용) */}
        {showScenarioModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[60]">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowScenarioModal(false)}></div>
             <div className="bg-white border border-gray-200 text-gray-900 w-full max-w-md rounded-3xl relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                 <div>
                   <h3 className="text-lg font-black mb-1">{selectedReaction.name}</h3>
                   <p className="text-xs text-gray-500 font-medium">팬 댓글에 따라 AI 휴먼이 기본 리액션을 수행합니다.</p>
                 </div>
               </div>
               <div className="p-6 flex-1 overflow-y-auto max-h-[50vh] space-y-4 custom-scrollbar">
                  <div className="font-bold text-sm text-gray-900">대표 반응 예시</div>
                  {selectedReaction.examples.map((ex, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-400 mr-2">팬 댓글</span> {ex.userInput}</div>
                      <div className="text-xs text-rose-600 font-bold"><span className="font-bold text-rose-300 mr-2">AI 반응</span> {ex.aiAction}</div>
                    </div>
                  ))}
               </div>
               <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                 <button onClick={() => setShowScenarioModal(false)} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-sm text-sm">닫기</button>
               </div>
             </div>
          </div>
        )}

        {/* 다른 반응 세트 선택 모달 */}
        {showReactionModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[60]">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowReactionModal(false)}></div>
             <div className="bg-[#f9fafb] border border-gray-200 text-gray-900 w-full max-w-2xl rounded-3xl relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh]">
               <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                 <div>
                   <h3 className="text-xl font-black mb-1.5">반응 세트 선택</h3>
                   <p className="text-xs text-gray-500 font-medium">AI 휴먼이 팬 댓글에 반응하는 방식을 선택하세요.</p>
                 </div>
                 <button onClick={() => setShowReactionModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={20} className="text-gray-500"/></button>
               </div>
               
               <div className="px-6 pt-4 bg-white shrink-0 border-b border-gray-100">
                 <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
                   {["전체", "자유 대화형", "참여 선택형", "일상 공유형", "이벤트·시즌형", "미니게임형"].map(cat => (
                     <button 
                       key={cat}
                       onClick={() => setReactionFilter(cat)}
                       className={px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${reactionFilter === cat ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                 {REACTION_SETS.filter(r => reactionFilter === "전체" || r.category === reactionFilter).map((scenario) => (
                   <div 
                     key={scenario.id} 
                     onClick={() => setSelectedReaction(scenario)}
                     className={p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${selectedReaction.id === scenario.id ? 'border-rose-500 bg-white shadow-md ring-4 ring-rose-50' : 'border-gray-200 hover:border-rose-300 bg-white shadow-sm'}}
                   >
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1.5">
                         <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{scenario.category}</span>
                         <span className={font-black text-base ${selectedReaction.id === scenario.id ? 'text-rose-600' : 'text-gray-900'}}>{scenario.name}</span>
                       </div>
                       <p className="text-xs text-gray-500 font-medium mb-3">{scenario.description}</p>
                       <div className="flex gap-1.5 flex-wrap">
                         {scenario.tags.map(tag => (
                           <span key={tag} className="text-[10px] font-bold text-gray-400 border border-gray-200 px-2 py-0.5 rounded-md bg-gray-50">#{tag}</span>
                         ))}
                       </div>
                     </div>
                     <div className="shrink-0 flex sm:flex-col items-center justify-end sm:justify-center gap-3">
                       {selectedReaction.id === scenario.id ? (
                         <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-full"><CheckCircle size={16}/> 선택됨</div>
                       ) : (
                         <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                       )}
                     </div>
                   </div>
                 ))}
                 {REACTION_SETS.filter(r => reactionFilter === "전체" || r.category === reactionFilter).length === 0 && (
                   <div className="text-center py-10 text-gray-400 text-sm font-bold">해당 카테고리의 반응 세트가 없습니다.</div>
                 )}
               </div>

               <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                 <button onClick={() => setShowReactionModal(false)} className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 text-sm shadow-sm">취소</button>
                 <button onClick={() => {setShowReactionModal(false); triggerToast("팬 반응 세트가 변경되었습니다.");}} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-md text-sm">선택 완료</button>
               </div>
             </div>
          </div>
        )}

        {/* BGM 선택 모달 */}
        {showBgmModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[60]">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBgmModal(false)}></div>
             <div className="bg-white border border-gray-200 text-gray-900 w-full max-w-md rounded-3xl relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                 <div>
                   <h3 className="text-lg font-black mb-1">BGM 선택</h3>
                   <p className="text-xs text-gray-500 font-medium">360 공간 분위기에 어울리는 배경음악을 선택하세요.</p>
                 </div>
                 <button onClick={() => setShowBgmModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition"><X size={20} className="text-gray-500"/></button>
               </div>
               <div className="p-5 flex-1 overflow-y-auto max-h-[50vh] space-y-3 custom-scrollbar">
                 {BGM_LIST.map((bgm) => (
                   <div 
                     key={bgm.id} 
                     onClick={() => setSelectedBgm(bgm)}
                     className={flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${selectedBgm.id === bgm.id ? 'border-fuchsia-500 bg-fuchsia-50/30 shadow-sm' : 'border-gray-100 hover:border-fuchsia-300 bg-white'}}
                   >
                     <div className="flex flex-col gap-1 w-full pr-4">
                       <span className={font-bold text-sm ${selectedBgm.id === bgm.id ? 'text-fuchsia-700' : 'text-gray-900'}}>{bgm.name}</span>
                       <span className="text-[10px] text-gray-500">{bgm.tag}</span>
                     </div>
                     <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0 bg-gray-50" onClick={(e)=>{e.stopPropagation();}}><Play size={14}/></button>
                   </div>
                 ))}
               </div>
               <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                 <button onClick={() => setShowBgmModal(false)} className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 text-sm shadow-sm">취소</button>
                 <button onClick={() => {setShowBgmModal(false); triggerToast("BGM이 변경되었습니다.");}} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-md text-sm">선택 완료</button>
               </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  // Step 5: 최종 미리보기
  const renderStep5 = () => {
    const isFull = selectedAvatar?.imgType === 'full';
    const avatarWidth = isFull ? '320px' : '550px';
    const avatarHeight = isFull ? '550px' : '420px';
    
    return (
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden animate-in fade-in relative custom-scrollbar min-h-0">
        <div className="flex-1 overflow-y-auto pb-24 relative min-h-0">
          <div className="max-w-6xl mx-auto w-full p-6 lg:p-10 flex flex-col gap-4">
             <div className="text-center mb-2">
               <h2 className="text-2xl font-black text-gray-900 mb-1">최종 미리보기</h2>
               <p className="text-gray-500 text-sm">생성된 360 공간과 AI 휴먼이 팬 화면에서 어떻게 보일지 확인하세요.</p>
             </div>
             
             {/* 플레이어 뷰어 (전체 너비로 확장) */}
             <div className="h-[600px] w-full bg-black rounded-3xl overflow-hidden shadow-2xl flex border border-gray-200 relative">
                <div className="flex-1 relative overflow-hidden">
                   {/* 배경 및 그라데이션 */}
                   <img src={currentBgImage} alt="360 background" className="absolute w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0"></div>
                   
                   {/* 상단 컨트롤 UI (BGM & 채팅 미리보기 버튼) */}
                   <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                     <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-white text-[11px] font-bold border border-white/10">
                       <Music size={14} className="text-fuchsia-400 animate-pulse"/> {selectedBgm.name}
                     </div>
                     <button 
                       onClick={() => setShowChatPreview(!showChatPreview)}
                       className={px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-bold border transition ${showChatPreview ? 'bg-blue-600 text-white border-blue-500' : 'bg-black/50 backdrop-blur text-white border-white/10 hover:bg-black/70'}}
                     >
                       <MessageSquare size={14}/> 채팅 미리보기
                     </button>
                   </div>

                   {/* 중앙 아바타 & 말풍선 */}
                   <div className="absolute inset-0 flex flex-col items-center justify-end z-10 pb-28 pointer-events-none">
                      <div className={mb-6 px-6 py-3 bg-white/95 backdrop-blur text-gray-900 rounded-2xl rounded-br-sm shadow-xl relative max-w-md border border-gray-200 transform transition-all duration-300 origin-bottom-right ${isAnimatingStep5 ? 'scale-105 font-bold' : 'scale-100 font-medium'}}>
                         <p className="text-center text-sm">{aiResponseStep5}</p>
                      </div>
                      
                      {/* 비율 연동된 아바타 렌더링 */}
                      <div 
                        className="relative flex justify-center mt-auto rounded-[20px] pointer-events-auto overflow-hidden"
                        style={{ width: avatarWidth, height: avatarHeight }}
                      >
                        <div className={absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${isAnimatingStep5 ? '-translate-y-2' : ''}}>
                           <img 
                             src={selectedAvatar?.img || IMAGE_URL_HALF} 
                             alt="AI Human" 
                             className="w-full h-full object-contain object-bottom pointer-events-none drop-shadow-2xl"
                           />
                        </div>
                      </div>
                   </div>

                   {/* 하단 팬 UI (댓글 입력창 & 요청 버튼 Mock) */}
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 flex flex-col gap-4 z-20">
                     <div className="flex justify-center gap-2 overflow-x-auto scrollbar-hide w-full pb-1">
                        <button className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">🫶 하트해줘</button>
                        <button className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">👋 인사해줘</button>
                        <button className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">💃 춤춰줘</button>
                        <button className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">🎉 응원해줘</button>
                     </div>
                     <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center px-4 py-2.5 shadow-lg w-full">
                       <span className="text-gray-400 text-sm flex-1 ml-2">AI 휴먼에게 말을 걸어보세요!</span>
                       <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"><ChevronRight size={18} strokeWidth={3} /></div>
                     </div>
                   </div>
                </div>

                {/* 우측 슬라이드 채팅 패널 (선택적 노출) */}
                {showChatPreview && (
                  <div className="absolute top-0 right-0 bottom-0 w-[320px] bg-black/85 backdrop-blur-xl flex flex-col border-l border-white/10 z-30 animate-in slide-in-from-right-8 duration-300">
                    <div className="p-4 border-b border-white/10 text-white font-bold text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2"><MessageSquare size={16}/> 채팅 미리보기</div>
                      <button onClick={() => setShowChatPreview(false)} className="text-gray-400 hover:text-white transition"><X size={18}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {commentsEnabled ? (
                        <>
                          <div className="flex gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[8px] text-gray-300 font-bold uppercase">US</div>
                            <div className="leading-relaxed">
                              <span className="text-gray-400 font-bold mr-1.5">user123</span>
                              <span className="text-gray-100">360 공간 분위기 너무 좋다!!</span>
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-white"><Sparkles size={10}/></div>
                            <div className="bg-blue-600/20 p-2.5 rounded-lg rounded-tl-sm border border-blue-500/30 leading-relaxed">
                              <span className="text-blue-400 font-bold mr-1.5">{selectedAvatar?.name || '새 AI 휴먼'}</span>
                              <span className="text-blue-50">오늘도 와줘서 고마워요. ✨</span>
                            </div>
                          </div>
                          {messagesStep5.slice(1).map((m, i) => (
                            <div key={i} className="flex gap-2 text-xs animate-in fade-in">
                              <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[8px] text-gray-300 font-bold">OP</div>
                              <div className="leading-relaxed">
                                <span className="text-gray-400 font-bold mr-1.5">{m.sender}</span>
                                <span className="text-gray-100">{m.text}</span>
                              </div>
                            </div>
                          ))}
                          {isAnimatingStep5 && (
                            <div className="flex gap-2 text-xs animate-in fade-in">
                              <div className="w-6 h-6 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-white"><Sparkles size={10}/></div>
                              <div className="bg-blue-600/20 p-2.5 rounded-lg rounded-tl-sm border border-blue-500/30 leading-relaxed">
                                <span className="text-blue-400 font-bold mr-1.5">{selectedAvatar?.name || '새 AI 휴먼'}</span>
                                <span className="text-blue-50">{aiResponseStep5}</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                          댓글 사용이 중지되었습니다.
                        </div>
                      )}
                    </div>
                    {commentsEnabled && (
                      <div className="p-3 border-t border-white/10 bg-black/50">
                        <form onSubmit={handleSendStep5} className="relative flex items-center">
                          <input type="text" value={inputStep5} onChange={e => setInputStep5(e.target.value)} placeholder="채팅 입력 테스트..." className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-full px-4 py-2.5 pr-10 outline-none focus:border-white/40 transition text-xs" />
                          <button type="submit" disabled={!inputStep5.trim()} className="absolute right-1.5 w-7 h-7 bg-blue-600 disabled:bg-transparent disabled:opacity-30 rounded-full flex items-center justify-center text-white transition shadow-sm">
                            <ChevronRight size={16} strokeWidth={3} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
             </div>
             
             {/* 하단 보조 정보 (연결 설정 확인) - 간소화 */}
             <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-[11px] text-gray-500 font-medium">
               <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> AI 공간 구성 완료</span>
               <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> AI 휴먼 위치 설정</span>
               <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> BGM: {selectedBgm.name.split(' ')[0]}</span>
               <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> 반응: {selectedReaction.name}</span>
             </div>

          </div>
        </div>

        {/* 하단 고정 액션 */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <button onClick={() => setStep(4)} className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-1.5"><ChevronRight size={16} className="rotate-180"/> 이전</button>
             <button 
               onClick={() => onSubmit({ bgm: selectedBgm, reaction: selectedReaction, avatar: selectedAvatar })} 
               className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
             >
               게시 정보 설정으로 이동 <ChevronRight size={18}/>
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-none px-8 py-5 bg-white border-b border-gray-200 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide w-full max-w-6xl mx-auto">
          <PipelineStep num={1} label="공간 선택" active={step === 1} completed={step > 1} />
          <ChevronRight size={16} className="text-gray-300 shrink-0"/>
          <PipelineStep num={2} label="공간 다듬기" active={step === 2} completed={step > 2} />
          <ChevronRight size={16} className="text-gray-300 shrink-0"/>
          <PipelineStep num={3} label="AI 휴먼 선택" active={step === 3} completed={step > 3} />
          <ChevronRight size={16} className="text-gray-300 shrink-0"/>
          <PipelineStep num={4} label="360 공간 설정" active={step === 4} completed={step > 4} />
          <ChevronRight size={16} className="text-gray-300 shrink-0"/>
          <PipelineStep num={5} label="최종 미리보기" active={step === 5} completed={step > 5} />
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden flex flex-col bg-gray-50 min-h-0">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5 font-bold text-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400"/> {toastMsg}
        </div>
      )}
    </div>
  );
};

const PipelineStep = ({ num, label, active, completed }) => {
  return (
    <div className={flex items-center gap-2 transition-all whitespace-nowrap ${active ? 'opacity-100' : (completed ? 'opacity-100' : 'opacity-40 grayscale')}}>
      <div className={w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? 'bg-blue-600 text-white shadow-sm' : 
        completed ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'
      }}>
        {completed ? <Check size={14} strokeWidth={3}/> : num}
      </div>
      <span className={text-sm font-bold ${active ? 'text-gray-900' : (completed ? 'text-gray-700' : 'text-gray-400')}}>
        {label}
      </span>
    </div>
  )
}

// ==========================================
// 4. 게시 정보 설정/배포 화면
// ==========================================
const ReviewScreenView = ({ onBack, contentStatus, setContentStatus, onOpenPipeline, pipelineData, onGoToPlayer }) => {
  const [formData, setFormData] = useState({
    title: '팬과 함께하는 특별한 공간',
    description: '새롭게 생성된 360 공간입니다. 들어와서 대화해보세요!',
    blurEnabled: true,
    blurIntensity: 50,
    isPublic: contentStatus === '공개',
    isReserved: false,
    notificationEnabled: false,
    commentsEnabled: true,
    membership: '전체', // 멤버십 설정 기본값
  });

  const [savedData, setSavedData] = useState(formData);
  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleSaveInfo = () => {
    setSavedData(formData);
    triggerToast('게시 정보가 저장되었습니다.');
  };

  // 필수 조건: 제목, 설명, 멤버십 설정 (비공개여도 배포/수정 가능)
  const canPublish = formData.title.trim() !== '' && formData.description.trim() !== '' && formData.membership !== '';

  // 내장 플레이어 Mock
  const [messages, setMessages] = useState([
    { sender: 'user123', text: '기대된다!!' }
  ]);
  const [input, setInput] = useState('');
  const [aiResponse, setAiResponse] = useState('별빛들! 저와 대화를 나눠보세요.');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleSendMock = (e) => {
    e.preventDefault();
    if(!input.trim()) return;
    setMessages(prev => [...prev, { sender: '운영자', text: input }]);
    setIsAnimating(true);
    
    setTimeout(() => {
      if(input.includes('하트해줘') || input.includes('하트')) {
        setAiResponse('하트 받아주세요! 🫶');
      } else if (input.includes('안녕')) {
        setAiResponse('안녕하세요! 오늘도 와줘서 고마워요. ✨');
      } else if (input.includes('춤춰줘') || input.includes('춤')) {
        setAiResponse('좋아요, 짧게 춰볼게요! 💃');
      } else {
        setAiResponse("${input}" 라고 하셨군요! 확인했어요.);
      }
      setTimeout(() => setIsAnimating(false), 3500);
    }, 600);
    setInput('');
  };

  const selectedAvatar = pipelineData?.avatar || { name: '새 AI 휴먼', personaName: '기본 페르소나', avatarId: 'AVA_001', personaId: 'PER_001', voiceId: 'VOICE_001', img: IMAGE_URL_HALF, imgType: 'half' };
  const selectedReaction = pipelineData?.reaction || REACTION_SETS[0];
  const selectedBgm = pipelineData?.bgm || BGM_LIST[0];
  
  const isFull = selectedAvatar?.imgType === 'full';
  const avatarWidth = isFull ? '140px' : '260px';
  const avatarHeight = isFull ? '260px' : '200px';
  const currentBgImage = "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=600&h=300";

  // 우측 영역 공통 토글 컴포넌트
  const FormToggle = ({ label, required, checked, onChange, description, infoIcon }) => (
    <div className="py-4 border-b border-gray-100 last:border-0 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
          {label} {required && <span className="text-red-500">*</span>}
          {infoIcon && <Info size={14} className="text-gray-400" />}
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
        </label>
      </div>
      {description && <div className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">{description}</div>}
    </div>
  );

  return (
    <div className="relative h-full flex flex-col bg-white animate-in fade-in duration-500 overflow-hidden custom-scrollbar min-h-0">
      <div className="flex-1 overflow-y-auto pb-24 relative min-h-0">
        
        {/* 1. 상단 헤더 영역 */}
        <div className="px-8 pt-8 pb-2 flex items-center gap-2">
          <button onClick={onBack} className="text-gray-900 hover:bg-gray-100 p-1.5 rounded transition"><ChevronRight size={20} className="rotate-180"/></button>
          <span className="text-base font-bold text-gray-900">콘텐츠 관리</span>
        </div>
        <div className="px-12 pb-6 border-b border-gray-100">
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">AI 360 콘텐츠 수정</h1>
        </div>

        <div className="max-w-6xl mx-auto p-8">
          
          {/* 2. 상단: AI 360 구성 정보 (수정 가능) - 최상단 배치 */}
          <details className="group bg-[#f8f9fa] border border-gray-200 rounded-xl overflow-hidden mb-10 shadow-sm">
             <summary className="p-4 flex items-center justify-between cursor-pointer outline-none hover:bg-gray-100 transition">
                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Box size={18} className="text-amber-500"/> AI 360 구성 정보 (수정 가능)
                </div>
                <ChevronDown size={18} className="text-gray-500 group-open:rotate-180 transition-transform"/>
             </summary>
             <div className="p-5 border-t border-gray-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                  <div className="w-12 h-8 rounded bg-[url('https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=200&h=150')] bg-cover bg-center border border-gray-200"></div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 mb-0.5">공간</div>
                    <div className="font-bold text-gray-900 text-[11px]">마트 주차장</div>
                  </div>
                </div>
                <div className="p-3 border border-gray-100 rounded-xl flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-gray-500 mb-1">AI 휴먼</div>
                  <div className="text-[11px] font-bold text-gray-900">{selectedAvatar.name}</div>
                </div>
                <div className="p-3 border border-gray-100 rounded-xl flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-gray-500 mb-1">팬 반응 세트</div>
                  <div className="text-[11px] font-bold text-fuchsia-600">{selectedReaction.name}</div>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="p-3 border border-gray-100 rounded-xl flex flex-col justify-center bg-gray-50/50">
                     <div className="text-[10px] font-bold text-gray-500 mb-1">BGM</div>
                     <div className="text-[11px] font-bold text-gray-900 flex items-center gap-1.5 truncate"><Music size={12} className="text-gray-400 shrink-0"/> {selectedBgm.name}</div>
                   </div>
                   <button onClick={(e) => { e.preventDefault(); onOpenPipeline(); }} className="w-full py-2 bg-white border border-gray-300 rounded-lg text-[11px] font-bold hover:bg-gray-50 flex items-center justify-center gap-1 shadow-sm">
                     <Edit3 size={12}/> 스튜디오에서 재편집
                   </button>
                </div>
             </div>
          </details>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* 좌측 영역: 미리보기 및 블러 설정 */}
            <div className="flex flex-col gap-10">
              {/* 동영상 미리보기 */}
              <div>
                <div className="font-bold text-sm text-gray-900 mb-3">동영상 미리보기</div>
                <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative flex shadow-sm border border-gray-200">
                   <div className="flex-1 relative overflow-hidden">
                      <img src={currentBgImage} alt="360 background" className="absolute w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-end z-10 pb-4 pointer-events-none">
                         <div className={mb-2 px-3 py-1.5 bg-white/95 backdrop-blur text-gray-900 rounded-xl rounded-br-sm shadow-xl relative max-w-[200px] border border-gray-200 transform transition-all duration-300 origin-bottom-right ${isAnimating ? 'scale-105 font-bold' : 'scale-100 font-medium'}}>
                            <p className="text-center text-[10px]">{aiResponse}</p>
                         </div>
                         <div className="relative flex justify-center mt-auto rounded-xl pointer-events-auto overflow-hidden" style={{ width: avatarWidth, height: avatarHeight }}>
                           <div className={absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${isAnimating ? '-translate-y-2' : ''}}>
                              <img src={selectedAvatar?.img || IMAGE_URL_HALF} alt="AI Human" className="w-full h-full pointer-events-none object-contain object-bottom" />
                           </div>
                         </div>
                      </div>
                   </div>
                   {/* 우측 임베디드 채팅/입력창 (소형화) */}
                   <div className="w-[180px] bg-[#111] flex flex-col shrink-0 border-l border-gray-800 relative z-20">
                     <div className="p-2 border-b border-gray-800 text-white font-bold text-[10px] flex items-center gap-1.5"><MessageSquare size={12}/> 실시간 채팅</div>
                     <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                       {messages.map((m, i) => (
                         <div key={i} className="flex gap-1.5 text-[10px]">
                           <div className="w-4 h-4 rounded-full bg-gray-800 shrink-0 flex items-center justify-center text-[6px] text-gray-400 font-bold">{m.sender.substring(0,2)}</div>
                           <div className="leading-tight">
                             <span className="text-gray-500 font-bold mr-1">{m.sender}</span>
                             <span className="text-gray-200">{m.text}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                     <div className="p-2 border-t border-gray-800 bg-[#0a0a0a]">
                       <form onSubmit={handleSendMock} className="relative flex items-center">
                         <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="채팅 테스트" className="w-full bg-[#1a1a1a] border border-gray-700 text-white placeholder-gray-600 rounded-full px-2 py-1 pr-6 outline-none focus:border-gray-500 transition text-[9px]" />
                         <button type="submit" disabled={!input.trim()} className="absolute right-1 w-4 h-4 bg-blue-600 disabled:bg-transparent disabled:opacity-30 rounded-full flex items-center justify-center text-white"><ChevronRight size={10} strokeWidth={3} /></button>
                       </form>
                     </div>
                   </div>
                </div>
              </div>

              {/* 썸네일 미리보기 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm text-gray-900">썸네일 미리보기</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">블러 적용</span>
                    <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                      <input type="checkbox" checked={formData.blurEnabled} onChange={e=>setFormData({...formData, blurEnabled: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                </div>
                
                <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-gray-100 border border-gray-200 shadow-sm">
                  <img 
                    src={currentBgImage} 
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{ filter: formData.blurEnabled ? blur(${formData.blurIntensity / 3}px) : 'none', transform: formData.blurEnabled ? 'scale(1.05)' : 'scale(1)' }}
                    alt="thumbnail preview"
                  />
                </div>

                {/* 블러 강도 선택 */}
                <div className={mt-6 transition-opacity duration-300 ${formData.blurEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}}>
                   <div className="font-bold text-sm text-gray-900 mb-1.5">블러 강도 선택</div>
                   <p className="text-[11px] text-gray-500 mb-5 leading-relaxed">
                     콘텐츠 이용 권한이 없는 사용자와 알림 받는 사용자 모두에게 블러 처리된 썸네일이<br/>표시됩니다.<br/>
                     기본 블러 강도는 50이며 직접 선택하여 조정하실 수 있습니다.
                   </p>
                   <div className="px-1">
                     <input 
                       type="range" 
                       min="20" 
                       max="50" 
                       step="5"
                       dir="rtl"
                       value={formData.blurIntensity} 
                       onChange={(e) => setFormData({...formData, blurIntensity: e.target.value})}
                       className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" 
                     />
                     <div className="flex justify-between text-[11px] font-bold text-gray-600 mt-3">
                       <span>50</span><span>45</span><span>40</span><span>35</span><span>30</span><span>25</span><span>20</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* 우측 영역: 입력 및 설정 */}
            <div className="flex flex-col gap-6">
               {/* 동영상 제목 */}
               <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="font-bold text-sm text-gray-900">360 공간 제목 <span className="text-red-500">*</span></label>
                    <button className="text-xs text-gray-500 font-bold hover:text-gray-900">번역 보기</button>
                  </div>
                  <div className="relative">
                    <input type="text" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-black font-medium text-sm pr-16" maxLength={50}/>
                    <span className="absolute right-3 top-3 text-xs text-gray-400">{formData.title.length} / 50</span>
                  </div>
               </div>

               {/* 설명 */}
               <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="font-bold text-sm text-gray-900">설명 <span className="text-red-500">*</span></label>
                    <button className="text-xs text-gray-500 font-bold hover:text-gray-900">번역 보기</button>
                  </div>
                  <div className="relative">
                    <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 h-32 outline-none focus:border-black text-sm resize-none pb-8 custom-scrollbar" maxLength={1000}></textarea>
                    <span className="absolute right-3 bottom-3 text-xs text-gray-400">{formData.description.length} / 1000</span>
                  </div>
               </div>

               {/* AI 카피라이터 버튼 */}
               <button className="w-full bg-black text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition">
                  <Wand2 size={16}/> AI 카피라이터
               </button>
               <div className="flex justify-between text-[11px] text-gray-500 mt-1 mb-2">
                 <span>가이드라인을 위반한 콘텐츠는 카피 생성이 불가합니다.</span>
                 <button className="text-blue-500 hover:underline">가이드라인</button>
               </div>

               {/* 썸네일 업로드 영역 */}
               <div>
                  <div className="font-bold text-sm text-gray-900 mb-1">썸네일 <span className="text-red-500">*</span></div>
                  <p className="text-[11px] text-gray-500 mb-3">자동 생성된 이미지에서 썸네일을 선택해 보세요.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-video bg-[#f8f9fa] border border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 text-gray-400 transition shadow-sm">
                      <Plus size={20} className="mb-1 text-gray-300"/>
                      <span className="text-[10px] font-bold text-gray-400">업로드</span>
                    </div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-black cursor-pointer transition relative group shadow-sm">
                         <img src={currentBgImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="auto thumb" />
                         {i === 1 && <div className="absolute top-1.5 right-1.5 bg-black text-white rounded-full p-0.5 shadow-sm"><CheckCircle size={12}/></div>}
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#f8f9fa] rounded-lg p-4 mt-4 border border-gray-100">
                    <ul className="text-[11px] text-gray-500 space-y-1.5">
                      <li>• 권장 사이즈: 1280x720px</li>
                      <li>• 권장 크기: 5MB이하의 이미지 파일 포맷</li>
                      <li>• 파일 형식: JPG, JPEG, PNG, WEBP</li>
                    </ul>
                  </div>
               </div>

               <hr className="border-gray-100 my-2" />

               {/* 토글 설정 리스트 */}
               <div className="flex flex-col">
                 
                 {/* 멤버십 설정 (신규) */}
                 <div className="py-4 border-b border-gray-100 flex flex-col gap-3">
                   <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                     멤버십 설정 <span className="text-red-500">*</span>
                   </div>
                   <div className="flex flex-col gap-3 mt-1">
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="radio" name="membership" value="전체" checked={formData.membership === '전체'} onChange={e => setFormData({...formData, membership: e.target.value})} className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black" />
                       <span className="text-sm font-medium text-gray-900">전체</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="radio" name="membership" value="무료회원" checked={formData.membership === '무료회원'} onChange={e => setFormData({...formData, membership: e.target.value})} className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black" />
                       <span className="text-sm font-medium text-gray-900">무료회원</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="radio" name="membership" value="선택한 멤버십" checked={formData.membership === '선택한 멤버십'} onChange={e => setFormData({...formData, membership: e.target.value})} className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black" />
                       <span className="text-sm font-medium text-gray-900">선택한 멤버십</span>
                     </label>
                   </div>
                 </div>

                 <FormToggle 
                   label="공개 설정" 
                   required 
                   checked={formData.isPublic} 
                   onChange={(v)=>setFormData({...formData, isPublic: v})} 
                 />
                 <FormToggle 
                   label="예약 설정" 
                   required
                   infoIcon
                   checked={formData.isReserved} 
                   onChange={(v)=>setFormData({...formData, isReserved: v})} 
                   description="예약 설정이 켜져 있으면, 공개 설정은 비활성화되고&#10;예약 시간까지 콘텐츠는 비공개 상태로 유지됩니다."
                 />
                 <div className="py-4 border-b border-gray-100 last:border-0 flex flex-col gap-1.5">
                   <div className="flex items-center justify-between">
                     <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                       알림 설정 <span className="text-red-500">*</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                       <input type="checkbox" checked={formData.notificationEnabled} onChange={(e) => setFormData({...formData, notificationEnabled: e.target.checked})} className="sr-only peer" />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                     </label>
                   </div>
                   <div className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">
                     새로운 콘텐츠가 공개될 때 알림 메시지를 1회 발송해요.&#10;※ 블러 적용 시, 알림 메일에도 동일하게 적용됩니다.
                   </div>
                   {formData.notificationEnabled && (
                     <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                       <button className="bg-black text-white text-[11px] px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 transition">메시지 확인</button>
                     </div>
                   )}
                 </div>
                 <FormToggle 
                   label="댓글 설정" 
                   required
                   checked={formData.commentsEnabled} 
                   onChange={(v)=>setFormData({...formData, commentsEnabled: v})} 
                 />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 액션바 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-5 z-30 shrink-0">
        <div className="max-w-6xl mx-auto flex justify-end items-center gap-3">
           <button onClick={onBack} className="px-8 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition shadow-sm">
             취소
           </button>
           <button 
             onClick={()=>setShowPublishModal(true)} 
             disabled={!canPublish}
             className={px-8 py-3.5 text-white font-bold rounded-xl text-sm transition transform ${canPublish ? 'bg-black hover:bg-gray-800 shadow-md' : 'bg-gray-300 cursor-not-allowed'} text-center}
           >
             수정
           </button>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5 font-bold text-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400"/> {toastMsg}
        </div>
      )}

      {/* 모달: 최종 배포 승인 */}
      {showPublishModal && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPublishModal(false)}></div>
           <div className="bg-white border border-gray-200 text-gray-900 p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-white" />
             </div>
             <h3 className="text-xl font-black mb-2 text-gray-900">콘텐츠를 게시하시겠습니까?</h3>
             <p className="text-gray-500 text-sm mb-8 leading-relaxed">
               수정한 정보로 360 공간을 배포합니다.
             </p>
             <div className="flex gap-3">
               <button onClick={() => setShowPublishModal(false)} className="w-full px-5 py-3.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition shadow-sm">취소</button>
               <button onClick={() => {
                 setShowPublishModal(false);
                 setContentStatus('공개');
                 triggerToast('360 공간이 성공적으로 배포되었습니다.');
                 setTimeout(() => onGoToPlayer(), 1500); 
               }} className="w-full px-5 py-3.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 shadow-md transition">확인</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
// ==========================================
// 5. 팬 플레이어
// ==========================================
const PlayerScreenView = ({ pipelineData }) => {
  const [messages, setMessages] = useState([
    { sender: 'user123', text: '360 공간 분위기 너무 좋다!!' }
  ]);
  const [input, setInput] = useState('');
  const [aiResponse, setAiResponse] = useState('별빛들! 저와 대화를 나눠보세요.');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 채팅 정책 상태
  const [showPolicyToast, setShowPolicyToast] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [chatError, setChatError] = useState('');

  const selectedAvatar = pipelineData?.avatar || { name: '새 AI 휴먼', img: IMAGE_URL_HALF, imgType: 'half' };
  const isFull = selectedAvatar?.imgType === 'full';
  const avatarWidth = isFull ? '260px' : '500px';
  const avatarHeight = isFull ? '480px' : '380px';

  useEffect(() => {
    // 플레이어 입장 시 시스템 메시지 및 인사
    const timer1 = setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'SYSTEM', text: 'fan_007님이 입장했습니다.' }]);
      setIsAnimating(true);
      setAiResponse('fan_007님 어서오세요!');
      setTimeout(() => setIsAnimating(false), 3000);
    }, 2000);

    // 정책 안내 토스트 자동 숨김
    const timer2 = setTimeout(() => {
      setShowPolicyToast(false);
    }, 4500);

    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if(!input.trim()) return;

    // 욕설 및 부적절 단어 필터링 처리 (MVP Mock)
    const badWords = ['바보', '욕설', '멍청이'];
    if (badWords.some(word => input.includes(word))) {
      setChatError('부적절한 내용이 감지되어 전송할 수 없습니다.');
      setTimeout(() => setChatError(''), 3000);
      return;
    }
    
    setMessages(prev => [...prev, { sender: 'fan_007', text: input }]);
    setIsAnimating(true);
    
    setTimeout(() => {
      if(input.includes('하트해줘') || input.includes('하트')) {
        setAiResponse('하트 받아주세요! 🫶');
      } else if (input.includes('안녕')) {
        setAiResponse('안녕하세요! 오늘도 와줘서 고마워요. ✨');
      } else if (input.includes('춤춰줘') || input.includes('춤')) {
        setAiResponse('좋아요, 짧게 춰볼게요! 💃');
      } else {
        setAiResponse("${input}" 라고 하셨군요! 확인했어요.);
      }
      setTimeout(() => setIsAnimating(false), 3500);
    }, 600);
    setInput('');
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#0f0f0f] font-sans animate-in fade-in duration-700 overflow-hidden text-white relative z-50">
      <div className="flex-1 relative flex flex-col min-h-0">
        <div className="flex-1 relative overflow-hidden min-h-0">
          <img src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1600&h=900" alt="360 background" className="absolute w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50"></div>
          
          <div className="absolute top-6 left-6 z-20">
            <h1 className="text-white font-black text-2xl drop-shadow-md">팬과 함께하는 특별한 360 공간</h1>
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-end z-10 pb-10 pointer-events-none">
            <div className={mb-6 px-6 py-3 bg-white/95 backdrop-blur text-gray-900 rounded-2xl rounded-br-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative max-w-sm border border-gray-200 transform transition-all duration-300 origin-bottom-right ${isAnimating ? 'scale-105 font-bold' : 'scale-100 font-medium'}}>
               <p className="text-center text-sm">{aiResponse}</p>
            </div>
            
            <div 
              className="relative flex justify-center mt-auto rounded-[20px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 pointer-events-auto overflow-hidden"
              style={{
                width: avatarWidth,
                height: avatarHeight
              }}
            >
              <div className={absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${isAnimating ? '-translate-y-2' : ''}}>
                 <img 
                    src={selectedAvatar.img} 
                    alt="AI Human" 
                    className="w-full h-full object-contain object-bottom pointer-events-none"
                 />
              </div>
            </div>
          </div>

          {/* 팬 화면용 하단 요청 버튼 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex justify-center gap-2 overflow-x-auto scrollbar-hide w-full max-w-2xl px-6 z-20 pointer-events-auto">
             <button onClick={()=>setInput('하트해줘')} className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">🫶 하트해줘</button>
             <button onClick={()=>setInput('안녕')} className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">👋 인사해줘</button>
             <button onClick={()=>setInput('춤춰줘')} className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">💃 춤춰줘</button>
             <button onClick={()=>setInput('오늘도 예뻐, 응원해!')} className="bg-black/40 hover:bg-black/60 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 transition whitespace-nowrap">🎉 응원해줘</button>
          </div>
        </div>
        
        <div className="h-16 bg-[#1a1a1a] shrink-0 px-6 flex items-center justify-between border-t border-[#333] z-30">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-bold text-sm">X:IN</div>
             <div>
               <div className="font-bold text-sm">X:IN Official</div>
               <div className="text-[10px] text-gray-400">구독자 1.2M</div>
             </div>
             <button className="ml-4 bg-white text-black font-bold px-4 py-1.5 rounded-full text-xs hover:bg-gray-200 transition">구독</button>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] px-4 py-2 rounded-full text-xs font-bold transition"><ThumbsUp size={16}/> 1.4K</button>
             <button className="flex items-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] px-4 py-2 rounded-full text-xs font-bold transition"><Share2 size={16}/> 공유</button>
             <button className="bg-[#2a2a2a] hover:bg-[#333] p-2 rounded-full transition"><MoreHorizontal size={16}/></button>
          </div>
        </div>
      </div>

      {/* 우측 채팅 패널 */}
      <div className="w-full md:w-[380px] bg-[#1a1a1a] flex flex-col shrink-0 border-l border-[#333] relative">
        <div className="p-4 border-b border-[#333] flex items-center justify-between z-10 bg-[#1a1a1a]">
           <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> 실시간 채팅</h3>
           <button className="text-gray-400 hover:text-white"><MoreHorizontal size={18}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
          {/* 입장 시 1회성 정책 안내 토스트 */}
          {showPolicyToast && (
            <div className="sticky top-0 bg-gray-800/90 backdrop-blur text-white text-[11px] font-bold p-3.5 rounded-xl border border-gray-600 z-10 animate-in fade-in slide-in-from-top-2 flex items-start gap-2.5 shadow-lg mb-4">
               <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
               <span className="leading-relaxed">팬 댓글과 닉네임은 자동으로 필터링되며, 부적절한 내용에는 AI 휴먼이 응답하지 않습니다.</span>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2">
              {m.sender === 'SYSTEM' ? (
                 <div className="text-xs text-gray-400 font-bold bg-[#222] px-3 py-1.5 rounded-lg w-full text-center border border-[#333]">{m.text}</div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-[#333] shrink-0 flex items-center justify-center text-[10px] text-gray-400 uppercase font-bold">{m.sender.substring(0,2)}</div>
                  <div>
                    <span className="text-gray-400 font-bold text-xs mr-2">{m.sender}</span>
                    <span className="text-gray-200 leading-relaxed">{m.text}</span>
                  </div>
                </>
              )}
            </div>
          ))}
          {isAnimating && (
            <div className="flex gap-3 text-sm animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-white"><Sparkles size={14}/></div>
              <div className="bg-blue-600/20 p-2.5 rounded-lg rounded-tl-sm border border-blue-500/30">
                <span className="text-blue-400 font-bold mr-1.5">{selectedAvatar.name}</span>
                <span className="text-blue-50 leading-relaxed">{aiResponse}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 하단 입력 폼 영역 */}
        <div className="p-4 border-t border-[#333] bg-[#141414] flex flex-col gap-2">
          {/* 에러 메시지 노출 (부적절한 단어 감지 시) */}
          {chatError && (
            <div className="text-[11px] text-red-400 font-bold bg-red-900/20 border border-red-900/50 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-1 flex items-center gap-1.5">
              <AlertCircle size={12}/> {chatError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <form onSubmit={handleSend} className="relative flex items-center flex-1">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="AI 휴먼에게 말을 걸어보세요!" 
                className="w-full bg-[#2a2a2a] border border-[#333] text-white placeholder-gray-500 rounded-full px-5 py-3 pr-12 outline-none focus:border-gray-400 transition text-sm"
              />
              <button type="submit" disabled={!input.trim()} className="absolute right-2 w-9 h-9 bg-blue-600 disabled:bg-transparent disabled:opacity-30 rounded-full flex items-center justify-center text-white disabled:text-gray-400 hover:bg-blue-500 transition shadow-md">
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </form>

            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowPolicyModal(!showPolicyModal)} 
                className="w-9 h-9 rounded-full bg-[#2a2a2a] hover:bg-[#333] border border-[#333] flex items-center justify-center text-gray-400 hover:text-white transition shrink-0"
              >
                <Info size={18}/>
              </button>
              {/* 정책 안내 툴팁 */}
              {showPolicyModal && (
                <div className="absolute bottom-full right-0 mb-3 w-56 bg-gray-800 border border-gray-700 p-3 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 origin-bottom-right">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400"/> 채팅 필터링 안내</span>
                    <button onClick={()=>setShowPolicyModal(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    팬 댓글과 닉네임은 시스템에 의해 자동으로 필터링되며, 부적절한 내용이 포함될 경우 AI 휴먼이 응답하지 않습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Root App Component
// ==========================================

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('content_list');
  const [contentStatus, setContentStatus] = useState('게시 승인 대기');
  const [globalAiHumans, setGlobalAiHumans] = useState([
    { id: 1, name: "아리아", avatarId: "KLEVER_AVA_001", personaId: "XIN_IDOL_01", role: "아이돌", voice: "유리(밝은 목소리)", personality: "밝고 활발함", speakLanguage: "한국어", listenLanguage: "한국어", status: "사용 가능", lastModified: "2026.06.05", img: IMAGE_URL_FULL, imgType: 'full', isDefault: true },
    { id: 2, name: "루나", avatarId: "KLEVER_AVA_002", personaId: "XIN_IDOL_02", role: "아이돌", voice: "제니(부드러운 목소리)", personality: "차분하고 지적임", speakLanguage: "한국어", listenLanguage: "영어", status: "사용 가능", lastModified: "2026.06.04", img: IMAGE_URL_HALF, imgType: 'half', isDefault: true },
  ]);
  const [pipelineData, setPipelineData] = useState(null);

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden bg-[#111] selection:bg-blue-500 selection:text-white relative pt-14 md:pt-16">
      <style dangerouslySetInnerHTML={{__html: 
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .bg-\\[\\#0f0f0f\\] .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        .bg-\\[\\#0f0f0f\\] .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        .bg-\\[\\#1a1a1a\\] .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        .bg-\\[\\#1a1a1a\\] .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      }} />
      
      {/* 1. 최상단 네비게이션: 절대적인 z-index와 영역 보장 (다른 요소에 가려지지 않음) */}
      <div className="w-full shrink-0 relative z-[99999] pointer-events-auto bg-[#111]">
        <PrototypeNav current={currentScreen} setScreen={setCurrentScreen} />
      </div>
      
      {/* 2. 메인 앱 컨테이너: flex-1과 min-h-0로 상단바를 위로 밀어내지 못하게 고정 */}
      <div className="flex-1 relative w-full overflow-hidden bg-white min-h-0 z-0">
        {currentScreen === 'home' && (
          <FanLayout currentScreen={currentScreen} setScreen={setCurrentScreen}>
             <MainHomeView onPlayContent={(content) => { setContentStatus(content.status); setCurrentScreen('player'); }} />
          </FanLayout>
        )}

        {currentScreen === 'channel_settings' && (
          <XromedaLayout currentTab="channel_settings" setScreen={setCurrentScreen}>
            <ChannelSettingsView aiHumans={globalAiHumans} setAiHumans={setGlobalAiHumans} onGoToPipeline={() => setCurrentScreen('pipeline')}/>
          </XromedaLayout>
        )}
        
        {currentScreen === 'content_list' && (
          <XromedaLayout currentTab="content_list" setScreen={setCurrentScreen}>
            <ContentManagementList 
              onOpenPipeline={() => setCurrentScreen('pipeline')} 
              onOpenApproval={() => setCurrentScreen('approval')}
              contentStatus={contentStatus}
              setContentStatus={setContentStatus}
              onGoToChannelSettings={() => setCurrentScreen('channel_settings')}
            />
          </XromedaLayout>
        )}
        
        {currentScreen === 'pipeline' && (
          <XromedaLayout currentTab="pipeline" setScreen={setCurrentScreen}>
            <Ai360PipelineView 
              aiHumans={globalAiHumans}
              onGoToChannelSettings={() => setCurrentScreen('channel_settings')}
              onSubmit={(data) => {
                setPipelineData(data);
                setContentStatus('게시 승인 대기'); 
                setCurrentScreen('approval');
              }} 
            />
          </XromedaLayout>
        )}
        
        {currentScreen === 'approval' && (
          <XromedaLayout currentTab="approval" setScreen={setCurrentScreen}>
            <ReviewScreenView 
              contentStatus={contentStatus}
              setContentStatus={setContentStatus}
              onBack={() => setCurrentScreen('content_list')}
              onOpenPipeline={() => setCurrentScreen('pipeline')}
              pipelineData={pipelineData}
              onGoToPlayer={() => setCurrentScreen('player')}
            />
          </XromedaLayout>
        )}
        
        {currentScreen === 'player' && (
          <PlayerScreenView pipelineData={pipelineData} />
        )}
      </div>
    </div>
  );
}

export default App;


# XROMEDA AI 휴먼 / AI 360 팬 인터랙션 프로토타입 PRD

## 1. 문서 목적

본 문서는 XROMEDA 내 **AI 휴먼 기반 AI 360 팬 인터랙션 콘텐츠** 개발을 위한 제품 요구사항 정의서이다.

이번 MVP의 핵심은 기존 XROMEDA의 콘텐츠 관리 구조를 유지하면서, 360 공간 안에 AI 휴먼을 배치하고 팬이 채팅과 요청 버튼을 통해 상호작용할 수 있는 초기 버전을 구현하는 것이다.

본 PRD는 제품 정책, 화면 구조, 사용자 플로우, 상태 처리, 예외 처리, 외부 연동 기준을 정의한다.

---

## 2. MVP 목표

### 2.1 핵심 목표

XROMEDA AI 360 MVP는 사용자가 360 공간을 선택하고, 사전에 등록된 AI 휴먼을 연결하여 팬이 입장할 수 있는 AI 360 콘텐츠를 만드는 기능을 제공한다.

MVP에서는 복잡한 고급 설정보다 아래 경험을 우선한다.

1. AI 휴먼은 채널설정에서 먼저 등록하고 관리한다.
2. AI 360 제작 과정에서는 등록된 AI 휴먼을 선택한다.
3. 360 공간은 템플릿에서 선택하고 필요 시 간단히 다듬을 수 있다.
4. AI 휴먼은 360 공간 안에 자연스럽게 배치된다.
5. 팬 반응 세트와 BGM은 시스템이 자동 추천한다.
6. 사용자는 필요한 경우 팬 반응 세트와 BGM만 변경할 수 있다.
7. 최종 미리보기에서 팬 화면을 확인한 뒤 게시 정보를 설정하고 배포한다.
8. 팬 플레이어에서는 AI 휴먼이 댓글, 입장, 요청 버튼에 반응한다.

### 2.2 MVP 제공 기준

MVP 시연 기준으로 기본 제공 AI 휴먼 10종을 제공한다.

구성 예시:

* X:IN 5종
* 크리에이터/버튜버형 5종

기본 제공 AI 휴먼은 모두 아래 조건을 충족한 상태여야 한다.

* AI 휴먼 정보 등록 완료
* 대화 설정 완료
* 목소리 설정 완료
* 팬 반응 세트 기본 연결 완료
* 사용 가능 상태
* AI 360 제작 단계에서 선택 가능

사용자 맞춤형 AI 휴먼 제작도 제공하되, 제작 요청 후 즉시 AI 360 제작에서 사용할 수 없다. 제작 완료 후 사용 가능 상태가 된 AI 휴먼만 AI 360 제작에서 선택할 수 있다.

---

## 3. 최종 사용 용어

| 용어         | 정의                                          |
| ---------- | ------------------------------------------- |
| AI 휴먼      | 채널에서 관리하며 팬 플레이어에 등장하는 AI 캐릭터               |
| AI 360 콘텐츠 | 360 공간, AI 휴먼, 팬 반응 세트, BGM, 게시 정보가 결합된 콘텐츠 |
| 360 공간     | AI 휴먼이 등장하는 360 배경 공간                       |
| 360 공간 선택  | AI 360 콘텐츠에 사용할 360 공간 템플릿을 선택하는 단계         |
| 360 공간 다듬기 | 선택한 360 공간의 색감, 분위기, 일부 연출을 AI로 조정하는 단계     |
| AI 휴먼 선택   | AI 360 콘텐츠에 등장할 AI 휴먼을 선택하는 단계              |
| 360 공간 설정  | AI 휴먼 위치, 팬 반응 세트, BGM을 설정하는 단계             |
| 팬 반응 세트    | 팬 입장, 댓글, 요청 버튼에 대한 AI 휴먼의 반응 규칙 묶음         |
| BGM        | AI 360 콘텐츠에서 재생되는 배경음악                      |
| 최종 미리보기    | 팬에게 보일 최종 AI 360 콘텐츠 화면을 확인하는 단계            |
| 게시 정보 설정   | 콘텐츠 제목, 설명, 썸네일, 공개 설정, 댓글 설정 등을 입력하는 단계    |
| 팬 플레이어     | 팬이 AI 360 콘텐츠에 입장해 AI 휴먼과 상호작용하는 화면         |
| 채널         | XROMEDA 내 크리에이터 또는 운영자 계정 단위                |

---

## 4. 메뉴 구조

### 4.1 기존 LNB 유지

기존 XROMEDA LNB 구조는 유지한다.

* 콘텐츠 관리
* 커뮤니티
* 상품 & 수익
* 회원 관리
* 분석
* 정산
* 채널설정
* 크리에이터 가이드

### 4.2 AI 휴먼 관리 위치

AI 휴먼 관리는 신규 LNB 메뉴로 분리하지 않는다.

위치:

txt
채널설정 > AI 휴먼 관리


채널설정 탭 구조:

txt
기본 설정
프로필 설정
AI 휴먼 관리


### 4.3 기능 노출 권한

AI 휴먼 관리 및 AI 360 콘텐츠 생성 기능은 모든 채널에 기본 노출하지 않는다.

노출 대상:

* 운영자가 AI 360 권한을 부여한 채널

권한이 없는 채널에는 AI 휴먼 관리 탭과 AI 360 콘텐츠 생성 항목을 노출하지 않는다.

---

## 5. 채널설정 > AI 휴먼 관리

### 5.1 화면 목적

채널에서 AI 360 콘텐츠에 사용할 AI 휴먼을 사전에 등록하고 관리하는 화면이다.

AI 360 제작 과정에서는 AI 휴먼을 새로 만들지 않는다.
AI 360 제작에서는 이 화면에서 사용 가능 상태인 AI 휴먼만 선택할 수 있다.

### 5.2 화면명

txt
AI 휴먼 관리


### 5.3 설명 문구

txt
AI 360 콘텐츠에 사용할 AI 휴먼을 등록하고 기본 대화 설정을 관리합니다.


### 5.4 목록 구조

AI 휴먼 목록은 테이블 형태로 제공한다.

컬럼:

| 컬럼명    | 설명                         |
| ------ | -------------------------- |
| AI 휴먼  | AI 휴먼 표시 이름                |
| 페르소나   | 팬 화면에서 사용할 캐릭터 성격/역할 이름    |
| 유형     | 에너제틱, 차분지적, 모에, 쿨시크 등      |
| 표시 유형  | 상반신 / 전신                   |
| 상태     | 사용 가능 / 제작 중 / 제작 실패 / 비활성 |
| 최근 수정일 | 마지막 수정일                    |
| 관리     | 수정, 활성/비활성                 |

### 5.5 상태 정의

| 상태    | 의미                 | AI 360 제작 선택 가능 여부 |
| ----- | ------------------ | ------------------ |
| 사용 가능 | 제작 완료 및 연동 가능      | 가능                 |
| 제작 중  | 외부 제작 또는 연동 처리 중   | 불가                 |
| 제작 실패 | 제작 또는 연동 실패        | 불가                 |
| 비활성   | 채널에서 사용하지 않도록 비활성화 | 불가                 |

### 5.6 주요 버튼

txt
새 AI 휴먼 만들기


동작:

* 클릭 시 채널설정 > AI 휴먼 관리 > 새 AI 휴먼 만들기 화면으로 이동한다.
* AI 360 제작 화면으로 이동하면 안 된다.

---

## 6. 새 AI 휴먼 만들기

### 6.1 진입 위치

txt
채널설정 > AI 휴먼 관리 > 새 AI 휴먼 만들기


### 6.2 화면명

txt
새 AI 휴먼 만들기


### 6.3 설명 문구

txt
사진과 대화 설정을 입력하면 AI 360 콘텐츠에서 사용할 AI 휴먼을 등록할 수 있습니다.


### 6.4 화면 구성

화면은 좌측 이미지 영역과 우측 설정 영역으로 구성한다.

좌측:

* AI 휴먼 이미지 업로드
* 샘플 상반신 이미지 적용
* 샘플 전신 이미지 적용
* 표시 유형 선택
* 권리 확인 체크

우측:

* 기본 정보
* 대화 설정

---

## 7. AI 휴먼 이미지 설정

### 7.1 업로드 기능

사용자는 정면 얼굴이 잘 보이는 이미지를 업로드한다.

업로드 안내 문구:

txt
정면 얼굴이 잘 보이는 사진을 올려주세요.
권장: 1인 정면 사진, 상반신 또는 전신 이미지
지원 형식: JPG, PNG, WEBP


### 7.2 샘플 이미지

MVP 시연을 위해 샘플 이미지를 제공한다.

버튼:

txt
샘플 상반신 이미지 적용
샘플 전신 이미지 적용


샘플 이미지 적용 시 실제 업로드와 동일하게 미리보기 영역에 반영된다.

### 7.3 표시 유형

AI 휴먼의 기본 표시 유형은 AI 휴먼 생성 단계에서 설정한다.

옵션:

txt
상반신
전신


정책:

* 상반신은 팬 플레이어에서 화상회의처럼 중앙 상반신 구도로 표시한다.
* 상반신은 AI 360 제작 과정에서 위치 이동을 지원하지 않는다.
* 전신은 360 공간 안에 서 있는 형태로 표시한다.
* 전신은 AI 360 제작 과정에서 위치 조정을 지원한다.
* 표시 유형은 AI 휴먼 기본 속성으로 저장한다.
* AI 360 제작 단계에서는 표시 유형을 다시 선택하지 않는다.

---

## 8. AI 휴먼 기본 정보

### 8.1 입력 필드

| 필드       | 필수 여부 | 설명                             |
| -------- | ----- | ------------------------------ |
| AI 휴먼 이름 | 필수    | 팬 화면과 관리 화면에 표시될 이름            |
| 한 줄 소개   | 선택    | AI 휴먼을 설명하는 짧은 문구              |
| 역할       | 필수    | 아이돌, 건강 코디네이터, 여행가이드, 영어 선생님 등 |
| 기본 성격    | 필수    | 친절한/밝은, 차분한, 시크한, 열정적인 등       |
| 말하기 언어   | 필수    | AI 휴먼이 말하는 언어                  |
| 듣기 언어    | 필수    | AI 휴먼이 이해하는 언어                 |
| 목소리      | 필수    | 연결 가능한 음성 목록                   |
| AI 서비스   | 필수    | 응답 생성에 사용할 AI 서비스              |

### 8.2 언어 옵션

말하기 언어와 듣기 언어는 각각 설정한다.

지원 언어:

* 한국어
* 영어
* 일본어

### 8.3 목소리 옵션

목소리는 제공 가능한 음성 목록에서 선택한다.

예시:

* 유리 기본
* 유리 밝은 목소리
* 유리 부드러운 목소리
* 차누 기본
* 차누 밝은 목소리
* 차누 열정적인 목소리
* 크리스 기본
* 크리스 밝은 목소리
* 크리스 부드러운 목소리

목소리 목록은 외부 음성 제공 목록과 매핑되어야 한다.

### 8.4 AI 서비스 옵션

지원 옵션:

* ChatGPT
* Gemini

AI 서비스는 AI 휴먼의 응답 생성에 사용할 엔진을 의미한다.

---

## 9. AI 휴먼 대화 설정

### 9.1 목적

AI 휴먼이 팬 댓글과 요청에 어떤 말투와 기준으로 반응할지 설정한다.

### 9.2 입력 필드

| 필드            | 필수 여부 | 설명                     |
| ------------- | ----- | ---------------------- |
| 인사말           | 필수    | 팬 입장 또는 기본 환영 시 사용할 문장 |
| 이해하지 못했을 때 응답 | 필수    | 인식하지 못한 요청에 대한 기본 응답   |
| 응답 제한 주제      | 필수    | AI 휴먼이 응답하지 않아야 할 주제   |
| 캐릭터 설명        | 필수    | AI 휴먼의 역할, 성격, 대화 기준   |
| 사전 지식/역할      | 선택    | 특정 역할 수행에 필요한 배경 정보    |

### 9.3 기본값 예시

인사말:

txt
안녕하세요! 오늘도 와줘서 고마워요.


이해하지 못했을 때 응답:

txt
미안해요, 다시 한 번 말해줄래요?


응답 제한 주제:

txt
정치, 종교, 성인 주제, 비속어, 차별적 표현, 불법 활동, 타인 비하


캐릭터 설명:

txt
팬들과 친근하게 소통하는 AI 휴먼입니다. 인사, 응원, 하트 요청, 간단한 리액션에 밝고 긍정적으로 반응합니다.


---

## 10. 권리 확인

### 10.1 표시 조건

사용자가 이미지를 업로드하여 AI 휴먼을 제작하는 경우 필수로 표시한다.

기본 제공 AI 휴먼을 사용하는 경우에는 표시하지 않는다.

### 10.2 체크 문구

txt
업로드한 사진이 본인 또는 사용 권한을 가진 이미지임을 확인합니다.


txt
입력한 AI 휴먼 정보가 타인 사칭, 권리 침해, 혐오·성적 표현을 포함하지 않음을 확인합니다.


### 10.3 버튼 활성 조건

AI 휴먼 제작 요청 버튼은 아래 조건을 모두 충족해야 활성화한다.

* 이미지 업로드 또는 샘플 이미지 적용 완료
* 표시 유형 선택
* 필수 기본 정보 입력
* 필수 대화 설정 입력
* 권리 확인 체크

---

## 11. AI 휴먼 제작 요청

### 11.1 버튼명

txt
AI 휴먼 제작 요청


### 11.2 동작

클릭 시:

1. AI 휴먼 제작 요청을 생성한다.
2. 상태를 제작 중으로 변경한다.
3. AI 휴먼 관리 목록으로 이동한다.
4. 목록에서 해당 AI 휴먼을 제작 중 상태로 표시한다.
5. 제작 완료 전까지 AI 360 제작에서 선택할 수 없다.

### 11.3 제작 완료 처리

외부 제작 또는 연동이 완료되면 상태를 사용 가능으로 변경한다.

사용자 화면에는 기술 식별자를 주요 정보로 노출하지 않는다.
필요한 경우 상세 화면의 보조 정보로만 작게 표시한다.

### 11.4 제작 실패 처리

제작 실패 시 상태를 제작 실패로 표시한다.

사용자 안내 문구:

txt
AI 휴먼 제작에 실패했습니다. 이미지를 다시 확인하거나 잠시 후 다시 시도해 주세요.


제작 실패 상태의 AI 휴먼은 AI 360 제작에서 선택할 수 없다.

---

## 12. AI 360 콘텐츠 생성 진입

### 12.1 진입 위치

txt
콘텐츠 관리 > + 업로드 > AI 360 팬 공간 만들기


콘텐츠 관리 화면 진입 시 업로드 모달이 자동으로 열리면 안 된다.
업로드 모달은 반드시 + 업로드 클릭 시에만 표시한다.

### 12.2 업로드 타입명

txt
AI 360 팬 공간 만들기


### 12.3 설명 문구

txt
360 공간을 선택하고 AI 휴먼, BGM, 팬 반응을 연결해 팬이 입장할 수 있는 AI 360 콘텐츠를 만듭니다.


### 12.4 전체 단계

AI 360 콘텐츠 생성 단계는 아래 순서를 따른다.

txt
1. 360 공간 선택
2. 360 공간 다듬기
3. AI 휴먼 선택
4. 360 공간 설정
5. 최종 미리보기
6. 게시 정보 설정
7. 배포


자동 검사는 별도 화면으로 분리하지 않는다.
필요한 검사는 각 단계 이동 시 시스템이 자동으로 처리한다.

---

## 13. 360 공간 선택

### 13.1 화면명

txt
360 공간 선택


### 13.2 설명 문구

txt
AI 휴먼이 활동할 360 공간을 선택하세요.


### 13.3 공간 템플릿

MVP 기준 50개 360 공간 템플릿 제공을 목표로 한다.

카테고리:

* 전체
* 작업·활동
* 일상·사적
* 취미·테마
* 팬 참여형

### 13.4 카드 정보

각 카드에는 아래 정보를 표시한다.

* 썸네일
* 360 공간명
* 카테고리
* 선택 상태

### 13.5 선택 동작

* 카드 클릭 시 선택 상태를 표시한다.
* 360 공간을 선택해야 다음 단계 버튼이 활성화된다.
* 선택한 360 공간은 이후 단계 전체에 적용된다.

### 13.6 썸네일 예외 처리

이미지가 로딩되지 않으면 fallback 썸네일을 표시한다.

fallback 상태에서도 카드 선택은 가능해야 한다.

---

## 14. 360 공간 다듬기

### 14.1 화면명

txt
360 공간 다듬기


### 14.2 설명 문구

txt
선택한 360 공간의 분위기나 색감을 원하는 느낌으로 조정할 수 있습니다.


### 14.3 UI 원칙

360 공간 다듬기는 사용자가 선택한 360 공간을 크게 보면서 필요한 경우에만 요청 문구를 입력하는 구조로 제공한다.

화면 구성:

* 중앙: 360 공간 미리보기
* 하단 고정 패널: 요청 문구 입력 영역
* 하단 버튼: 이전 / 다음 또는 360 공간 다듬기 시작

### 14.4 360 공간 표시

원본 이미지는 360 이미지 형태를 유지한다.

사용자 화면에서는 실제 공간처럼 보이도록 표시한다.

정책:

* 사용자는 360 공간을 제한적으로 둘러볼 수 있다.
* 회전 범위는 약 60~90도 수준으로 제한한다.
* 원본 이미지를 펼친 형태로 직접 보여주지 않는다.
* 수정 처리는 원본 360 이미지를 기준으로 수행한다.

### 14.5 요청 문구 입력

입력 영역은 짧고 간단하게 제공한다.

Placeholder:

txt
예: 조명을 따뜻하게 바꾸고, 네온사인 분위기를 추가해줘.
예: 전체적인 색감을 사이버펑크 톤으로 변경해줘.


### 14.6 버튼 상태

입력값이 없는 경우:

txt
다음: AI 휴먼 선택


입력값이 있는 경우:

txt
360 공간 다듬기 시작


다듬기 진행 중:

txt
360 공간 다듬는 중...


다듬기 완료 후:

txt
다음: AI 휴먼 선택
다시 다듬기


### 14.7 자동 확인

360 공간 다듬기 완료 후 시스템은 결과 사용 가능 여부를 자동 확인한다.

확인 항목:

* 이미지 로딩 가능 여부
* 360 이미지 비율 유지 여부
* 품질 손상 여부
* 과도한 왜곡 여부
* 금지 콘텐츠 포함 여부
* 공간 구조 유지 여부

### 14.8 실패 처리

결과를 사용할 수 없는 경우 다음 단계로 이동하지 않는다.

안내 문구:

txt
360 공간 다듬기 결과를 사용할 수 없습니다. 요청 문구를 줄이거나 다시 시도해 주세요.


사용자는 요청 문구를 수정해 다시 시도하거나 이전 단계로 이동할 수 있다.

---

## 15. AI 휴먼 선택

### 15.1 화면명

txt
AI 휴먼 선택


### 15.2 설명 문구

txt
이 AI 360 콘텐츠에 등장할 AI 휴먼을 선택하세요.


### 15.3 표시 대상

사용 가능 상태의 AI 휴먼만 선택 가능하다.

제작 중, 제작 실패, 비활성 상태의 AI 휴먼은 선택할 수 없다.

### 15.4 카드 정보

AI 휴먼 카드에는 아래 정보를 표시한다.

* AI 휴먼 이미지
* AI 휴먼 이름
* 페르소나
* 유형
* 표시 유형
* 상태

### 15.5 기본 제공 AI 휴먼

MVP 시연용 기본 제공 AI 휴먼 10종은 사용 가능 상태로 제공한다.

### 15.6 빈 상태

선택 가능한 AI 휴먼이 없을 경우 아래 문구를 표시한다.

txt
사용 가능한 AI 휴먼이 없습니다.
채널설정에서 AI 휴먼을 먼저 등록해 주세요.


버튼:

txt
AI 휴먼 관리로 이동


---

## 16. 360 공간 설정

### 16.1 화면명

txt
360 공간 설정


### 16.2 설명 문구

txt
AI 휴먼의 위치와 360 공간 기본 설정을 확인하세요.


### 16.3 구성 순서

360 공간 설정 화면은 아래 순서로 구성한다.

1. AI 휴먼 위치
2. 팬 반응 세트
3. BGM
4. 자동 연결 확인

댓글 사용 여부는 이 화면에서 설정하지 않는다.
댓글 사용 여부는 게시 정보 설정에서 관리한다.

---

## 17. AI 휴먼 위치

### 17.1 목적

팬 플레이어에서 AI 휴먼이 보일 위치를 설정한다.

### 17.2 전신 표시 유형

AI 휴먼이 전신 표시 유형인 경우:

* 360 공간 위에 AI 휴먼을 표시한다.
* 사용자는 AI 휴먼을 드래그해 위치를 조정할 수 있다.
* 위치 조정 가능 영역은 가이드 프레임으로 표시한다.
* 위치 변경 후 다음 단계 이동 시 저장한다.

### 17.3 상반신 표시 유형

AI 휴먼이 상반신 표시 유형인 경우:

* 팬 플레이어 중앙에 화상회의형 구도로 표시한다.
* 사용자는 위치를 이동할 수 없다.
* 위치 조정 UI는 비활성화하거나 노출하지 않는다.
* 안내 문구를 표시한다.

안내 문구:

txt
상반신 AI 휴먼은 팬 화면 중앙에 고정됩니다.


---

## 18. 팬 반응 세트

### 18.1 화면명

txt
팬 반응 세트


### 18.2 설명 문구

txt
팬이 입장하거나 댓글을 남겼을 때 AI 휴먼이 반응하는 기본 규칙입니다.


### 18.3 정책

팬 반응 세트는 MVP 필수 기능이다.

단, 사용자가 개별 반응 문장을 직접 편집하지 않는다.

시스템이 선택된 AI 휴먼과 360 공간 유형을 기준으로 기본 팬 반응 세트를 자동 추천한다.

### 18.4 기본 표시

예시:

txt
기본 팬 소통형
자동 추천
인사, 하트 요청, 춤 요청, 응원 댓글에 반응합니다.


### 18.5 제공 기능

화면에는 아래 기능만 제공한다.

txt
요약 보기
다른 반응 세트 선택


### 18.6 요약 보기

요약 보기 클릭 시 모달을 표시한다.

모달에는 선택된 팬 반응 세트의 주요 반응 예시만 표시한다.

예시 항목:

* 인사
* 하트 요청
* 춤 요청
* 응원
* 이해하지 못했을 때 응답

예시 표기:

txt
팬 댓글: 안녕, 반가워
AI 반응: 환영 인사


### 18.7 다른 반응 세트 선택

다른 반응 세트 선택 클릭 시 모달을 표시한다.

모달에는 10개 팬 반응 세트를 카드 형태로 표시한다.

카드 정보:

* 세트명
* 분류
* 설명
* 주요 반응

선택 후 선택 완료 클릭 시 현재 360 공간 설정 화면에 반영한다.

### 18.8 팬 반응 세트 분류

MVP에서는 총 10개 팬 반응 세트를 제공한다.

| 분류      | 수량 | 설명                    |
| ------- | -- | --------------------- |
| 자유 대화형  | 3  | 일반 대화, 질문 답변, 분위기 유지  |
| 참여 선택형  | 2  | 팬 선택지, 반응 선택, 간단한 투표  |
| 일상 공유형  | 2  | 일상 이야기, 근황 공유, 친근한 소통 |
| 이벤트·시즌형 | 2  | 생일, 기념일, 시즌 이벤트       |
| 미니게임형   | 1  | 선택지 기반 간단한 놀이         |

---

## 19. BGM

### 19.1 화면명

txt
BGM


### 19.2 설명 문구

txt
시스템이 360 공간 분위기와 AI 휴먼 성격을 기준으로 자동 추천합니다.


### 19.3 기본 표시

예시:

txt
BGM_001 로파이·칠
360 공간 분위기에 맞춰 자동 추천되었습니다.


### 19.4 버튼

txt
미리듣기
다른 BGM 선택


### 19.5 미리듣기

미리듣기 클릭 시 선택된 BGM을 짧게 재생한다.

재생 중에는 버튼 상태를 변경한다.

txt
재생 중


### 19.6 다른 BGM 선택

다른 BGM 선택 클릭 시 모달을 표시한다.

모달 카드 정보:

* BGM명
* 분위기 태그
* 길이
* 미리듣기
* 선택

선택 후 현재 360 공간 설정 화면에 반영한다.

---

## 20. 자동 연결 확인

### 20.1 처리 시점

사용자가 360 공간 설정에서 다음: 최종 미리보기를 클릭할 때 시스템이 자동으로 연결 상태를 확인한다.

### 20.2 확인 항목

* AI 휴먼 연결
* AI 휴먼 위치 정보 저장
* 팬 반응 세트 연결
* BGM 연결
* 댓글 반응 연결
* 팬 요청 버튼 연결

### 20.3 성공 처리

성공 시 최종 미리보기로 이동한다.

### 20.4 실패 처리

실패 시 다음 단계로 이동하지 않는다.

예시 문구:

txt
AI 휴먼 연결에 실패했습니다. 다른 AI 휴먼을 선택하거나 다시 시도해 주세요.


txt
BGM 연결에 실패했습니다. 다른 BGM을 선택해 주세요.


txt
팬 반응 세트 연결에 실패했습니다. 다른 팬 반응 세트를 선택해 주세요.


---

## 21. 최종 미리보기

### 21.1 화면명

txt
최종 미리보기


### 21.2 설명 문구

txt
생성된 360 공간과 AI 휴먼이 팬 화면에서 어떻게 보일지 확인하세요.


### 21.3 UI 정책

최종 미리보기는 설정 화면이 아니다.
팬이 보게 될 최종 화면을 확인하는 단계이다.

기본은 플레이어 중심 화면으로 구성한다.

표시 요소:

* 360 공간
* AI 휴먼
* AI 휴먼 말풍선
* BGM 재생 상태
* 팬 요청 버튼
* 최소 채팅 미리보기

### 21.4 채팅 미리보기

채팅 패널을 크게 고정 노출하지 않는다.

권장 방식:

* 기본은 플레이어 중심
* 채팅 미리보기는 접힘 또는 최소 형태
* 예시 댓글은 1~2개만 표시

### 21.5 자동 확인 결과

자동 확인 결과는 하단에 간단히 표시한다.

예시:

txt
자동 확인 완료
360 공간 구성
AI 휴먼 위치
BGM 연결
팬 반응 세트 연결


### 21.6 버튼

txt
이전
게시 정보 설정으로 이동


---

## 22. 게시 정보 설정

### 22.1 목적

AI 360 콘텐츠를 팬에게 공개하기 전에 기존 XROMEDA 콘텐츠 업로드 정책에 맞춰 게시 정보를 설정한다.

### 22.2 화면명

txt
게시 정보 설정


### 22.3 입력 항목

| 항목        | 필수 여부 | 설명                        |
| --------- | ----- | ------------------------- |
| 콘텐츠 제목    | 필수    | 콘텐츠 관리 목록과 팬 플레이어에 표시될 제목 |
| 설명        | 필수    | 팬에게 보이는 설명                |
| 썸네일 이미지   | 필수    | 콘텐츠 목록에 표시될 이미지           |
| 썸네일 블러 처리 | 선택    | 기존 콘텐츠 정책 유지              |
| 공개 설정     | 필수    | 공개 / 비공개                  |
| 멤버십 설정    | 필수    | 전체 공개 / 멤버십 전용 등          |
| 오픈 알림 전송  | 선택    | 구독자 알림                    |
| 댓글 사용     | 선택    | 팬 댓글 입력 허용 여부             |

### 22.4 기본값

AI 360 콘텐츠는 제작 직후 기본적으로 비공개 상태이다.

기본값:

* 공개 설정: 비공개
* 멤버십 설정: 전체 공개
* 댓글 사용: ON
* 오픈 알림 전송: ON

### 22.5 댓글 사용 정책

댓글 사용 ON:

* 팬 플레이어에 댓글 입력창을 표시한다.
* AI 휴먼은 팬 댓글에 반응할 수 있다.
* 팬 요청 버튼도 표시한다.

댓글 사용 OFF:

* 팬 플레이어에 댓글 입력창을 표시하지 않는다.
* AI 휴먼은 팬 댓글에 반응하지 않는다.
* 팬 요청 버튼은 유지할 수 있다.

### 22.6 버튼

txt
저장
배포하기


### 22.7 배포하기 활성 조건

아래 조건을 모두 충족해야 배포하기 버튼이 활성화된다.

* 콘텐츠 제목 입력
* 설명 입력
* 썸네일 이미지 존재
* 360 공간 구성 완료
* AI 휴먼 연결 완료
* 팬 반응 세트 연결 완료
* BGM 연결 완료

### 22.8 배포 완료 처리

배포 완료 후 콘텐츠 상태를 공개로 변경한다.

공개 상태가 되면 팬 플레이어로 입장할 수 있다.

---

## 23. 콘텐츠 관리 목록 연동

### 23.1 기존 정책 유지

AI 360 콘텐츠도 기존 XROMEDA 콘텐츠 관리 목록 정책을 따른다.

### 23.2 목록 hover 정책

콘텐츠 행의 제목 영역에 hover 시 아래 아이콘을 노출한다.

* 수정
* 공유
* 더보기

### 23.3 더보기 메뉴

더보기 메뉴는 기존 정책을 유지한다.

* 상세 설정
* 공유 링크 저장
* 삭제

### 23.4 콘텐츠 유형 표시

AI 360 콘텐츠에는 콘텐츠 유형 배지를 표시한다.

txt
AI 360 콘텐츠


### 23.5 상태 표시

상태는 아래 기준으로 표시한다.

* 비공개
* 공개
* 수정 필요

MVP에서는 수동 검수 체크리스트 기반의 별도 게시 승인 화면을 제공하지 않는다.
제작 단계와 게시 정보 설정에서 자동 확인을 완료한 뒤 배포한다.

---

## 24. AI 360 콘텐츠 수정

### 24.1 화면명

txt
AI 360 콘텐츠 수정


### 24.2 진입

콘텐츠 관리 목록에서 수정 아이콘 클릭 시 별도 수정 화면으로 이동한다.

모달로 열지 않는다.

### 24.3 수정 가능 항목

* 콘텐츠 제목
* 설명
* 썸네일 이미지
* 썸네일 블러 처리
* 공개 설정
* 멤버십 설정
* 오픈 알림 전송
* 댓글 사용
* AI 360 구성 요약 확인

### 24.4 AI 360 구성 요약

예시:

txt
360 공간: 마트 주차장
AI 휴먼: 아리아
팬 반응 세트: 기본 팬 소통형
BGM: BGM_001 로파이·칠


### 24.5 AI 360 편집 이동

AI 360 구성 자체를 변경해야 하는 경우 AI 360 편집으로 이동 버튼을 제공한다.

변경 가능 항목:

* 360 공간
* 360 공간 다듬기
* AI 휴먼
* AI 휴먼 위치
* 팬 반응 세트
* BGM

### 24.6 버튼

txt
취소
수정
AI 360 편집으로 이동


---

## 25. 상세 설정 모달

### 25.1 기존 정책 유지

콘텐츠 관리 목록의 상세 설정 모달은 기존 XROMEDA 정책을 유지한다.

### 25.2 포함 항목

* 공개 설정
* 댓글 사용

### 25.3 제외 항목

AI 360 고급 설정은 상세 설정 모달에 넣지 않는다.

AI 360 구성 변경은 AI 360 편집으로 이동에서 처리한다.

---

## 26. 팬 플레이어

### 26.1 목적

팬이 AI 360 콘텐츠에 입장해 AI 휴먼과 상호작용하는 화면이다.

### 26.2 표시 요소

* 360 공간
* AI 휴먼
* AI 휴먼 말풍선
* BGM 상태
* 채팅창
* 팬 요청 버튼

### 26.3 AI 휴먼 표시

AI 휴먼은 실제 사람형 또는 버튜버형 이미지로 표시한다.

팬 플레이어에는 디버그성 정보를 노출하지 않는다.

노출하지 않는 정보:

* 외부 연결 상태
* 내부 식별자
* 검수 상태
* 위치 조정 가이드
* 테스트 라벨

### 26.4 팬 요청 버튼

팬 플레이어에는 선택된 팬 반응 세트에 맞는 기본 요청 버튼을 표시한다.

예시:

* 하트해줘
* 인사해줘
* 춤춰줘
* 응원해줘

요청 버튼 클릭 시:

1. 팬 요청이 채팅 또는 액션 로그에 반영된다.
2. AI 휴먼 말풍선이 표시된다.
3. 필요한 경우 간단한 리액션 상태가 표시된다.

### 26.5 댓글 입력 동작

사용자가 댓글을 입력하면:

1. 채팅 목록에 댓글이 표시된다.
2. 시스템이 댓글을 필터링한다.
3. 응답 가능한 댓글이면 AI 휴먼이 반응한다.
4. 응답 제한 대상이면 AI 휴먼이 응답하지 않는다.

예시:

팬 댓글:

txt
안녕


AI 반응:

txt
안녕하세요! 오늘도 와줘서 고마워요.


팬 댓글:

txt
하트해줘


AI 반응:

txt
하트 보내드릴게요!


---

## 27. 팬 플레이어 채팅 안내

### 27.1 노출 방식

채팅 안내 문구는 고정 공지로 크게 노출하지 않는다.

권장 방식:

* 팬 플레이어 최초 입장 시 채팅창 상단에 1회 표시
* 닫을 수 있는 작은 안내 형태
* 이후에는 정보 아이콘 또는 도움말에서 확인 가능

### 27.2 안내 문구

txt
모두가 편안하게 대화할 수 있도록 부적절한 닉네임과 댓글은 자동으로 필터링되며, AI 휴먼이 응답하지 않을 수 있습니다.


---

## 28. 입장 닉네임 호명 정책

### 28.1 기본 원칙

AI 휴먼은 팬이 입장하면 닉네임을 읽고 환영할 수 있다.

단, 모든 입장자를 즉시 개별 호명하지 않는다.

목표:

* 팬이 입장 인지를 받았다고 느끼게 한다.
* AI 휴먼의 대화 흐름을 방해하지 않는다.
* 동시 입장과 반복 입장 상황을 안정적으로 처리한다.

### 28.2 1명 입장

입장자가 1명일 경우 바로 인사한다.

예시:

txt
지윤님 어서오세요! 오늘도 와줘서 고마워요.


### 28.3 2명 이내 동시 입장

3초 이내 입장한 팬이 2명 이하일 경우 닉네임을 모두 읽는다.

예시:

txt
지윤님, 민수님 어서오세요!


### 28.4 3명 이상 동시 입장

3초 이내 입장자가 3명 이상이면 최대 2명까지만 읽고 나머지는 묶어서 처리한다.

예시:

txt
지윤님, 민수님 그리고 새로 들어오신 팬분들 어서오세요!


### 28.5 연속 입장 처리

* 입장 이벤트는 3초 단위로 묶음 처리한다.
* 입장 인사 후 최소 15초 쿨다운을 둔다.
* 1분 동안 입장 인사는 최대 3회까지만 수행한다.
* 쿨다운 중 들어온 팬은 다음 묶음 인사로 처리한다.

### 28.6 동일 사용자 재입장

동일 사용자가 10분 이내 재입장한 경우 닉네임을 다시 읽지 않는다.

### 28.7 부적절한 닉네임

아래 닉네임은 음성으로 읽지 않는다.

* 욕설
* 성적 표현
* 혐오 표현
* 타인 비하
* 운영자 사칭
* 과도하게 긴 닉네임
* 이모지 또는 특수문자만 있는 닉네임

대체 문구:

txt
새로 들어오신 팬분 어서오세요!


### 28.8 응답 우선순위

AI 휴먼의 응답 우선순위는 아래와 같다.

1. 현재 말하고 있는 문장 완료
2. 팬 댓글 반응
3. 팬 요청 버튼 반응
4. 입장 인사
5. 기본 대기 멘트

입장 인사는 현재 응답을 끊고 실행하지 않는다.

---

## 29. 외부 연동 기준

### 29.1 AI 휴먼 제작 연동

AI 휴먼 제작은 외부 제작 시스템과 비동기로 연동될 수 있다.

필요 기능:

* 이미지 기반 AI 휴먼 제작 요청
* 페르소나 생성 요청
* 목소리 매핑
* 제작 상태 조회
* 제작 완료 알림
* 제작 실패 알림

### 29.2 360 공간 다듬기 연동

360 공간 다듬기 기능은 AI 이미지 수정 기능과 연동한다.

필요 기능:

* 원본 360 이미지 전달
* 사용자 요청 문구 전달
* 수정 결과 이미지 수신
* 실패 사유 수신
* 결과 이미지 품질 확인

### 29.3 AI 응답 연동

팬 댓글 반응은 선택된 AI 서비스에 따라 처리한다.

지원:

* ChatGPT
* Gemini

AI 응답은 반드시 아래 기준을 통과해야 한다.

* AI 휴먼 대화 설정
* 응답 제한 주제
* 댓글 필터링
* 안전 필터

---

## 30. 실패 및 예외 처리

### 30.1 AI 휴먼 제작 실패

안내 문구:

txt
AI 휴먼 제작에 실패했습니다. 이미지를 다시 확인하거나 잠시 후 다시 시도해 주세요.


처리:

* 상태를 제작 실패로 표시한다.
* AI 360 제작에서 선택할 수 없다.
* 사용자는 다시 제작 요청할 수 있다.

### 30.2 360 공간 다듬기 실패

안내 문구:

txt
360 공간 다듬기 결과를 사용할 수 없습니다. 요청 문구를 줄이거나 다시 시도해 주세요.


처리:

* 다음 단계 이동을 막는다.
* 기존 360 공간은 유지한다.
* 사용자는 다시 시도하거나 수정 없이 다음 단계로 이동할 수 있다.

### 30.3 AI 휴먼 연결 실패

안내 문구:

txt
AI 휴먼 연결에 실패했습니다. 다른 AI 휴먼을 선택하거나 다시 시도해 주세요.


처리:

* 최종 미리보기로 이동하지 않는다.
* AI 휴먼 선택 단계로 돌아갈 수 있다.

### 30.4 BGM 연결 실패

안내 문구:

txt
BGM 연결에 실패했습니다. 다른 BGM을 선택해 주세요.


처리:

* 최종 미리보기로 이동하지 않는다.
* 다른 BGM 선택을 유도한다.

### 30.5 팬 반응 세트 연결 실패

안내 문구:

txt
팬 반응 세트 연결에 실패했습니다. 다른 팬 반응 세트를 선택해 주세요.


처리:

* 최종 미리보기로 이동하지 않는다.
* 다른 팬 반응 세트 선택을 유도한다.

### 30.6 댓글 필터링

부적절한 댓글은 필터링 처리한다.

정책:

* 채팅창에 표시하지 않거나 대체 표시한다.
* AI 휴먼은 해당 댓글에 응답하지 않는다.
* 반복 입력 시 추가 제한 처리를 할 수 있다.

---

## 31. MVP 제외 범위

아래 기능은 MVP에서 제외한다.

* 팬 반응 세트의 세부 문장 직접 편집
* 사용자 커스텀 팬 반응 세트 생성
* AI 휴먼 삭제
* 수동 검수 체크리스트 화면
* 수동 동작 테스트 버튼
* 팬 플레이어 내 디버그 정보 노출
* 제작 중인 AI 휴먼의 AI 360 제작 선택
* 360 공간 설정 내 댓글 사용 토글
* 상세 설정 모달 내 AI 360 고급 설정
* 실시간 다중 팬 대화 고도화
* 포인트, 리워드, 정산형 미니게임
* 팬별 개인화 대화 기록 고도화

---

## 32. 최종 사용자 플로우

### 32.1 AI 휴먼 등록

1. 채널설정 진입
2. AI 휴먼 관리 탭 클릭
3. 새 AI 휴먼 만들기 클릭
4. 이미지 업로드 또는 샘플 이미지 적용
5. 표시 유형 선택
6. 기본 정보 입력
7. 대화 설정 입력
8. 권리 확인 체크
9. AI 휴먼 제작 요청
10. AI 휴먼 관리 목록으로 이동
11. 상태 제작 중 표시
12. 제작 완료 후 사용 가능 표시

### 32.2 AI 360 콘텐츠 생성

1. 콘텐츠 관리 진입
2. + 업로드 클릭
3. AI 360 팬 공간 만들기 선택
4. 360 공간 선택
5. 필요 시 360 공간 다듬기
6. AI 휴먼 선택
7. 360 공간 설정
8. 최종 미리보기 확인
9. 게시 정보 설정
10. 배포

### 32.3 팬 플레이어 이용

1. 팬이 공개된 AI 360 콘텐츠에 입장
2. AI 휴먼이 입장 인사
3. 팬이 댓글 입력
4. AI 휴먼이 댓글에 반응
5. 팬이 요청 버튼 클릭
6. AI 휴먼이 요청에 반응

---

## 33. 핵심 개발 원칙

1. 기존 XROMEDA 콘텐츠 관리 정책을 우선한다.
2. AI 360 기능은 기존 업로드, 수정, 게시 흐름에 자연스럽게 추가한다.
3. AI 휴먼 제작은 채널설정에서만 진행한다.
4. AI 360 제작에서는 사용 가능한 AI 휴먼을 선택만 한다.
5. 사용자 화면에는 기술 식별자를 주요 정보로 노출하지 않는다.
6. 모든 버튼과 아이콘은 실제 동작해야 한다.
7. 동작하지 않는 버튼은 제거하거나 비활성 사유를 표시한다.
8. MVP에서는 자동 확인과 명확한 실패 처리를 우선한다.
9. 팬 플레이어에는 내부 검수 정보나 디버그 정보를 노출하지 않는다.
10. 팬 경험은 “AI 휴먼이 360 공간 안에서 실제로 반응한다”는 느낌을 주는 데 집중한다.

위에 코드는 AI 360 콘텐츠 제작 플랫폼 프로토타입으로 실제 적용해야하는 엑스로메다 기존 기능을 기반으로 사업계획서에 있는 최소 기능 조건을 기반으로 작업되었어
그 아래 PRD는 1차 프로토타입 및 정책 정의를 기반으로 작성되었고
그래서 최종적으로 프론트, 백엔드 개발자가 해당 기능 개발을 위해 필요한 PRD 최종본을 작성하려고 함
개발자는 코덱스 또는 클로드 코드, 커서 등을 사용해서 AI로 구조를 만들고 PRD를 통해 개발을 진행하려고 함
즉 AI 에이전트가 요구사항을 100% 이해하고 100% 똑같이 달성하기 위한 PRD이어야 함
코드를 보면 UI CSS 등이 기존 엑스로메다를 기반으로 하고 컬러 등도 기존 엑스로메다 컬러, 팝업 등에 규칙을 따라야 함
또한 PRD 작성할 때, 기능 개발을 위한 최종 내용만 들어가야함, 내가 요청한 사항을 기록하거나 히스토리가 있으면 안됨
그리고 각 기능 클릭시 동작 정의, 기능 설명, 성공, 실패 케이스에 따른 분기, 각 기능에 호출해야 하는 API, AI 버전(공간 다듬기 클릭시에 어떤 AI 사용해서 이미지를 다듬어줄지 등)등을 표기, 예외 케이스에 대한 정의 등 상세하게 작성되어야 개발시에 이슈 없도록


<PRD 작성시 참고할 내용>
1. PRD(Product Requirements Document) 작성
"우리가 만들 제품이 무엇이고, 
왜 만들고, 어떤 기능이 필요하며, 
사용자는 어떻게 사용할 것인가?"를 정리한 PRD 작성하기

예)
프로젝트: 워킹홀리데이 맞춤 실전 영어 앱

목적: 실제 현지에서 쓰는 영어 학습

타겟: 워홀 준비생

기능:
바리스타 영어
리테일 영어
생존 영어
상황별 회화

UI/UX:
가로 스크롤 카드 리스트 UI
카드 탭하면 [리스닝 훈련] 화면으로 진입

2. AI로 PRD 구조화
작성한 PRD를 Gemini, Claude로
내용 정리 또는 디벨롭하기

3. 피그마에서 와이어 프레임 제작
화면 구조, 정보 배치, 사용자 플로우 등의 초안 만들기

4. 클로드 디자인으로 하이파이 프로토타입 생성
PRD와 와이어 프레임을 클로드 코드에 넣고
클로드와 대화하면서 디자인 방향을 구체화하기

세부 내용이 부족해도
클로드가 내부 콘텐츠를 상상해서
필요한 화면 내용, 섹션 구조를 알아서 구현해 줌

5. 최종 UI 결정 및 편집
클로드가 만든 여러 시안을 보고 최종 결정한 후,
피그마에서 디테일을 수정하고 플로우 차트 작성하기

스크린샷 2026-06-15 오전 9.55.02.png
스크린샷 2026-06-15 오전 9.56.46.png
스크린샷 2026-06-15 오전 9.56.40.png
스크린샷 2026-06-15 오전 9.56.36.png
스크린샷 2026-06-15 오전 9.56.28.png
스크린샷 2026-06-15 오전 9.56.22.png
스크린샷 2026-06-15 오전 9.56.17.png
스크린샷 2026-06-15 오전 9.56.11.png
스크린샷 2026-06-15 오전 9.55.35.png
스크린샷 2026-06-15 오전 9.55.24.png
스크린샷 2026-06-15 오전 9.55.18.png
스크린샷 2026-06-15 오전 9.55.11.png
프로토타입으로 만든 UI 및 프로세스와 지금 .md로 만들어준걸로 만든 프로토타입이랑 여전히 달라

12s 동안 생각함
완료했습니다.

개별 파일:

xromeda_ai360_fan_interaction_prd.md

xromeda_ai360_prototype_ui_spec.md

xromeda_ai360_implementation_guide.md

한 번에 다운로드:

xromeda_ai360_final_md.zip 


파일 업로드됨
파일 업로드됨
첨부한 prd 2개 내용이 다른지 확인해줘, 어떤걸 공유하면 좋을지

16s 동안 생각함
네, 2개 PRD는 내용이 꽤 다릅니다.
공유용으로는 첫 번째 PRD, 즉 문서 목적으로 시작하는 버전을 공유하는 게 더 좋습니다. 


결론
공유 추천 파일: 첫 번째 PRD

이유는 첫 번째 PRD가 지금 의도에 더 맞습니다.

xromeda_ai360_prototype_ui_spec.md, xromeda_ai360_implementation_guide.md의 상위 정책 기준 문서라고 명확히 되어 있음. 


백엔드 데이터 모델과 API 명세는 별도 문서로 분리한다고 명시되어 있어 개발자에게 범위가 명확함. 


특정 AI 엔진명이나 코드 생성 도구명을 사용자 화면에 노출하지 않는 방향으로 정리되어 있음. 


PRD는 정책 중심, UI 명세와 구현 가이드는 별도 문서로 나누는 구조라 Claude Code 작업용 기준 문서로 더 적합함.

두 파일 차이
구분	첫 번째 PRD	두 번째 PRD
문서 성격	상위 정책 기준 문서	상세 기능/화면 정의가 섞인 PRD
구조	PRD / UI 명세 / 구현 가이드 분리 전제	PRD 안에 UI·동작·기술 내용이 많이 포함
공유 적합성	높음	내부 참고용에 가까움
AI 엔진명	제거/완화됨	AI 응답 엔진, AI 모델/파이프라인, KleverOne, LLaMON RAG, Link Music 등 기술명이 남아 있음
개발자 전달용	기준 문서로 적합	구현 시 오해 가능성 있음
프로토타입 재현성	단독으로는 약함. UI 명세/구현 가이드와 함께 써야 함	상세해서 재현성은 높지만 정책/기술/화면이 섞임
공유 방식 추천
개발자/디자이너에게는 이렇게 공유하는 게 좋습니다.

1. xromeda_ai360_fan_interaction_prd.md
   - 최상위 정책 기준 문서

2. xromeda_ai360_prototype_ui_spec.md
   - 현재 프로토타입 UI 구조와 화면 흐름 기준 문서

3. xromeda_ai360_implementation_guide.md
   - Claude Code 작업 시 구현 상태, 상태값, 예외 처리 기준 문서
즉, 첫 번째 PRD만 단독 공유하지 말고 3개 파일을 세트로 공유하는 게 맞습니다.

두 번째 PRD는 내용이 더 풍부하긴 하지만, 지금 기준에서는 이전 6/12 PRD 원본/내부 참고용으로 두고 외부 공유나 개발 착수 기준 문서로는 쓰지 않는 게 좋습니다.


출처

1. xromeda_ai360_fan_interaction_prd.md
   - 최상위 정책 기준 문서
2. xromeda_ai360_prototype_ui_spec.md
   - 현재 프로토타입 UI 구조와 화면 흐름 기준 문서
3. xromeda_ai360_implementation_guide.md
   - 구현 상태, 상태값, 예외 처리 기준 문서 -> 이렇게 해도 괜찮을까? 클로드 코드 작업시라는 말 안쓰려고

6s 동안 생각함
네, 그렇게 하는 게 더 좋습니다.
클로드 코드 작업 시라는 표현은 빼는 게 맞고, 특정 도구 종속 없이 개발/구현 기준 문서처럼 보이게 정리하는 게 안전합니다.

다만 3번의 구현 상태는 약간 현재 작업 현황처럼 보일 수 있어서, 아래처럼 바꾸는 걸 추천합니다.

xromeda_ai360_fan_interaction_prd.md

최상위 정책 기준 문서

xromeda_ai360_prototype_ui_spec.md

현재 프로토타입 UI 구조와 화면 흐름 기준 문서

xromeda_ai360_implementation_guide.md

구현 기준, 상태값, 단계 이동 조건, 예외 처리 기준 문서

이 표현이 가장 깔끔합니다.
특정 AI 도구명 없이도 개발자에게 “이 3개 파일을 기준으로 구현하면 된다”는 의미가 명확합니다.

## 추출해야 할 핵심 항목

- RFP/사업계획서 기반 원 요구사항
- 기존 서비스 UI 캡처에 반영할 변경사항
- 필수 요구사항
- 선택/후순위 요구사항
- MVP 기준 1차 기능 리스트
- 정책/운영 기준
- IA
- 기능정의서
- PRD
- 프로토타입/HTML 관련 내용
- 최종 개발 전달 패키지 기준

## Claude Code 참고 지시

이 문서를 읽고 July Canvas의 프로젝트 활성화/AI 분석/프로토타입/문서 역작성 플로우 설계에 반영하세요.  
단, 원문 대화가 비어 있으면 링크만 보고 추측하지 말고 `원문 MD 내용 필요`라고 보고하세요.
