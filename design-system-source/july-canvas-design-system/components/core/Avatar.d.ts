import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Display name — initial is used as the fallback. */
  name?: string;
  /** Optional image URL. */
  src?: string;
  /** Size. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
}

export interface AvatarStackProps {
  people: Array<{ name: string; src?: string }>;
  /** Max avatars shown before "+N". @default 3 */
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

/** Circular user avatar with image or initial fallback. */
export function Avatar(props: AvatarProps): React.JSX.Element;
/** Overlapping avatar stack with "+N" overflow. */
export function AvatarStack(props: AvatarStackProps): React.JSX.Element;
export default Avatar;
