'use client';

// 신규 프로젝트 시작 플로우 (시안 "새 프로젝트를 시작해볼까요?").
// 3개 진입점(DashboardHome AI 시작 / 시작 옵션 카드 / ProjectList 만들기)이 공유하는 단일 모달.
// 기존 생성 로직과 동일: projects + projectMembers 문서 생성, activation.intent prefill 후 #project_{id} 이동.
// 참고 링크는 가능한 범위에서 projectSources(url)로 best-effort 연결. 파일 업로드는 다음 단계(위저드)에서 처리.
import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { createProjectSource } from '@/lib/projectSources';
import {
  ChevronDown,
  ClipboardList,
  Lightbulb,
  Link2,
  Plus,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { EMPTY_ACTIVATION, type ProjectMode } from '@/types';

interface NewProjectStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  navigate: (hash: string) => void;
  /** DashboardHome hero 입력 등에서 넘어온 한 줄 설명(intent) prefill */
  initialIntent?: string;
  /** 시작 옵션 카드에서 넘어온 모드 prefill */
  initialMode?: ProjectMode;
}

const MODE_OPTIONS: { value: ProjectMode; label: string; desc: string; icon: typeof Lightbulb }[] = [
  { value: 'idea_productization', label: '아이디어 제품화', desc: '아이디어를 시장조사·제품화 전략으로 발전', icon: Lightbulb },
  { value: 'requirement_planning', label: '요구사항 · RFP 기반', desc: '전달받은 요구사항을 기획·전달 문서로 정리', icon: ClipboardList },
];

