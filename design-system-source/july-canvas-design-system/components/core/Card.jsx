import React from 'react';

/**
 * Surface container. `padded` adds standard 24px padding; `interactive`
 * adds hover lift + brand border (for clickable project/screen cards);
 * `glass` applies the frosted glassmorphism treatment.
 */
export function Card({
  children,
  padded = false,
  interactive = false,
  glass = false,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const classes = [
    'jc-card',
    padded ? 'jc-card--pad' : '',
    interactive ? 'jc-card--interactive' : '',
    glass ? 'jc-card--glass' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

export default Card;
