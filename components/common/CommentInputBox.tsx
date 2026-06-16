'use client';

import { useRef, useState } from 'react';
import { AtSign, Send } from 'lucide-react';
import type { Member } from '@/types';

interface CommentInputBoxProps {
  onSubmit: (text: string) => void;
  members?: Member[];
  placeholder?: string;
}

export function CommentInputBox({ onSubmit, members, placeholder = '댓글 추가...' }: CommentInputBoxProps) {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    const cursorPosition = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionClick = (nickname: string) => {
    const el = inputRef.current;
    if (!el) return;
    const cursorPosition = el.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    words.pop();
    const newTextBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${nickname} `;
    setText(newTextBefore + textAfterCursor);
    setShowMentions(false);
    el.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
    setShowMentions(false);
  };

  const filteredMembers = (members || []).filter((m) => m.nickname.toLowerCase().includes(mentionFilter));

  return (
    <form onSubmit={handleSubmit} className="relative mt-3">
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-64 bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-xl)] rounded-[var(--radius-lg)] mb-2 max-h-48 overflow-y-auto z-[var(--z-overlay)] animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs font-bold text-[var(--text-secondary)]">팀원 멘션하기</div>
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              onClick={() => handleMentionClick(m.nickname)}
              className="px-4 py-2.5 hover:bg-[var(--surface-active)] cursor-pointer flex flex-col transition-colors border-b border-[var(--border-subtle)] last:border-0"
            >
              <span className="text-sm font-bold text-[var(--text-strong)]">{m.nickname}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] pl-3 pr-1 py-1 focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] transition-all shadow-[var(--shadow-sm)]">
        <AtSign size={16} className="text-[var(--text-tertiary)] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-[var(--text-body)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] shadow-[var(--shadow-brand)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--border-strong)] disabled:text-[var(--text-tertiary)] disabled:shadow-none transition-colors shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </form>
  );
}

export default CommentInputBox;
