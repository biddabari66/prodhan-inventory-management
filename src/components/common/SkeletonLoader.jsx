import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * OPTIMIZED Skeleton Loaders - Lightweight and fast
 */

export const CardSkeleton = ({ count = 1, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className={`premium-card ${className}`}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse" />
              <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-12 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse"
              style={{ animationDelay: `${rowIndex * 50 + colIndex * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const ListSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="h-16 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  );
};

export const StatCardSkeleton = () => (
  <Card className="premium-card">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-slate-200 to-slate-100 rounded-xl animate-pulse" />
        <div className="w-16 h-6 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse w-1/2" />
        <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-100 rounded animate-pulse w-3/4" />
      </div>
    </CardContent>
  </Card>
);

export default {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  StatCardSkeleton
};