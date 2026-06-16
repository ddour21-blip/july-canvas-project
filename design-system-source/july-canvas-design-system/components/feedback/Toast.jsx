import React from 'react';

/**
 * Transient toast pill. `type` controls the leading icon color.
 * Pass `icon` as a rendered node (success/error icon).
 */
export function Toast({ children, type = 'success', icon, className = '' }) {
  const classes = ['jc-toast', `jc-toast--${type}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} role="status">
      {icon}
      {children}
    </div>
  );
}

export default Toast;
