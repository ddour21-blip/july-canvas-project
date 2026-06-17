'use client';

import { useEffect, useState } from 'react';
import { Copy, FileText, Folder, Layout, Link2, Package, Power, Share2, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { copyToClipboard, formatDateTime, getTime, showToast } from '@/lib/utils';
import { shareHash, toShareUrl } from '@/lib/shareLinks';
import { useAuth, useRole } from '@/lib/auth';
import {
  EXPIRY_OPTIONS,
  createShare,
  isShareActive,
  setShareEnabled,
  subscribeProjectShares,
  type ShareExpiry,
} from '@/lib/shares';
import type { Project, ShareRecord, ShareTargetType } from '@/types';

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
  workspaceId: string;
}

interface LinkRow {
  key: string;
  title: string;
  desc: string;
  url: string;
  icon: typeof Folder;
}

const TARGET_LABEL: Record<ShareTargetType, string> = {
  project: '프로젝트',
  document: '문서',
  screen: '프로토타입',
  handoff_package: '개발 전달 패키지',
};

export function ShareModal({ isOpen, type, id, projectId, documentId, screenId, project, onClose, workspaceId }: ShareModalProps) {
  // 컨텍스트가 명시되지 않은 레거시 호출(type/id만)도 동작하도록 보완.
  const pid = projectId ?? (type === 'project' ? id : undefined);
  const sid = screenId ?? (type === 'screen' ? id : undefined);

  const { user } = useAuth();
  const { canEdit } = useRole(project ?? null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [expiry, setExpiry] = useState<ShareExpiry>('none');

  // 프로젝트 공유 링크 실시간 구독 (모달 열렸고 프로젝트 컨텍스트가 있을 때).
  useEffect(() => {
    if (!isOpen || !pid) return;
    const unsub = subscribeProjectShares(pid, setShares);
    return () => unsub();
  }, [isOpen, pid]);

  if (!isOpen) return null;

  // 공유 링크 관리(생성/토글)는 owner/editor만.
  const canManageShares = !!pid && canEdit;

  // 생성 가능한 공유 대상 (컨텍스트에 따라)
  const shareTargets: { targetType: ShareTargetType; targetId?: string; targetTitle: string; label: string }[] = [];
  if (pid) {
    shareTargets.push({ targetType: 'project', targetTitle: project?.name || '프로젝트', label: '프로젝트 공유 링크 만들기' });
    shareTargets.push({ targetType: 'document', targetTitle: '문서 목록', label: '문서 공유 링크 만들기' });
    if (documentId) shareTargets.push({ targetType: 'document', targetId: documentId, targetTitle: '현재 문서', label: '현재 문서 공유 링크 만들기' });
    if (sid) shareTargets.push({ targetType: 'screen', targetId: sid, targetTitle: '프로토타입 화면', label: '프로토타입 공유 링크 만들기' });
    shareTargets.push({ targetType: 'handoff_package', targetId: pid, targetTitle: '개발 전달 패키지', label: '개발 전달 패키지 공유 링크 만들기' });
  }

  const handleCreateShare = async (t: { targetType: ShareTargetType; targetId?: string; targetTitle: string }) => {
    if (!pid || !canManageShares) return;
    try {
      await createShare({
        projectId: pid,
        targetType: t.targetType,
        targetId: t.targetId,
        targetTitle: t.targetTitle,
        accessType: 'internal',
        expiry,
        createdBy: user?.uid ?? 'anonymous',
      });
      showToast('공유 링크가 생성되었습니다.');
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

  // 레거시 접속 코드/링크 (기존 방식 유지)
  const displayHash = `${type}_${id}`;
  const fullUrl = `${window.location.origin}${window.location.pathname}#ws_${workspaceId}_${type}_${id}`;

  const handleCopy = (text: string, msg: string) => {
    if (copyToClipboard(text)) showToast(msg);
    else showToast('복사 실패', 'error');
  };

  const handleCopyMessage = () => {
    const text = `🚀 July 캔버스 공유\n\n🔗 접속 링크: ${fullUrl}\n🔑 접속 코드: ${displayHash}\n\n* 안내: 위 링크를 클릭하거나, July 캔버스 메인 화면의 '접속 코드' 입력란에 코드를 붙여넣고 [바로 입장]을 클릭해주세요.`;
    handleCopy(text, '초대 메시지와 접속 링크가 복사되었습니다.');
  };

  // 바로가기 딥링크 옵션 (있는 컨텍스트만)
  const links: LinkRow[] = [];
  if (pid) {
    links.push({ key: 'project', title: '프로젝트 링크', desc: '프로젝트 개요로 바로 이동합니다.', url: toShareUrl(shareHash.project(pid)), icon: Folder });
    links.push({ key: 'documents', title: '문서 링크', desc: '문서 파이프라인 화면으로 바로 이동합니다.', url: toShareUrl(shareHash.documents(pid)), icon: FileText });
    if (documentId) {
      links.push({ key: 'document', title: '현재 문서 링크', desc: '선택한 문서로 바로 이동합니다.', url: toShareUrl(shareHash.document(pid, documentId)), icon: FileText });
    }
  }
  if (sid) {
    links.push({ key: 'screen', title: '프로토타입 링크', desc: '현재 화면/프로토타입으로 바로 이동합니다.', url: toShareUrl(shareHash.screen(sid)), icon: Layout });
  }

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
          {/* 바로가기 딥링크 옵션 (로그인/멤버 전용 내부 링크) */}
          {links.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-strong)] mb-1">
                <Link2 size={16} className="text-[var(--color-primary-text)]" /> 바로가기 링크
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">로그인한 프로젝트 멤버가 해당 위치로 바로 이동합니다.</p>
              <ul className="space-y-2">
                {links.map((l) => {
                  const Icon = l.icon;
                  return (
                    <li key={l.key} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)]">
                      <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--border-default)]">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[var(--text-body)]">{l.title}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)] truncate" title={l.url}>{l.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(l.url, `${l.title}가 복사되었습니다.`)}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--color-primary-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                      >
                        <Copy size={13} /> 복사
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 공유 링크 (S7-2A): shareId 기반 링크 생성/관리. 현 단계 internal(로그인 멤버). owner/editor만. */}
          {canManageShares && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-strong)] mb-1">
                <Share2 size={16} className="text-[var(--color-primary-text)]" /> 공유 링크
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                공유용 shareId 링크를 생성합니다. 이번 단계에서는 로그인된 사용자 기준으로 동작하며, 비로그인 공개 공유는 후속 단계에서 지원합니다.
              </p>

              {/* 접근 유형 + 만료 */}
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-2 py-1 rounded">접근: Internal</span>
                <span className="text-[var(--text-tertiary)]">만료</span>
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as ShareExpiry)}
                  className="px-2 py-1.5 border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--text-body)] focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none"
                >
                  {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
                Public Readonly는 S7-2B에서, Public Review는 S7-2C에서 지원 예정입니다.
              </p>

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

              {/* 생성된 공유 링크 목록 */}
              {shares.length > 0 && (
                <ul className="space-y-2">
                  {shares.map((s) => {
                    const url = toShareUrl(shareHash.share(s.shareId));
                    const active = isShareActive(s);
                    const Icon = s.targetType === 'screen' ? Layout : s.targetType === 'handoff_package' ? Package : s.targetType === 'document' ? FileText : Folder;
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)]">
                        <span className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--border-default)]"><Icon size={15} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">{TARGET_LABEL[s.targetType]}</span>
                            <span className="text-sm font-medium text-[var(--text-body)] truncate">{s.targetTitle || s.shareId}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? 'text-[var(--green-700)] bg-[var(--green-50)]' : 'text-[var(--text-tertiary)] bg-[var(--surface-hover)]'}`}>{active ? '활성' : s.isEnabled ? '만료됨' : '비활성'}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                            {s.accessType} · {s.expiresAt ? `만료 ${formatDateTime(s.expiresAt)}` : '만료 없음'}{getTime(s.createdAt) ? ` · ${formatDateTime(s.createdAt)}` : ''}
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

          {/* 레거시: 고유 접속 링크 + 접속 코드 (기존 방식 유지) */}
          <div className="bg-[var(--color-primary-softer)] border border-[var(--brand-100)] rounded-[var(--radius-2xl)] p-5 text-center">
            <label className="block text-sm font-bold text-[var(--color-primary-text)] mb-3">고유 접속 링크 및 코드</label>
            <div
              className="bg-[var(--surface-card)] border border-[var(--brand-200)] rounded-[var(--radius-lg)] px-4 py-3 font-mono font-bold text-[var(--text-body)] text-[13px] shadow-[var(--shadow-inset)] select-all overflow-hidden text-ellipsis whitespace-nowrap mb-4"
              title={fullUrl}
            >
              {fullUrl}
            </div>
            <Button onClick={handleCopyMessage} className="w-full py-3.5 text-base font-bold shadow-[var(--shadow-brand)]">
              링크 + 접속 코드 함께 복사
            </Button>
            <div className="bg-[var(--green-50)] px-4 py-3 border border-[var(--green-100)] rounded-[var(--radius-lg)] text-xs font-bold text-[var(--green-700)] flex flex-col gap-1 mt-4">
              <span>💡 이 링크는 안심하고 한 번만 공유하세요.</span>
              <span className="text-[var(--green-600)] font-medium">
                코드가 업데이트되어도 팀원 접속 시 자동으로 최신 버전 화면으로 즉시 연결됩니다.
              </span>
            </div>
          </div>
          <div className="border border-[var(--border-default)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface-card)]">
            <div className="bg-[var(--surface-sunken)] px-4 py-3 border-b border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)] text-center">
              💡 팀원 직접 입장 가이드
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="flex bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] h-[40px] w-full max-w-[300px] mb-4 pointer-events-none">
                <div className="px-4 py-2 text-sm font-medium text-[var(--text-body)] flex-1 text-left bg-[var(--surface-active)] font-mono select-none truncate">
                  {displayHash}
                </div>
                <div className="bg-[var(--surface-sunken)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] border-l border-[var(--border-strong)] select-none whitespace-nowrap">
                  바로 입장
                </div>
              </div>
              <p className="text-[13px] font-bold text-[var(--text-body)] leading-relaxed">
                공유 받은 다이렉트 링크를 클릭하거나
                <br />
                <span className="text-[var(--color-primary-text)]">접속 코드</span>를 입력 후 접속하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
