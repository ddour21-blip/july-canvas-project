import React from 'react';

/**
 * Square/round icon-only button. Pass a rendered icon node as `icon`
 * (or as children). Provide an accessible `aria-label`.
 */
export function IconButton({
  icon,
  children,
  size = 'md',
  round = false,
  soft = false,
  danger = false,
  className = '',
  ...rest
}) {
  const classes = [
    'jc-icon-btn',
    size === 'sm' ? 'jc-icon-btn--sm' : '',
    round ? 'jc-icon-btn--round' : '',
    soft ? 'jc-icon-btn--soft' : '',
    danger ? 'jc-icon-btn--danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {icon || children}
    </button>
  );
}

export default IconButton;
