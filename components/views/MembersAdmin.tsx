'use client';

// 구성원 · 권한 (#members) — admin 테이블 스타일. 멘션 대상 글로벌 멤버(members 컬렉션) 관리.
// 기존 Dashboard 의 멤버 모달 로직(추가/삭제)을 그대로 이관 — Firestore 스키마 변경 없음.
import { useState } from 'react';
import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { col, docRef } from '@/lib/firestore';
import { showToast } from '@/lib/utils';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { ChevronRight, Plus, Trash2, UserPlus } from 'lucide-react';
import type { Member } from '@/types';

export default function MembersAdmin({ globalMembers, navigate }: { globalMembers: Member[]; navigate: (hash: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(col('members'), { nickname: name.trim(), email: email.trim() || null, createdAt: serverTimestamp() });
      setName('');
      setEmail('');
      showToast('구성원이 추가되었습니다. 이제 모든 프로젝트에서 멘션할 수 있습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const removeMember = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: '구성원을 삭제하시겠습니까?',
      msg: '삭제된 구성원은 더 이상 멘션 대상으로 표시되지 않습니다.',
      action: async () => {
        await deleteDoc(docRef('members', id));
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        showToast('구성원이 삭제되었습니다.');
      },
    });
  };

  return (
    <section>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />

      <nav className="jca-breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('#'); }}>메인</a>
        <ChevronRight size={14} />
        <span>멤버 · 권한</span>
        <ChevronRight size={14} />
        <span className="jca-breadcrumb__current">구성원</span>
      </nav>

      <div className="jca-page-head">
        <div>
          <div className="jca-page-head__title">구성원</div>
          <p className="jca-page-head__desc">댓글에서 @닉네임으로 멘션할 구성원을 관리합니다. 이메일은 추후 알림 대상으로 사용됩니다.</p>
        </div>
      </div>

      <div className="jca-table-wrap" style={{ maxWidth: 880 }}>
        <div className="jca-table-toolbar">
          <span className="jca-table-toolbar__count">전체 <b>{globalMembers.length}</b></span>
        </div>
        <table className="jca-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {globalMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="jca-td-muted" style={{ textAlign: 'center', height: 96 }}>등록된 구성원이 없습니다.</td>
              </tr>
            ) : (
              globalMembers.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="jca-avatar">{m.nickname.charAt(0).toUpperCase()}</span>
                      <b className="jca-table__cell-strong">{m.nickname}</b>
                    </div>
                  </td>
                  <td className="jca-td-muted">{m.email || '—'}</td>
                  <td><span className="jca-role jca-role--editor">MEMBER</span></td>
                  <td>
                    <span className="jca-row-actions">
                      <button type="button" className="jca-icon-btn jca-icon-btn--sm" onClick={() => removeMember(m.id)} aria-label="삭제">
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="jca-card jca-card--pad mt-5" style={{ maxWidth: 880 }}>
        <div className="jca-card__title mb-4 flex items-center gap-2">
          <UserPlus size={16} />구성원 추가
        </div>
        <form onSubmit={addMember} className="flex flex-wrap items-end gap-3">
          <div className="jca-field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="jca-field__label">닉네임<span className="jca-field__req">*</span></label>
            <input className="jca-input" placeholder="예: 김기획" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="jca-field" style={{ marginBottom: 0, flex: '1 1 240px' }}>
            <label className="jca-field__label">이메일<span className="jca-field__optional">선택</span></label>
            <input className="jca-input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="jca-btn jca-btn--primary" disabled={!name.trim()}>
            <Plus size={16} />추가
          </button>
        </form>
      </div>
    </section>
  );
}
