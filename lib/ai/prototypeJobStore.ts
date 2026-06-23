// 프로토타입 생성 in-memory job store (서버 전용, 로컬 단일 프로세스 MVP).
// 페이지 이동/언마운트와 무관하게 서버에서 생성을 계속하고, 클라가 jobId로 polling해 결과를 가져온다.
// ⚠️ Vercel 서버리스(다중 인스턴스/무상태)에선 신뢰 불가 — 단, Production은 AI disabled라 job 자체가 생성되지 않는다.
//    Firestore/컬렉션/rules를 쓰지 않는다(로컬 전용).

export type PrototypeJobStatus = 'running' | 'done' | 'error';

export interface PrototypeJob {
  id: string;
  projectId: string;
  status: PrototypeJobStatus;
  createdAt: number;
  updatedAt: number;
  prototype?: { title: string; description: string; html: string };
  reason?: string;
  message?: string;
}

const DONE_TTL_MS = 10 * 60 * 1000; // 완료/실패 job 보관 10분
const RUNNING_TTL_MS = 30 * 60 * 1000; // running job 방치 방지 30분
const MAX_JOBS = 50;

// HMR/모듈 재평가에도 유지되도록 globalThis에 단일 Map 보관.
const g = globalThis as unknown as { __protoJobs?: Map<string, PrototypeJob> };
const jobs: Map<string, PrototypeJob> = g.__protoJobs ?? (g.__protoJobs = new Map<string, PrototypeJob>());

const newId = (): string => {
  try {
    // node 환경 crypto.randomUUID 우선.
    const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === 'function') return `proto_${c.randomUUID()}`;
  } catch {
    /* fall through */
  }
  return `proto_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

function cleanup(): void {
  const t = Date.now();
  for (const [id, j] of jobs) {
    const age = t - j.updatedAt;
    if (j.status === 'running' ? age > RUNNING_TTL_MS : age > DONE_TTL_MS) jobs.delete(id);
  }
  if (jobs.size > MAX_JOBS) {
    const oldestFirst = [...jobs.values()].sort((a, b) => a.updatedAt - b.updatedAt);
    for (const j of oldestFirst.slice(0, jobs.size - MAX_JOBS)) jobs.delete(j.id);
  }
}

export function createPrototypeJob(projectId: string): PrototypeJob {
  cleanup();
  const t = Date.now();
  const job: PrototypeJob = { id: newId(), projectId, status: 'running', createdAt: t, updatedAt: t };
  jobs.set(job.id, job);
  return job;
}

export function getPrototypeJob(id: string): PrototypeJob | undefined {
  cleanup();
  return jobs.get(id);
}

export function setPrototypeJobDone(id: string, prototype: NonNullable<PrototypeJob['prototype']>): void {
  const j = jobs.get(id);
  if (!j) return;
  j.status = 'done';
  j.prototype = prototype;
  j.reason = undefined;
  j.message = undefined;
  j.updatedAt = Date.now();
}

export function setPrototypeJobError(id: string, reason: string, message: string): void {
  const j = jobs.get(id);
  if (!j) return;
  j.status = 'error';
  j.reason = reason;
  j.message = message;
  j.updatedAt = Date.now();
}