export function NewProjectStartModal({ isOpen, onClose, user, navigate, initialIntent, initialMode }: NewProjectStartModalProps) {
  const [name, setName] = useState('');
  const [intent, setIntent] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [mode, setMode] = useState<ProjectMode>('idea_productization');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const canCreate = !!user && !user.isAnonymous;

  // 열릴 때마다 진입점이 넘긴 prefill로 초기화.
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setIntent(initialIntent?.trim() ?? '');
    setLinks([]);
    setLinkInput('');
    setMode(initialMode && initialMode !== 'legacy' ? initialMode : 'idea_productization');
    setAdvancedOpen(false);
    setCreating(false);
    const t = setTimeout(() => nameRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen, initialIntent, initialMode]);

  if (!isOpen) return null;

  const addLink = () => {
    const v = linkInput.trim();
    if (!v) return;
    if (!links.includes(v)) setLinks((prev) => [...prev, v]);
    setLinkInput('');
  };

  const handleStart = async () => {
    if (!canCreate || !user) {
      showToast('Google 로그인 후 새 프로젝트를 시작할 수 있습니다.', 'error');
      return;
    }
    if (!name.trim()) {
      showToast('프로젝트 이름을 입력해주세요.', 'error');
      nameRef.current?.focus();
      return;
    }
    if (creating) return;
    setCreating(true);
    try {
      const uid = user.uid;
      const payload: Record<string, unknown> = {
        name: name.trim(),
        organizationId: null,
        ownerId: uid,
        roleByUid: { [uid]: 'owner' as const },
        memberUids: [uid],
        status: 'draft' as const,
        activation: { ...EMPTY_ACTIVATION, mode, intent: intent.trim() },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(col('projects'), payload);
      await setDoc(docRef('projectMembers', `${ref.id}_${uid}`), {
        projectId: ref.id,
        uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        role: 'owner' as const,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // 참고 링크 best-effort 등록(실패해도 생성/이동은 진행).
      if (links.length) {
        await Promise.allSettled(
          links.map((url) =>
            createProjectSource({
              projectId: ref.id,
              type: 'url',
              status: 'pending',
              title: url,
              url,
              urlType: 'reference',
              createdBy: uid,
            }),
          ),
        );
      }
      onClose();
      navigate(`#project_${ref.id}`);
    } catch (err) {
      console.error(err);
      showToast('프로젝트 생성에 실패했습니다.', 'error');
      setCreating(false);
    }
  };

  return (
    <div className="jca-overlay" onClick={(e) => { if (e.target === e.currentTarget && !creating) onClose(); }}>
      <div className="jca-modal jca-modal--lg" role="dialog" aria-modal="true" aria-label="새 프로젝트 만들기">
        <div className="jca-modal__head">
          <div>
            <h2 className="jca-modal__title">새 프로젝트 만들기</h2>
            <p className="jca-np__lead">프로젝트 이름과 간단한 설명만 입력하면 작업 공간이 만들어집니다.</p>
          </div>
          <button className="jca-icon-btn" onClick={onClose} aria-label="닫기" disabled={creating}>
            <X size={18} />
          </button>
        </div>

        <div className="jca-modal__body">
          <div>
            {/* 입력 폼 (생성 전용) */}
            <div className="jca-np-form">
              <div className="jca-field">
                <label className="jca-field__label">서비스 · 프로젝트 이름<span className="jca-field__req">*</span></label>
                <input
                  ref={nameRef}
                  className="jca-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 여행 일정 자동 정리 앱"
                  disabled={creating}
                />
              </div>

              <div className="jca-field">
                <label className="jca-field__label">한 줄 설명<span className="jca-field__optional">선택</span></label>
                <textarea
                  className="jca-textarea"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="만들고 싶은 서비스를 한 줄로 적어주세요. AI 기획의 출발점이 됩니다."
                  disabled={creating}
                />
                <p className="jca-field__hint">입력하면 AI 기획 시작의 아이디어로 자동 반영됩니다.</p>
              </div>

              <div className="jca-field">
                <label className="jca-field__label">참고 자료<span className="jca-field__optional">선택</span></label>
                <div className="jca-np-linkrow">
                  <span className="jca-np-linkrow__ic"><Link2 size={16} /></span>
                  <input
                    className="jca-input"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                    placeholder="참고 URL (서비스·레퍼런스·문서 링크) 붙여넣기"
                    disabled={creating}
                  />
                  <button type="button" className="jca-btn jca-btn--secondary jca-btn--sm" onClick={addLink} disabled={creating || !linkInput.trim()}>
                    <Plus size={15} />추가
                  </button>
                </div>
                {links.length > 0 && (
                  <div className="jca-np-chips">
                    {links.map((l) => (
                      <span key={l} className="jca-np-chip">
                        <Link2 size={12} />
                        <span className="jca-np-chip__t">{l}</span>
                        <button type="button" onClick={() => setLinks((prev) => prev.filter((x) => x !== l))} aria-label="링크 삭제"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="jca-np-upload" aria-disabled="true">
                  <Upload size={16} />
                  <span>파일 업로드는 다음 단계에서 추가할 수 있어요</span>
                </div>
              </div>

              {/* 고급 설정 (접힘) */}
              <button type="button" className="jca-np-advanced__toggle" onClick={() => setAdvancedOpen((v) => !v)} aria-expanded={advancedOpen}>
                <ChevronDown size={16} className={advancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                고급 설정
              </button>
              {advancedOpen && (
                <div className="jca-np-advanced">
                  <div className="jca-field__label" style={{ marginBottom: 'var(--space-2)' }}>시작 방식</div>
                  <div className="jca-np-modes">
                    {MODE_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`jca-np-mode${mode === m.value ? ' jca-np-mode--on' : ''}`}
                        onClick={() => setMode(m.value)}
                        disabled={creating}
                      >
                        <span className="jca-np-mode__ic"><m.icon size={18} /></span>
                        <span className="min-w-0">
                          <span className="jca-np-mode__t">{m.label}</span>
                          <span className="jca-np-mode__d">{m.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="jca-np-hint"><Wand2 size={14} /> 다음 단계에서 AI 기획을 시작할 수 있어요.</p>
          </div>
        </div>

        <div className="jca-modal__foot jca-modal__foot--split">
          <button type="button" className="jca-btn jca-btn--ghost" onClick={onClose} disabled={creating}>취소</button>
          <button
            type="button"
            className="jca-btn jca-btn--primary jca-btn--lg"
            onClick={handleStart}
            disabled={creating || !canCreate}
            data-loading={creating ? 'true' : undefined}
          >
            <Plus size={16} /> 프로젝트 만들기
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewProjectStartModal;
