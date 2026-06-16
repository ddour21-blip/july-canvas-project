import * as React from 'react';

export interface ToastProps {
  /** Affects the leading icon color. @default 'success' */
  type?: 'success' | 'error';
  /** Rendered icon node (e.g. a CheckCircle2 / AlertCircle element). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Dark pill toast shown center-top in the product. Render it inside your own
 * fixed/animated wrapper; this component is the pill itself.
 */
export function Toast(props: ToastProps): React.JSX.Element;
export default Toast;
