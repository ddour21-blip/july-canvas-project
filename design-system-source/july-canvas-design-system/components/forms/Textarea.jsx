import React from 'react';

/** Multi-line text input. Same label/hint/error API as `Input`. */
export function Textarea({
  label,
  hint,
  error,
  sunken = false,
  required = false,
  id,
  className = '',
  ...rest
}) {
  const taId = id || (label ? `jc-ta-${Math.random().toString(36).slice(2, 8)}` : undefined);
  const classes = [
    'jc-textarea',
    sunken ? 'jc-textarea--sunken' : '',
    error ? 'jc-textarea--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="jc-field">
      {label && (
        <label className="jc-field-label" htmlFor={taId}>
          {label}
          {required && <span className="jc-req">*</span>}
        </label>
      )}
      <textarea id={taId} className={classes} {...rest} />
      {(error || hint) && (
        <p className={`jc-field-hint${error ? ' jc-field-hint--error' : ''}`}>{error || hint}</p>
      )}
    </div>
  );
}

export default Textarea;
