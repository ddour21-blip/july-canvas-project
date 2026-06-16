'use client';

import type { ComponentType, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  icon?: ComponentType<{ size?: number }>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// green-first 디자인 토큰 직접 소비 (UI-3). primary = 밝은 #50FA6E 필 + 다크 잉크 텍스트.
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-brand)] hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--shadow-brand-lg)]',
  secondary: 'bg-[var(--surface-hover)] text-[var(--text-body)] hover:bg-[var(--border-default)]',
  danger: 'bg-[var(--red-50)] text-[var(--red-600)] hover:bg-[var(--red-100)]',
  outline:
    'border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-hover)]',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  icon: Icon,
  disabled,
  type = 'button',
}: ButtonProps) {
  const base =
    'flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${VARIANTS[variant]} ${className}`}>
      {Icon && <Icon size={18} />} {children}
    </button>
  );
}

export default Button;
