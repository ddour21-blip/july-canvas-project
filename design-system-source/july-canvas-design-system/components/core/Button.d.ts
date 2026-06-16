import * as React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: ButtonVariant;
  /** Control height. @default 'md' */
  size?: ButtonSize;
  /** Leading icon node (e.g. a Lucide element). */
  icon?: React.ReactNode;
  /** Trailing icon node. */
  iconRight?: React.ReactNode;
  /** Stretch to fill the container width. */
  block?: boolean;
  children?: React.ReactNode;
}

/**
 * Primary action button. The product's main CTA surface — primary uses the
 * green brand fill (#50FA6E) with dark-green text; outline/secondary/ghost step down emphasis.
 *
 * @startingPoint section="Core" subtitle="Button — every variant & size" viewport="700x180"
 */
export function Button(props: ButtonProps): React.JSX.Element;
export default Button;
