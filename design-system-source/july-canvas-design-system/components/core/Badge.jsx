import React from 'react';

/**
 * Status / category pill. `tone` maps to the design system's semantic
 * status colors. Optionally render a leading `icon` node.
 */
export function Badge({ children, tone = 'neutral', icon, className = '', ...rest }) {
  const classes = ['jc-badge', `jc-badge--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {icon}
      {children}
    </span>
  );
}

export default Badge;
