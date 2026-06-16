import React from 'react';

/**
 * User avatar. Renders an image when `src` is given, otherwise the first
 * character of `name` on a brand-tinted circle.
 */
export function Avatar({ name = '', src, size = 'md', className = '', style, ...rest }) {
  const classes = ['jc-avatar', size !== 'md' ? `jc-avatar--${size}` : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} style={style} title={name} {...rest}>
      {src ? <img src={src} alt={name} /> : (name.trim().charAt(0) || '?')}
    </span>
  );
}

/**
 * Overlapping avatar stack with an optional "+N" overflow chip.
 * Pass `people` as an array of { name, src } and an optional `max`.
 */
export function AvatarStack({ people = [], max = 3, size = 'md' }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="jc-avatar-stack">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} />
      ))}
      {extra > 0 && (
        <span className={`jc-avatar jc-avatar--${size === 'md' ? 'sm' : size}`} style={{ background: 'var(--gray-200)', color: 'var(--gray-600)' }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export default Avatar;
