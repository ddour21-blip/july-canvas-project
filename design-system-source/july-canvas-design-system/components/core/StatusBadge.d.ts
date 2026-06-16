import * as React from 'react';

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'review'
  | 'approved'
  | 'handoff'
  | 'archived';
export type DocumentStatus = 'draft' | 'review' | 'approved';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** The status value to display. */
  status: ProjectStatus | DocumentStatus | string;
  /** Which status vocabulary to use. @default 'project' */
  kind?: 'project' | 'document';
}

/**
 * Maps a July Canvas project/document status to its canonical Korean label
 * and semantic color, so status display stays consistent everywhere.
 */
export function StatusBadge(props: StatusBadgeProps): React.JSX.Element;
export default StatusBadge;
