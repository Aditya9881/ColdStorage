'use client';

import { Suspense } from 'react';
import { DiscoverPage } from '@/components/features/discover/DiscoverPage';

export default function DiscoverRoute() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F5F7F4' }}>
        <p style={{ color: '#96A19B', fontSize: '0.88rem' }}>Loading...</p>
      </div>
    }>
      <DiscoverPage />
    </Suspense>
  );
}
