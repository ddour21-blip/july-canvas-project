// 로컬 Claude CLI 기반 클릭형 HTML 프로토타입 생성 엔드포인트 (서버 전용).
// - provider disabled(Vercel 기본): { ok:false, reason:'AI_DISABLED' }. CLI/키 미접근.
// - local-cli(로컬): `claude -p`로 self-contained HTML 생성 → 파싱해 반환.
// Firestore 저장/문서 생성/ANTHROPIC_API_KEY 사용 없음 — 클라이언트가 확정 시 기존 권한 흐름으로 저장한다.
import { getAiProvider } from '@/lib/ai/provider';
import { buildPrototypePrompt } from '@/lib/ai/prompts/prototype';
import { extractJsonObject } from '@/lib/ai/parseJson';
import { buildPrototypeHtmlFromSpec, normalizePrototypeSpec } from '@/lib/ai/prototypeHtmlTemplate';
import type { ActivationAnalysis } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PrototypeRequestBody {
  projectName?: string;
  activationAnalysis?: Partial<ActivationAnalysis> | null;
  documents?: { brief?: string; marketResearch?: string; productStrategy?: string };
}

export async function POST(request: Request) {
  let body: PrototypeRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: 'BAD_REQUEST', message: '요청 본문(JSON)이 올바르지 않습니다.' }, { status: 400 });
  }

  // Production/Vercel: AI_PROVIDER 미설정 → disabled → 즉시 종료(CLI/키 미접근).
  const provider = getAiProvider();
  if (!provider.enabled) {
    return Response.json({ ok: false, reason: 'AI_DISABLED', message: '로컬 AI provider가 비활성 상태입니다.' });
  }

  const prompt = buildPrototypePrompt({
    projectName: body.projectName,
    activationAnalysis: body.activationAnalysis ?? null,
    documents: body.documents,
  });

  // prototype 생성 timeout(localCliProvider와 동일하게 300초). 실패가 이 시간 근처면 타임아웃으로 분류.
  const PROTOTYPE_TIMEOUT_MS = 300_000;
  const startedAt = Date.now();
  const run = await provider.run({ task: 'prototype', prompt }).catch((err) => {
    console.error('[ai] prototype run error:', err);
    return null;
  });
  const elapsedMs = Date.now() - startedAt;

  // provider 실패 정규화: AI_DISABLED만 그대로, 타임아웃 추정 시 TIMEOUT, 나머지는 CLI_ERROR.
  // (provider result의 reason 타입은 'TIMEOUT'을 담지 못하므로 route에서 경과 시간으로 구분한다.)
  // stderr 전체/민감 정보는 노출하지 않고 짧은 안내 message만 내려준다.
  if (!run || !run.ok || !run.text) {
    if (run?.reason === 'AI_DISABLED') {
      return Response.json({ ok: false, reason: 'AI_DISABLED', message: '로컬 AI provider가 비활성 상태입니다.' });
    }
    if (elapsedMs >= PROTOTYPE_TIMEOUT_MS - 5_000) {
      return Response.json({ ok: false, reason: 'TIMEOUT', message: '프로토타입 생성 시간이 초과되었습니다.' });
    }
    return Response.json({
      ok: false,
      reason: 'CLI_ERROR',
      message: 'Claude CLI 실행에 실패했습니다. 로그인 상태/실행 시간을 확인해주세요.',
    });
  }

  // CLI stdout에서 PrototypeSpec(JSON) 추출 → 정규화 → 코드가 self-contained HTML로 변환.
  // (Claude는 HTML을 만들지 않는다. UI 호환을 위해 응답은 { title, description, html } 형태로 유지.)
  try {
    const parsed = extractJsonObject(run.text);
    const spec = normalizePrototypeSpec(parsed);
    if (!spec) {
      return Response.json({ ok: false, reason: 'PARSE_ERROR', message: 'AI 응답에서 화면 구조를 해석하지 못했습니다.' });
    }
    const html = buildPrototypeHtmlFromSpec(spec);
    return Response.json({
      ok: true,
      prototype: { title: spec.title, description: spec.description, html },
    });
  } catch (err) {
    console.error('[ai] prototype parse error:', err);
    return Response.json({ ok: false, reason: 'PARSE_ERROR', message: 'AI 응답을 JSON으로 파싱하지 못했습니다.' });
  }
}
