import * as React from 'react';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon node to render (e.g. `<X size={20} />`). */
  icon?: React.ReactNode;
  /** Size. @default 'md' */
  size?: 'sm' | 'md';
  /** Fully rounded (pill) shape — used for close/notification buttons. */
  round?: boolean;
  /** Soft gray fill instead of transparent. */
  soft?: boolean;
  /** Red hover treatment for destructive actions. */
  danger?: boolean;
  children?: React.ReactNode;
}

/**
 * Icon-only button for toolbars, close affordances, row actions.
 * Always supply `aria-label` for accessibility.
 */
export function IconButton(props: IconButtonProps): React.JSX.Element;
export default IconButton;
