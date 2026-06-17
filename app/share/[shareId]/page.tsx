// public_readonly 공유 뷰어 페이지 (비로그인 외부 사용자용) — S7-2B-3
//
// 이 페이지는 로그인/Firebase client를 일절 사용하지 않는다. 데이터는 클라이언트 컴포넌트
// ShareViewer가 오직 GET /api/share/{shareId} (서버 매개) 만 호출해서 가져온다.
// Firestore Rules / public read는 변경하지 않는다.
import type { Metadata } from 'next';
import ShareViewer from '@/components/share/ShareViewer';

// 공유 토큰 링크는 색인 대상이 아니다(검색엔진 노출 방지).
export const metadata: Metadata = {
  title: '공유 보기 · July Canvas',
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <ShareViewer shareId={shareId} />;
}
