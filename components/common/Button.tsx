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

// primary = solid LINE green(#06C755) flat 필 + 흰 텍스트, 그림자 없음.
// secondary = white + neutral border, outline = white + border, danger = soft red. 모두 flat.
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]',
  secondary: 'bg-[var(--surface-card)] text-[var(--text-body)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
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
    'inline-flex items-center justify-center gap-2 px-4 h-[38px] rounded-[var(--radius-md)] text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${VARIANTS[variant]} ${className}`}>
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}

export default Button;
