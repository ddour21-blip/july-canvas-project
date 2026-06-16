import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input. */
  label?: string;
  /** Helper text below the input. */
  hint?: string;
  /** Error message — also applies the invalid style. */
  error?: string;
  /** Sunken gray fill (matches long-form editors in the product). */
  sunken?: boolean;
}

/** Single-line text input with label, hint and error states. */
export function Input(props: InputProps): React.JSX.Element;
export default Input;
