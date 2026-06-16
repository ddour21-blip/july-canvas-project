import React from 'react';

/**
 * Text input with optional label, hint/error, and sunken variant.
 * Spread any native input attributes (placeholder, value, onChange…).
 */
export function Input({
  label,
  hint,
  error,
  sunken = false,
  required = false,
  id,
  className = '',
  ...rest
}) {
  const inputId = id || (label ? `jc-in-${Math.random().toString(36).slice(2, 8)}` : undefined);
  const classes = [
    'jc-input',
    sunken ? 'jc-input--sunken' : '',
    error ? 'jc-input--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="jc-field">
      {label && (
        <label className="jc-field-label" htmlFor={inputId}>
          {label}
          {required && <span className="jc-req">*</span>}
        </label>
      )}
      <input id={inputId} className={classes} {...rest} />
      {(error || hint) && (
        <p className={`jc-field-hint${error ? ' jc-field-hint--error' : ''}`}>{error || hint}</p>
      )}
    </div>
  );
}

export default Input;
