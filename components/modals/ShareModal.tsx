'use client';

import { useEffect, useState } from 'react';
import { Copy, FileText, Folder, Layout, Link2, Package, Power, Share2, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { copyToClipboard, formatDateTime, showToast } from '@/lib/utils';
import { shareHash, toPublicShareUrl, toShareUrl } from '@/lib/shareLinks';
import { useAuth, useRole } from '@/lib/auth';
import {
  EXPIRY_OPTIONS,
  createShare,
  isShareActive,
  setShareEnabled,
  subscribeProjectShares,
  type ShareExpiry,
} from '@/lib/shares';
import type { Project, ShareAccessType, ShareRecord, ShareTargetType } from '@/types';

/** 이 모달에서 생성 가능한 접근 유형 (public_review는 S7-2C). */
type CreatableAccess = Extract<ShareAccessType, 'internal' | 'public_readonly'>;

/** share 레코드의 복사용 URL. internal=내부 해시 딥링크, public_readonly=비로그인 viewer 경로. */
const shareUrlFor = (s: ShareRecord): string =>
  s.accessType === 'public_readonly' ? toPublicShareUrl(s.shareId) : toShareUrl(shareHash.share(s.shareId));

export interface ShareState {
  isOpen: boolean;
  /** 레거시: 'project' | 'screen' (접속 코드/기본 링크 식별) */
  type: string;
  id: string;
  /** 공유 링크 옵션 컨텍스트 (있는 것만 링크 노출) */
  projectId?: string;
  documentId?: string;
  screenId?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  type: string;
  id: string;
  projectId?: string;
  documentId?: string;
  screenId?: string;
  /** 공유 링크 관리 권한 판정용 (shareState.projectId에 해당하는 프로젝트) */
  project?: Project | null;
  onClose: () => void;
}

const TARGET_LABEL: Record<ShareTargetType, string> = {
  project: '프로젝트',
  document: '문서',
  screen: '프로토타입',
  handoff_package: '개발 전달 패키지',
};

export function ShareModal({ isOpen, type, id, projectId, documentId, screenId, project, onClose }: ShareModalProps) {
  // 컨텍스트가 명시되지 않은 레거시 호출(type/id만)도 동작하도록 보완.
  const pid = projectId ?? (type === 'project' ? id : undefined);
  const sid = screenId ?? (type === 'screen' ? id : undefined);

  const { user } = useAuth();
  const { canEdit } = useRole(project ?? null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [expiry, setExpiry] = useState<ShareExpiry>('none');
  const [accessType, setAccessType] = useState<CreatableAccess>('internal');

  // 프로젝트 공유 링크 실시간 구독 (모달 열렸고 프로젝트 컨텍스트가 있을 때).
  useEffect(() => {
    if (!isOpen || !pid) return;
    const unsub = subscribeProjectShares(pid, setShares);
    return () => unsub();
  }, [isOpen, pid]);

  if (!isOpen) return null;

  // 공유 링크 관리(생성/토글)는 owner/editor만.
  const canManageShares = !!pid && canEdit;

  const isPublic = accessType === 'public_readonly';

  // 생성 가능한 공유 대상 (컨텍스트에 따라).
  const allTargets: { targetType: ShareTargetType; targetId?: string; targetTitle: string; label: string }[] = [];
  if (pid) {
    allTargets.push({ targetType: 'project', targetTitle: project?.name || '프로젝트', label: '프로젝트 공유 링크 만들기' });
    // 문서 목록(targetId 없는 document)은 internal 전용 — public viewer는 단일 문서만 표시한다.
    allTargets.push({ targetType: 'document', targetTitle: '문서 목록', label: '문서 공유 링크 만들기' });
    if (documentId) allTargets.push({ targetType: 'document', targetId: documentId, targetTitle: '현재 문서', label: '현재 문서 공유 링크 만들기' });
    if (sid) allTargets.push({ targetType: 'screen', targetId: sid, targetTitle: '프로토타입 화면', label: '프로토타입 공유 링크 만들기' });
    allTargets.push({ targetType: 'handoff_package', targetId: pid, targetTitle: '개발 전달 패키지', label: '개발 전달 패키지 공유 링크 만들기' });
  }
  // public_readonly는 viewer가 지원하는 대상만(문서 목록=targetId 없는 document 제외).
  const shareTargets = isPublic
    ? allTargets.filter((t) => !(t.targetType === 'document' && !t.targetId))
    : allTargets;

  const handleCreateShare = async (t: { targetType: ShareTargetType; targetId?: string; targetTitle: string }) => {
    if (!pid || !canManageShares) return;
    try {
      await createShare({
        projectId: pid,
        targetType: t.targetType,
        targetId: t.targetId,
        targetTitle: t.targetTitle,
        accessType,
        expiry,
        createdBy: user?.uid ?? 'anonymous',
      });
      showToast(isPublic ? '외부 읽기 전용 링크가 생성되었습니다.' : '내부 공유 링크가 생성되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('공유 링크 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleToggleShare = async (s: ShareRecord) => {
    try {
      await setShareEnabled(s.id, !s.isEnabled);
      showToast(s.isEnabled ? '공유 링크를 비활성화했습니다.' : '공유 링크를 다시 활성화했습니다.');
    } catch (err) {
      console.error(err);
      showToast('상태 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[color:rgba(20,26,34,0.55)] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-3xl)] shadow-[var(--shadow-2xl)] w-full max-w-md p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-strong)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center">
              <Share2 size={20} />
            </span>
            공유
          </h2>
          <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          {/* 공유 링크 (S7-2A): shareId 기반 링크 생성/관리. 현 단계 internal(로그인 멤버). owner/editor만. */}
          {canManageShares && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-strong)] mb-1">
                <Share2 size={16} className="text-[var(--color-primary-text)]" /> 공유 링크
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                공유용 shareId 링크를 생성합니다. 내부 공유는 로그인 멤버 전용, 외부 읽기 전용은 로그인 없이 접근할 수 있습니다.
              </p>

              {/* 접근 유형 토글 */}
              <div className="inline-flex p-0.5 mb-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] border border-[var(--border-default)]">
                {([
                  { v: 'internal', label: '내부 공유' },
                  { v: 'public_readonly', label: '외부 읽기 전용' },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setAccessType(o.v)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                      accessType === o.v
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--color-primary-text)]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {/* 만료 */}
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="text-[var(--text-tertiary)]">만료</span>
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as ShareExpiry)}
                  className="px-2 py-1.5 border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                >
                  {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* 외부 읽기 전용 안내 */}
              {isPublic ? (
                <div className="mb-3 rounded-[var(--radius-lg)] border border-[var(--amber-100)] bg-[var(--amber-50)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--amber-700)]">
                  <p className="font-bold mb-1">외부 읽기 전용 링크 안내</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>로그인 없이 누구나 링크로 열람할 수 있습니다.</li>
                    <li>편집 · 승인 · 삭제 · 댓글 기능은 제공하지 않습니다.</li>
                    <li>프로젝트 공유는 문서 본문이 포함되지 않습니다(요약/목록만).</li>
                    <li>프로토타입 공유는 코드 보기만 제공하며 실행 미리보기는 제공하지 않습니다.</li>
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
                  내부 공유 링크는 로그인한 프로젝트 멤버만 열 수 있습니다.
                </p>
              )}

              {/* 대상별 생성 버튼 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {shareTargets.map((t) => (
                  <button
                    key={`${t.targetType}-${t.targetId ?? 'list'}`}
                    type="button"
                    onClick={() => handleCreateShare(t)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors"
                  >
                    <Link2 size={13} /> {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
                프로젝트=개요·문서 목록 · 문서=선택한 문서 본문 · 개발 전달 패키지=조립된 전달 문서
              </p>

              {/* 생성된 공유 링크 목록 */}
              {shares.length > 0 && (
                <ul className="space-y-2">
                  {shares.map((s) => {
                    const url = shareUrlFor(s);
                    const active = isShareActive(s);
                    const publicReadonly = s.accessType === 'public_readonly';
                    const accessLabel = publicReadonly ? '외부 읽기 전용' : s.accessType === 'public_review' ? '외부 리뷰' : '내부 전용';
                    const Icon = s.targetType === 'screen' ? Layout : s.targetType === 'handoff_package' ? Package : s.targetType === 'document' ? FileText : Folder;
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)]">
                        <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border-subtle)]"><Icon size={15} /></span>
                        <div className="min-w-0 flex-1">
                          {/* 제목 + 상태 1개만 강조. 타입/접근/만료는 아래 muted 메타로 분리(배지 나열 정리). */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-[var(--text-body)] truncate">{s.targetTitle || TARGET_LABEL[s.targetType]}</span>
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--text-tertiary)] bg-[var(--surface-hover)]'}`}>{active ? '활성' : s.isEnabled ? '만료됨' : '비활성'}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate" title={url}>
                            {TARGET_LABEL[s.targetType]} · {accessLabel} · {s.expiresAt ? `만료 ${formatDateTime(s.expiresAt)}` : '만료 없음'}
                          </div>
                        </div>
                        <button type="button" onClick={() => { if (copyToClipboard(url)) showToast('공유 링크를 복사했습니다.'); else showToast('복사 실패', 'error'); }} aria-label="링크 복사" className="shrink-0 p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-text)] transition-colors"><Copy size={15} /></button>
                        <button type="button" onClick={() => handleToggleShare(s)} className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-[var(--radius-md)] border transition-colors ${s.isEnabled ? 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--red-600)]' : 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--surface-active)]'}`}><Power size={12} /> {s.isEnabled ? '비활성화' : '재활성화'}</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 편집 권한이 없으면(viewer/비멤버) 공유 링크 생성 UI가 없으므로 안내만 노출 (빈 모달 방지). */}
          {!canManageShares && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-6 text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">공유 링크 생성은 프로젝트 편집 권한(소유자·편집자)이 필요합니다.</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">소유자에게 공유 링크를 요청하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
