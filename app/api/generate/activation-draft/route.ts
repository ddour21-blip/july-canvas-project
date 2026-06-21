// 아이디어 기반 활성화 초안 생성 엔드포인트 (서버 전용).
// AI 실행은 getAiProvider()를 통해서만 시도한다(AI_PROVIDER 분기).
// - disabled(Vercel 기본): AI 실행 없이 템플릿 초안만 반환 — ANTHROPIC_API_KEY 미접근.
// - local-cli: 추후 `claude -p` 연동. 현 단계 미연동이라 템플릿으로 폴백.
// - api: 스텁(미구현) → 폴백.
// Firestore에 직접 쓰지 않음 — 클라이언트가 기존 권한 흐름으로 저장한다.
import { templateActivationDraft } from '@/lib/aiGeneration';
import { getAiProvider } from '@/lib/ai/provider';
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

  const genInput = { idea, currentFields: body.currentFields, projectName: body.projectName };

  const provider = getAiProvider();
  if (provider.enabled) {
    // 실행 가능한 provider(예: local-cli)일 때만 시도. 실패/미연동이면 템플릿 폴백.
    const run = await provider
      .run({ task: 'activation-draft', payload: genInput })
      .catch((err) => {
        console.error('[ai] provider run error, template fallback:', err);
        return null;
      });
    if (run?.ok && run.text) {
      // 다음 단계: run.text(JSON)를 { fields, documents }로 파싱해 반환.
      // 현 단계 provider는 ok를 반환하지 않으므로 아래 템플릿 폴백으로 내려간다.
    }
  }

  // disabled 및 현 단계 local-cli/api(미연동): 템플릿 초안 반환. (ANTHROPIC_API_KEY 미접근)
  return Response.json(templateActivationDraft(genInput));
}
