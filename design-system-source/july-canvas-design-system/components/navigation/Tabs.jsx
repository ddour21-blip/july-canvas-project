import React from 'react';

/**
 * Underline tab bar. `tabs` is an array of { key, label } (label may be a
 * node). Controlled via `value` + `onChange(key)`.
 */
export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={`jc-tabs ${className}`.trim()} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          className={`jc-tab${value === t.key ? ' jc-tab--active' : ''}`}
          onClick={() => onChange?.(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
