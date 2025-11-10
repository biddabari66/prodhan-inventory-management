import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * 🎨 OPTIMIZED SKELETON LOADERS
 * Lightweight, instant-rendering loading states
 */

export const CardSkeleton = ({ count = 1, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={`animate-pulse ${className}`}>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 border-b">
          <div className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b last:border-b-0">
            <div className="flex gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StatCardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const ListSkeleton = ({ items = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export const FormSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
      <div className="flex justify-end gap-3">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  );
};

export const ChartSkeleton = ({ height = 300 }) => {
  return (
    <div className="animate-pulse" style={{ height: `${height}px` }}>
      <div className="h-full bg-gray-200 rounded-lg flex items-end justify-around p-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-300 rounded-t w-full"
            style={{ height: `${Math.random() * 70 + 30}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

// Minimal inline skeleton (for micro-optimizations)
export const InlineSkeleton = ({ width = '100%', height = '1rem', className = '' }) => (
  <div 
    className={`bg-gray-200 rounded animate-pulse ${className}`} 
    style={{ width, height }}
  ></div>
);

export default {
  CardSkeleton,
  TableSkeleton,
  StatCardSkeleton,
  ListSkeleton,
  FormSkeleton,
  ChartSkeleton,
  InlineSkeleton
};