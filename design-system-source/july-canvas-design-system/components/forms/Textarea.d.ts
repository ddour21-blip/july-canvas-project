import * as React from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Sunken gray fill — the product uses this for code/document editors. */
  sunken?: boolean;
}

/** Multi-line text input with label, hint and error states. */
export function Textarea(props: TextareaProps): React.JSX.Element;
export default Textarea;
