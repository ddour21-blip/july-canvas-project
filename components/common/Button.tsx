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

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
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
    'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${VARIANTS[variant]} ${className}`}>
      {Icon && <Icon size={18} />} {children}
    </button>
  );
}

export default Button;
