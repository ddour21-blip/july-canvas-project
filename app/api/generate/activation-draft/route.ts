// 아이디어 기반 활성화 초안 생성 엔드포인트 (서버 전용).
// ANTHROPIC_API_KEY가 있으면 Claude로 생성, 없거나 실패하면 템플릿으로 graceful fallback.
// Firestore에 직접 쓰지 않음 — 클라이언트가 기존 권한 흐름으로 저장한다.
import { generateActivationDraft } from '@/lib/aiGeneration';
import type { ProjectActivation } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { idea?: string; currentFields?: Partial<ProjectActivation>; projectName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const idea = (body.idea ?? '').toString();
  if (!idea.trim()) {
    return Response.json({ ok: false, error: 'idea is required' }, { status: 400 });
  }

  const result = await generateActivationDraft({
    idea,
    currentFields: body.currentFields,
    projectName: body.projectName,
  });

  return Response.json(result);
}
