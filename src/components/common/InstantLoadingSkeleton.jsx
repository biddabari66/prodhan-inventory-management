import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

/**
 * EXPERT SKELETON LOADERS
 * Provides instant visual feedback while data loads
 */

export const PageHeaderSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-violet-200 to-pink-200 rounded-2xl"></div>
      <div className="space-y-2 flex-1">
        <div className="h-8 bg-gradient-to-r from-violet-200 to-pink-200 rounded-lg w-64"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>
    </div>
  </div>
);

export const StatsCardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gradient-to-r from-violet-200 to-pink-200 rounded w-20"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 10, columns = 6 }) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-3">
        {/* Table Header */}
        <div className="flex gap-4 pb-4 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
          ))}
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div 
                key={colIndex} 
                className="h-4 bg-gray-100 rounded flex-1 animate-pulse"
                style={{ animationDelay: `${rowIndex * 50}ms` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-48"></div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] bg-gradient-to-t from-gray-100 to-gray-50 rounded-xl"></div>
    </CardContent>
  </Card>
);

export const FormSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
      </div>
    ))}
    <div className="flex gap-3 justify-end">
      <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
      <div className="h-10 bg-gradient-to-r from-violet-200 to-pink-200 rounded-lg w-32"></div>
    </div>
  </div>
);

// Instant loading component - shows immediately
export const InstantLoader = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="relative inline-block">
        <Loader2 className="w-16 h-16 text-violet-600 animate-spin" />
        <div className="absolute inset-0 bg-violet-600/20 rounded-full blur-xl animate-pulse"></div>
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-violet-600">{message}</p>
        <p className="text-sm text-muted-foreground">Optimized loading ⚡</p>
      </div>
    </div>
  </div>
);

export default {
  PageHeaderSkeleton,
  StatsCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  FormSkeleton,
  InstantLoader
};