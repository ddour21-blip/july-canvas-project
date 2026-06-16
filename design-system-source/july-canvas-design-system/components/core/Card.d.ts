import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Apply standard 24px interior padding. */
  padded?: boolean;
  /** Hover lift + brand border — for clickable cards. */
  interactive?: boolean;
  /** Frosted glassmorphism surface. */
  glass?: boolean;
  /** Element tag to render. @default 'div' */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

/**
 * The foundational surface — white, soft border, soft shadow, 16px radius.
 * Used for project cards, document panels, summary blocks.
 *
 * @startingPoint section="Core" subtitle="Card surface — default, interactive, glass" viewport="700x220"
 */
export function Card(props: CardProps): React.JSX.Element;
export default Card;
