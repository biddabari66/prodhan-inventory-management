import React from 'react';
import { PageLoader } from '@/components/common/Skeletons';

// Branded fallback shown while a lazy-loaded page chunk is being fetched.
export default function RouteFallback() {
  return <PageLoader label="Loading…" />;
}
