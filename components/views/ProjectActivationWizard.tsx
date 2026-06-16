'use client';

import { useState } from 'react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { buildActivationDocuments } from '@/lib/documents';
import { Button } from '@/components/common/Button';
import { ChevronLeft, ChevronRight, Rocket, X } from 'lucide-react';
import { EMPTY_ACTIVATION, type Project, type ProjectActivation } from '@/types';

interface Field {
  key: keyof ProjectActivation;
  label: string;
  placeholder: string;
  required?: boolean;
}

const STEPS: { title: string; desc: string; fields: Field[] }[] = [
  {
    title: '기획 의도 / 문제',
    desc: '이 프로젝트가 왜 필요한지, 무엇을 해결하는지 정의합니다.',
    fields: [
      { key: 'intent', label: '기획 의도', placeholder: '왜 이 제품/기능을 만드는가?', required: true },
      { key: 'problem', label: '해결하려는 문제', placeholder: '어떤 문제를 해결하는가?', required: true },
      { key: 'customer', label: '핵심 고객', placeholder: '누구를 위한 제품인가?', required: true },
    ],
  },
  {
    title: '가치 / 차별점 / 시장',
    desc: '제품화전략의 핵심 요소를 정리합니다.',
    fields: [
      { key: 'value', label: '핵심 가치', placeholder: '고객에게 주는 핵심 가치', required: true },
      { key: 'differentiator', label: '핵심 차별점', placeholder: '경쟁/대안 대비 차별점', required: true },
      { key: 'revenue', label: '수익 구조', placeholder: '어떻게 수익을 내는가?' },
      { key: 'market', label: '최초 진입 시장', placeholder: '가장 먼저 공략할 시장/세그먼트' },
    ],
  },
  {
    title: '범위 / 레퍼런스',
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
    <div className="fixed inset-0 z-[120] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-7 border-b border-gray-100 flex justify-between items-start shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0">
              <Rocket size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">프로젝트 활성화</h2>
              <p className="text-sm text-gray-500 mt-1">{project.name} · 기획 정보를 입력하면 기본 문서가 자동 생성됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 px-7 pt-5 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1.5">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <span className={`text-[11px] font-bold ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>
                {i + 1}. {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <p className="text-sm text-gray-500 mb-5">{current.desc}</p>
          <div className="space-y-4">
            {current.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={data[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={f.key === 'mvpScope' || f.key === 'intent' || f.key === 'problem' ? 3 : 2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-y bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-between items-center shrink-0">
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
