import React from 'react';
import { Badge } from './Badge';

/** Project lifecycle status → Korean label + tone (mirrors the product). */
const PROJECT_STATUS = {
  draft: { label: '초안', tone: 'neutral' },
  active: { label: '활성', tone: 'info' },
  review: { label: '리뷰', tone: 'warning' },
  approved: { label: '승인', tone: 'success' },
  handoff: { label: '전달됨', tone: 'archived' },
  archived: { label: '보관됨', tone: 'archived' },
};

/** Document status → label + tone. */
const DOC_STATUS = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '리뷰', tone: 'warning' },
  approved: { label: '승인', tone: 'success' },
};

/**
 * Renders the correct label + color for a project or document status.
 * `kind="project"` (default) covers the 5-stage project lifecycle;
 * `kind="document"` covers the 3-stage doc pipeline.
 */
export function StatusBadge({ status, kind = 'project', ...rest }) {
  const map = kind === 'document' ? DOC_STATUS : PROJECT_STATUS;
  const cfg = map[status] || { label: status, tone: 'neutral' };
  return (
    <Badge tone={cfg.tone} {...rest}>
      {cfg.label}
    </Badge>
  );
}

export default StatusBadge;
