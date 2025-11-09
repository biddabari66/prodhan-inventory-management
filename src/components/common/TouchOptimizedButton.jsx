import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TouchOptimizedButton({ 
  children, 
  className = "", 
  size = "default",
  variant = "default",
  ...props 
}) {
  const touchOptimizedClasses = cn(
    // Base touch-friendly sizing
    "min-h-[44px] min-w-[44px]",
    // Mobile-specific enhancements
    "sm:min-h-[48px] active:scale-95 transition-transform duration-150",
    // Ensure text is readable on mobile
    "text-sm sm:text-base",
    // Better padding for touch
    size === "sm" ? "px-4 py-3" : size === "lg" ? "px-8 py-4" : "px-6 py-3",
    className
  );

  return (
    <Button 
      className={touchOptimizedClasses}
      size={size}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
}