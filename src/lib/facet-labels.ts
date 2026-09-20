import type { NodeBucket } from './types';

/** Shared between the rail and the empty-state copy so the wording never drifts. */
export const NODE_BUCKET_LABELS: Record<NodeBucket, string> = {
  any: 'Any',
  lt10: 'Under 10',
  '10-15': '10 – 15',
  gt15: '15 or more',
};
