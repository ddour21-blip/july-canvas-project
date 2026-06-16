'use client';

import { useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { buildActivationDocuments } from '@/lib/documents';
import { Button } from '@/components/common/Button';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, Rocket, X } from 'lucide-react';
import { EMPTY_ACTIVATION, type Project, type ProjectActivation } from '@/types';

interface Field {
  key: keyof ProjectActivation;
  label: string;
  placeholder: string;
  required?: boolean;
}

const STEPS: { title: string; desc: string; fields: Field[] }[] = [
  {
    title: '문제와 고객',
    desc: '이 프로젝트가 왜 필요한지, 무엇을 해결하는지 정의합니다.',
    fields: [
      { key: 'intent', label: '기획 의도', placeholder: '왜 이 제품/기능을 만드는가?', required: true },
      { key: 'problem', label: '해결하려는 문제', placeholder: '어떤 문제를 해결하는가?', required: true },
      { key: 'customer', label: '핵심 고객', placeholder: '누구를 위한 제품인가?', required: true },
    ],
  },
  {
    title: '제품 전략',
    desc: '제품화전략의 핵심 요소를 정리합니다.',
    fields: [
      { key: 'value', label: '핵심 가치', placeholder: '고객에게 주는 핵심 가치', required: true },
      { key: 'differentiator', label: '핵심 차별점', placeholder: '경쟁/대안 대비 차별점', required: true },
      { key: 'revenue', label: '수익 구조', placeholder: '어떻게 수익을 내는가?' },
      { key: 'market', label: '최초 진입 시장', placeholder: '가장 먼저 공략할 시장/세그먼트' },
    ],
  },
  {
    title: 'MVP와 레퍼런스',
    desc: 'MVP 범위와 참고 자료를 정리하면 활성화가 완료됩니다.',
    fields: [
      { key: 'mvpScope', label: 'MVP 범위', placeholder: '최소 기능 범위', required: true },
      { key: 'laterScope', label: '나중에 추가할 기능', placeholder: 'MVP 이후 확장 기능' },
      { key: 'references', label: '참고 UI / 서비스 / 레퍼런스', placeholder: '참고할 서비스 또는 URL' },
    ],
  },
];

interface Props {
  project: Project;
  onClose: () => void;
  onActivated: () => void;
}

export default function ProjectActivationWizard({ project, onClose, onActivated }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProjectActivation>(project.activation ?? EMPTY_ACTIVATION);
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const stepValid = current.fields.every((f) => !f.required || data[f.key].trim());

  const set = (key: keyof ProjectActivation, v: string) => setData((prev) => ({ ...prev, [key]: v }));

  const handleActivate = async () => {
    setSaving(true);
    try {
      // 1) 프로젝트 활성화 (draft → active)
      await updateDoc(docRef('projects', project.id), {
        activation: data,
        status: 'active',
        activatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2) 기본 문서 3종 자동 생성 (brief / market_research / product_strategy)
      const docs = buildActivationDocuments({ ...project, activation: data }, data);
      await Promise.all(
        docs.map((d) =>
          addDoc(col('documents'), {
            projectId: project.id,
            ...d,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      showToast('프로젝트가 활성화되었습니다. 기본 문서가 생성되었습니다.');
      onActivated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('활성화 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-3xl)] shadow-[var(--shadow-2xl)] w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* 헤더 */}
        <div className="p-7 border-b border-[var(--border-subtle)] flex justify-between items-start shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[var(--color-primary)] rounded-[var(--radius-xl)] flex items-center justify-center text-[var(--color-on-primary)] shadow-[var(--shadow-brand)] shrink-0">
              <Rocket size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight">프로젝트 활성화</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{project.name} · 기획 정보를 입력하면 기본 문서가 자동 생성됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-1.5 px-7 pt-5 shrink-0 flex-wrap">
          {STEPS.map((s, i) => {
            const done = i < step;
            const cur = i === step;
            return (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : cur
                        ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)] ring-2 ring-[var(--color-primary)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </span>
                <span className={`text-xs font-bold truncate ${cur || done ? 'text-[var(--color-primary-text)]' : 'text-[var(--text-tertiary)]'}`}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`mx-1 h-0.5 w-6 rounded-full ${done ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-default)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* 현재 단계 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-7">
          <p className="text-sm text-[var(--text-secondary)] mb-5">{current.desc}</p>
          <div className="space-y-4">
            {current.fields.map((f) => {
              const filled = !!data[f.key].trim();
              return (
                <div key={f.key}>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-body)] mb-1.5">
                    {f.label} {f.required && <span className="text-[var(--red-600)]">*</span>}
                    {filled && <CheckCircle2 size={13} className="text-[var(--green-600)]" />}
                  </label>
                  <textarea
                    value={data[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={f.key === 'mvpScope' || f.key === 'intent' || f.key === 'problem' ? 3 : 2}
                    className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-sm resize-y bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] text-[var(--text-body)] transition-colors"
                  />
                </div>
              );
            })}
          </div>

          {/* 활성화 완료 안내 (마지막 단계) */}
          {isLast && (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--brand-200)] bg-[var(--color-primary-softer)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)]">
                <Rocket size={15} className="text-[var(--color-primary-text)]" /> 활성화하면 프로젝트가 <span className="text-[var(--color-primary-text)]">draft → active</span>로 전환됩니다.
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 mb-2.5">입력한 정보로 기본 기획 문서 3종이 자동 생성됩니다.</p>
              <ul className="flex flex-wrap gap-2">
                {['PROJECT_BRIEF', 'MARKET_RESEARCH', 'PRODUCT_STRATEGY'].map((d) => (
                  <li key={d} className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-body)] px-2.5 py-1 rounded-[var(--radius-md)]">
                    <FileText size={12} className="text-[var(--color-primary-text)]" /> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 미입력 validation 안내 */}
          {!stepValid && (
            <p className="mt-4 text-xs font-medium text-[var(--amber-700)] bg-[var(--amber-50)] border border-[var(--amber-100)] rounded-[var(--radius-md)] px-3 py-2">
              이 단계의 필수 항목(<span className="text-[var(--red-600)] font-bold">*</span>)을 모두 입력해야 {isLast ? '활성화를 완료' : '다음 단계로 진행'}할 수 있습니다.
            </p>
          )}
        </div>

        {/* 이전 / 다음 / 완료 */}
        <div className="p-6 border-t border-[var(--border-subtle)] flex justify-between items-center shrink-0">
          <Button variant="secondary" icon={ChevronLeft} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            이전
          </Button>
          {isLast ? (
            <Button icon={Rocket} onClick={handleActivate} disabled={!stepValid || saving} className="px-7">
              {saving ? '활성화 중...' : '활성화 완료'}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!stepValid}>
              다음 <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
