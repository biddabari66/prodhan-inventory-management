import React, { memo } from 'react';

/**
 * SKELETON LOADERS
 * Beautiful loading placeholders that reduce perceived loading time
 */

// Base skeleton with shimmer animation
const Skeleton = memo(({ className = '', style = {} }) => (
  <div 
    className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`}
    style={{ 
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style 
    }}
  />
));

Skeleton.displayName = 'Skeleton';

// Table row skeleton
export const TableRowSkeleton = memo(({ columns = 5 }) => (
  <div className="flex items-center gap-4 p-4 border-b border-slate-100">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton 
        key={i} 
        className="h-4 flex-1" 
        style={{ maxWidth: i === 0 ? '200px' : '150px' }}
      />
    ))}
  </div>
));

TableRowSkeleton.displayName = 'TableRowSkeleton';

// Table skeleton
export const TableSkeleton = memo(({ rows = 5, columns = 5 }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-4 p-4 bg-slate-50 border-b border-slate-200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: '120px' }} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} columns={columns} />
    ))}
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

// Card skeleton
export const CardSkeleton = memo(({ hasImage = false }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
    {hasImage && <Skeleton className="h-32 w-full rounded-lg" />}
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// Stats card skeleton
export const StatCardSkeleton = memo(() => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  </div>
));

StatCardSkeleton.displayName = 'StatCardSkeleton';

// Stats grid skeleton
export const StatsGridSkeleton = memo(({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
));

StatsGridSkeleton.displayName = 'StatsGridSkeleton';

// Form skeleton
export const FormSkeleton = memo(({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <Skeleton className="h-10 w-32 rounded-lg mt-6" />
  </div>
));

FormSkeleton.displayName = 'FormSkeleton';

// List item skeleton
export const ListItemSkeleton = memo(() => (
  <div className="flex items-center gap-4 p-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-20 rounded-lg" />
  </div>
));

ListItemSkeleton.displayName = 'ListItemSkeleton';

// Page header skeleton
export const PageHeaderSkeleton = memo(() => (
  <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
    <Skeleton className="h-14 w-14 rounded-2xl" />
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  </div>
));

PageHeaderSkeleton.displayName = 'PageHeaderSkeleton';

// Full page skeleton
export const PageSkeleton = memo(() => (
  <div className="space-y-6 p-6">
    <PageHeaderSkeleton />
    <StatsGridSkeleton />
    <TableSkeleton />
  </div>
));

PageSkeleton.displayName = 'PageSkeleton';

// Add shimmer keyframes via style tag
export const ShimmerStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}</style>
);

export default Skeleton;