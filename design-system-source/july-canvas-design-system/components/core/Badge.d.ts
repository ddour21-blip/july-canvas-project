import * as React from 'react';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'handoff'
  | 'archived'
  | 'solid-danger'
  | 'solid-brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic color. @default 'neutral' */
  tone?: BadgeTone;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Small status / category pill. Used for membership tiers (FREE/PREMIUM),
 * doc statuses, counts, and live indicators.
 */
export function Badge(props: BadgeProps): React.JSX.Element;
export default Badge;
