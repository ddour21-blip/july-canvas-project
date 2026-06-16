import React from 'react';

/**
 * "실시간 동기화 중" live indicator: a pulsing green dot + label.
 * Used in the product header to show real-time sync is active.
 */
export function LiveIndicator({ label = '실시간 동기화 중', className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        font: 'var(--type-body-sm)',
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="jc-live-dot" />
      {label}
    </span>
  );
}

export default LiveIndicator;
