/* July Canvas UI kit — sample data (fake, for the interactive recreation). */
window.JCData = (function () {
  const members = [
    { name: '김유나', email: 'yuna@julycanvas.io', role: 'owner' },
    { name: '이준호', email: 'junho@julycanvas.io', role: 'editor' },
    { name: '박지민', email: 'jimin@julycanvas.io', role: 'editor' },
    { name: '최서연', email: 'seoyeon@julycanvas.io', role: 'viewer' },
  ];

  const org = { name: 'July Canvas', plan: '조직 워크스페이스', code: 'jc-team' };

  const projects = [
    {
      id: 'kake',
      name: 'kake',
      status: 'active',
      desc: 'kake 서비스 관리자 콘솔의 프로토타입입니다.',
      screens: 5,
      docs: 6,
      members: 4,
      updated: '방금 전',
      activation: {
        intent: '강사와 수강생을 잇는 365일 커리큘럼 운영 콘솔을 만든다.',
        problem: '클래스·스테이지·멤버십이 흩어져 있어 운영자가 현황을 한눈에 못 본다.',
        customer: '온라인 클래스 운영자 / 콘텐츠 관리자',
        value: 'Day 1~365 커리큘럼을 한 화면에서 매핑·관리',
        differentiator: '기획 정책과 프로토타입이 같은 캔버스에서 연결됨',
        revenue: 'FREE(TRIAL) → PREMIUM 구독 전환',
        market: '국내 온라인 클래스 플랫폼',
        mvpScope: '365 클래스 맵 · 스테이지 관리 · 수강생 관리',
        laterScope: '결제·정산 대시보드, 멤버십 자동화',
        references: 'kake.com, 클래스101',
      },
    },
    { id: 'shop', name: '쇼핑몰 앱 리뉴얼', status: 'review', desc: '커머스 앱 메인·검색·결제 흐름 재설계.', screens: 3, docs: 4, members: 3, updated: '2시간 전' },
    { id: 'fin', name: '핀테크 온보딩', status: 'approved', desc: '신규 가입 KYC 및 계좌개설 온보딩.', screens: 8, docs: 6, members: 5, updated: '어제' },
    { id: 'edu', name: '에듀테크 LMS', status: 'draft', desc: '아직 활성화되지 않은 프로젝트입니다.', screens: 0, docs: 0, members: 2, updated: '3일 전' },
    { id: 'hr', name: '사내 HR 포털', status: 'archived', desc: '구성원 온보딩/근태 관리 포털 (보관됨).', screens: 6, docs: 5, members: 4, updated: '2주 전' },
  ];

  const documents = [
    { type: 'brief', title: '프로젝트 브리프', file: 'PROJECT_BRIEF.md', order: 1, status: 'approved', version: '1.2' },
    { type: 'market_research', title: '시장조사', file: 'MARKET_RESEARCH.md', order: 2, status: 'approved', version: '1.1' },
    { type: 'product_strategy', title: '제품화전략', file: 'PRODUCT_STRATEGY.md', order: 3, status: 'review', version: '1.0' },
    { type: 'ia', title: 'IA (정보구조)', file: 'IA.md', order: 4, status: 'review', version: '1.0' },
    { type: 'feature_spec', title: '기능정의서', file: 'FEATURE_SPEC.md', order: 5, status: 'draft', version: '0.3' },
    { type: 'prd', title: 'PRD', file: 'PRD.md', order: 6, status: 'draft', version: '0.1', locked: false },
  ];

  // Deliverables (산출물) — downloadable outputs
  const deliverables = [
    { title: 'PRD', file: 'PRD.md', kind: 'MD', status: 'draft', size: '24 KB' },
    { title: '기능정의서', file: 'FEATURE_SPEC.pptx', kind: 'PPTX', status: 'draft', size: '1.8 MB' },
    { title: '제품화전략', file: 'PRODUCT_STRATEGY.pdf', kind: 'PDF', status: 'review', size: '420 KB' },
    { title: '시장조사', file: 'MARKET_RESEARCH.md', kind: 'MD', status: 'approved', size: '18 KB' },
  ];

  const activity = [
    { who: '이준호', what: '제품화전략 문서를 리뷰 요청했습니다.', when: '10분 전', icon: 'file-text' },
    { who: '박지민', what: '365 클래스 맵 정책에 댓글을 남겼습니다.', when: '32분 전', icon: 'message-circle' },
    { who: '김유나', what: '시장조사 문서를 승인했습니다.', when: '1시간 전', icon: 'check-circle-2' },
    { who: '최서연', what: '쇼핑몰 앱 리뉴얼 프로젝트에 참여했습니다.', when: '어제', icon: 'user-plus' },
  ];

  const notifications = [
    { who: '박지민', text: '@김유나 멤버십 배지 색상 정책 확인 부탁드려요.', when: '오전 10:45', unread: true },
    { who: '이준호', text: '제품화전략 v1.0 리뷰가 요청되었습니다.', when: '오전 9:30', unread: true },
    { who: '시스템', text: 'PRD.md 자동 생성이 완료되었습니다.', when: '어제', unread: false },
  ];

  // KAKE admin "365 클래스 맵" demo rows (the embedded prototype)
  const classRows = [
    { day: 'D-1', topic: '오리엔테이션: 나의 목표 설정하기', genre: '공통', lessons: '5개', tier: 'FREE (TRIAL)', visible: true },
    { day: 'D-2', topic: '호흡의 기초: 복식호흡 이해하기', genre: 'VOCAL', lessons: '0개', tier: 'FREE (TRIAL)', visible: true },
    { day: 'D-3', topic: '리듬 트레이닝: 바운스 기초', genre: 'DANCE', lessons: '0개', tier: 'FREE (TRIAL)', visible: true },
    { day: 'D-4', topic: '스케일 연습 1: 5톤 스케일', genre: 'VOCAL', lessons: '0개', tier: 'PREMIUM', visible: true },
    { day: 'D-5', topic: '스텝 베이직: 투스텝 & 크로스', genre: 'DANCE', lessons: '0개', tier: 'PREMIUM', visible: false },
  ];

  const screens = [
    { id: 's-map', name: '365 클래스 맵', annotations: 1 },
    { id: 's-login', name: '관리자 로그인', annotations: 0 },
    { id: 's-stage', name: '스테이지 (허들) 관리', annotations: 0 },
    { id: 's-users', name: '수강생 관리', annotations: 0 },
    { id: 's-main', name: '메인', annotations: 0 },
  ];

  const annotation = {
    number: 1,
    version: '1.0',
    title: '콘텐츠 관리 영역',
    body: ['[기능 정의]', '[동작]', '[정책]', '[예외 사항]'],
    comments: [
      { author: '김유나', time: '오전 10:45', text: '멤버십 상태가 PREMIUM일 때 배지 색상을 더 강조하면 좋을 것 같아요.' },
      { author: '이준호', time: '오전 10:48', text: '좋은 의견입니다! 그린 톤을 조금 더 진하게 변경하겠습니다.' },
    ],
  };

  return { members, org, projects, documents, deliverables, activity, notifications, classRows, screens, annotation };
})();
