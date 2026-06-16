import * as React from 'react';

export interface LiveIndicatorProps {
  /** Label text. @default '실시간 동기화 중' */
  label?: string;
  className?: string;
}

/** Pulsing green dot + label signalling active real-time sync. */
export function LiveIndicator(props: LiveIndicatorProps): React.JSX.Element;
export default LiveIndicator;
