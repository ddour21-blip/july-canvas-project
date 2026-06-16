import React from 'react';

/**
 * July Canvas primary action button.
 * Emits the shared `.jc-btn` classes from the design system stylesheet.
 *
 * Pass `icon` / `iconRight` as a rendered node (e.g. a Lucide element
 * `<Plus size={18} />`) — the component is icon-library agnostic.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) {
  const classes = [
    'jc-btn',
    `jc-btn--${variant}`,
    size !== 'md' ? `jc-btn--${size}` : '',
    block ? 'jc-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {icon}
      {children != null && <span>{children}</span>}
      {iconRight}
    </button>
  );
}

export default Button;
