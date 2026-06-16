import React from 'react';

/**
 * Zypra unified loading primitives. Use these everywhere so the app has ONE
 * consistent, professional loading look (no flash-0, no mixed spinners).
 */

export function Shimmer({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

// Branded inline spinner (single source of truth for spinners).
export function Spinner({ className = '', size = 20 }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-orange-200 border-t-orange-600 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

// Full-area centered loader for page/section first loads.
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// Table skeleton — drop in while a list query is loading.
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => <Shimmer key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800/60 px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Shimmer key={c} className={`h-4 ${c === 0 ? 'w-10 flex-none rounded-full' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Grid of stat-card skeletons.
export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:p-5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="mt-3 h-7 w-24" />
          <Shimmer className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton (e.g. product/customer cards).
export function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center gap-3"><Shimmer className="h-10 w-10 rounded-full" /><Shimmer className="h-4 flex-1" /></div>
          <Shimmer className="h-3 w-full" /><Shimmer className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Standard error state with retry.
export function ErrorState({ message = 'Failed to load data.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xl">!</div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
          Retry
        </button>
      )}
    </div>
  );
}

export default { Shimmer, Spinner, PageLoader, TableSkeleton, StatGridSkeleton, CardGridSkeleton, ErrorState };
