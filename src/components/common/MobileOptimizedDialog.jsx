import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function MobileOptimizedDialog({ 
  open, 
  onOpenChange, 
  title, 
  children, 
  maxWidth = "95vw",
  showCloseButton = true,
  className = ""
}) {
  // Prevent body scroll when dialog is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`
          w-[95vw] max-w-none h-[95vh] max-h-[95vh] p-0 gap-0 
          md:w-full md:max-w-4xl md:h-auto md:max-h-[90vh] md:p-6 md:gap-4
          overflow-hidden flex flex-col
          ${className}
        `}
        style={{ maxWidth }}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10 md:hidden">
          <h2 className="text-lg font-semibold truncate pr-4">{title}</h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 p-0 flex-shrink-0 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-0">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mobile-optimized action sheet for bottom slide-up actions
export function MobileActionSheet({ open, onOpenChange, title, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] mx-auto p-0 gap-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2 fixed bottom-4 left-1/2 transform -translate-x-1/2 rounded-t-2xl md:bottom-1/2 md:left-1/2 md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-2xl">
        <div className="p-4 border-b">
          <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden"></div>
          <h3 className="font-semibold text-center md:text-left">{title}</h3>
        </div>
        <div className="p-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}