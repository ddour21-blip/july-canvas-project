// 로컬 Claude CLI 기반 activationAnalysis(v2) 초안 생성 엔드포인트 (서버 전용).
// - provider disabled(Vercel 기본): AI 실행 없이 { ok:false, reason:'AI_DISABLED' } 반환. CLI/키 미접근.
// - local-cli(로컬): `claude -p`로 분석 JSON 생성 → 파싱해 반환.
// Firestore 저장/문서 생성/ANTHROPIC_API_KEY 사용 없음 — 클라이언트가 기존 권한 흐름으로 저장한다.
import { getAiProvider } from '@/lib/ai/provider';
import { buildActivationAnalysisPrompt } from '@/lib/ai/prompts/activationAnalysis';
import { extractJsonObject } from '@/lib/ai/parseJson';
import type { ActivationAnalysis, ProjectActivation } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalysisRequestBody {
  mode?: ActivationAnalysis['mode'];
  idea?: string;
  projectName?: string;
  currentFields?: Partial<ProjectActivation>;
  sources?: { sourceId: string; label: string; purpose?: string }[];
  currentAnalysis?: Partial<ActivationAnalysis> | null;
}

export async function POST(request: Request) {
  let body: AnalysisRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: 'BAD_REQUEST' }, { status: 400 });
  }

  // Production/Vercel: AI_PROVIDER 미설정 → disabled → 여기서 즉시 종료(CLI/키 미접근).
  const provider = getAiProvider();
  if (!provider.enabled) {
    return Response.json({ ok: false, reason: 'AI_DISABLED' });
  }

  const prompt = buildActivationAnalysisPrompt({
    mode: body.mode === 'requirements' ? 'requirements' : 'idea',
    idea: (body.idea ?? '').toString(),
    projectName: body.projectName,
    currentFields: body.currentFields,
    sources: Array.isArray(body.sources) ? body.sources : [],
    currentAnalysis: body.currentAnalysis ?? null,
  });

  const run = await provider.run({ task: 'activation-analysis', prompt }).catch((err) => {
    console.error('[ai] activation-analysis run error:', err);
    return null;
  });

  if (!run) return Response.json({ ok: false, reason: 'CLI_ERROR' });
  if (!run.ok || !run.text) return Response.json({ ok: false, reason: run.reason ?? 'CLI_ERROR' });

  // CLI stdout에서 JSON 추출. 파싱 실패 시 PARSE_ERROR. (클라이언트가 sanitize로 최종 정규화)
  try {
    const parsed = extractJsonObject(run.text);
    // route 응답에서도 v2 구조임을 명시(curl 직접 호출 정합성). 모델이 누락해도 보정.
    const analysis =
      parsed && typeof parsed === 'object'
        ? { ...(parsed as Record<string, unknown>), schemaVersion: 2 }
        : parsed;
    return Response.json({ ok: true, source: 'ai', analysis });
  } catch (err) {
    console.error('[ai] activation-analysis parse error:', err);
    return Response.json({ ok: false, reason: 'PARSE_ERROR' });
  }
}
