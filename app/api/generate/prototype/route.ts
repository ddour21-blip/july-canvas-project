// 로컬 Claude CLI 기반 클릭형 HTML 프로토타입 생성 엔드포인트 (서버 전용, background job + polling).
// - POST: provider enabled면 job 생성 후 즉시 { ok, jobId, status:'running' } 반환, 백그라운드로 생성 진행.
// - GET ?jobId=: job 상태(running/done/error) 조회. done이면 prototype 반환.
// - provider disabled(Vercel 기본): job 생성 없이 { ok:false, reason:'AI_DISABLED' }. CLI/키 미접근.
// Firestore 저장/문서 생성/screen 저장/ANTHROPIC_API_KEY 사용 없음 — 확정은 클라이언트가 별도로 수행.
import { getAiProvider } from '@/lib/ai/provider';
import { buildPrototypePrompt, type PrototypeMode } from '@/lib/ai/prompts/prototype';
import { extractJsonObject } from '@/lib/ai/parseJson';
import { buildPrototypeHtmlFromSpec, normalizePrototypeSpec } from '@/lib/ai/prototypeHtmlTemplate';
import {
  createPrototypeJob,
  getPrototypeJob,
  setPrototypeJobDone,
  setPrototypeJobError,
} from '@/lib/ai/prototypeJobStore';
import type { ActivationAnalysis } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROTOTYPE_TIMEOUT_MS = 300_000;

interface PrototypeRequestBody {
  projectId?: string;
  projectName?: string;
  activationAnalysis?: Partial<ActivationAnalysis> | null;
  documents?: { brief?: string; marketResearch?: string; productStrategy?: string };
  prototypeMode?: PrototypeMode;
  referenceUrls?: string[];
  designNotes?: string;
}

// 백그라운드 실행: Claude CLI → PrototypeSpec → HTML. 결과를 job store에 기록(요청 응답과 분리).
async function runPrototypeJob(jobId: string, body: PrototypeRequestBody): Promise<void> {
  const provider = getAiProvider();
  const prompt = buildPrototypePrompt({
    projectName: body.projectName,
    activationAnalysis: body.activationAnalysis ?? null,
    documents: body.documents,
    prototypeMode: body.prototypeMode,
    referenceUrls: body.referenceUrls,
    designNotes: body.designNotes,
  });

  const startedAt = Date.now();
  const run = await provider.run({ task: 'prototype', prompt }).catch((err) => {
    console.error('[ai] prototype job run error:', err);
    return null;
  });
  const elapsedMs = Date.now() - startedAt;

  if (!run || !run.ok || !run.text) {
    if (run?.reason === 'AI_DISABLED') {
      setPrototypeJobError(jobId, 'AI_DISABLED', '로컬 AI provider가 비활성 상태입니다.');
    } else if (elapsedMs >= PROTOTYPE_TIMEOUT_MS - 5_000) {
      setPrototypeJobError(jobId, 'TIMEOUT', '프로토타입 생성 시간이 초과되었습니다.');
    } else {
      setPrototypeJobError(jobId, 'CLI_ERROR', 'Claude CLI 실행에 실패했습니다. 로그인 상태/실행 시간을 확인해주세요.');
    }
    return;
  }

  try {
    const spec = normalizePrototypeSpec(extractJsonObject(run.text));
    if (!spec) {
      setPrototypeJobError(jobId, 'PARSE_ERROR', 'AI 응답에서 화면 구조를 해석하지 못했습니다.');
      return;
    }
    const html = buildPrototypeHtmlFromSpec(spec);
    setPrototypeJobDone(jobId, { title: spec.title, description: spec.description, html });
  } catch (err) {
    console.error('[ai] prototype job parse error:', err);
    setPrototypeJobError(jobId, 'PARSE_ERROR', 'AI 응답을 JSON으로 파싱하지 못했습니다.');
  }
}

export async function POST(request: Request) {
  let body: PrototypeRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: 'BAD_REQUEST', message: '요청 본문(JSON)이 올바르지 않습니다.' }, { status: 400 });
  }

  // Production/Vercel: AI_PROVIDER 미설정 → disabled → job 생성 없이 종료(CLI/키 미접근).
  const provider = getAiProvider();
  if (!provider.enabled) {
    return Response.json({ ok: false, reason: 'AI_DISABLED', message: '로컬 AI provider가 비활성 상태입니다.' });
  }

  const job = createPrototypeJob(body.projectId ?? '');
  // 백그라운드로 실행(응답을 기다리지 않음). 결과는 job store에 기록되고 GET으로 폴링한다.
  void runPrototypeJob(job.id, body);

  return Response.json({ ok: true, jobId: job.id, status: 'running' });
}

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) {
    return Response.json({ ok: false, reason: 'BAD_REQUEST', message: 'jobId가 필요합니다.' }, { status: 400 });
  }
  const job = getPrototypeJob(jobId);
  if (!job) {
    return Response.json({ ok: false, reason: 'JOB_NOT_FOUND', message: '프로토타입 생성 상태를 찾을 수 없습니다. 다시 생성해주세요.' });
  }
  if (job.status === 'done') {
    return Response.json({ ok: true, jobId: job.id, status: 'done', prototype: job.prototype });
  }
  if (job.status === 'error') {
    return Response.json({
      ok: false,
      jobId: job.id,
      status: 'error',
      reason: job.reason ?? 'UNKNOWN',
      message: job.message ?? '프로토타입 생성 중 오류가 발생했습니다.',
    });
  }
  return Response.json({ ok: true, jobId: job.id, status: 'running' });
}
