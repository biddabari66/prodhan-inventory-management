import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MobileOptimizedForm({ 
  title, 
  children, 
  onSubmit, 
  onCancel,
  isLoading = false,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  showCancel = true,
  className = ""
}) {
  return (
    <Card className={`w-full ${className}`}>
      {title && (
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
          <div className="space-y-4">
            {children}
          </div>
          
          {/* Mobile-Optimized Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            {showCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm touch-manipulation"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 sm:h-10 text-base sm:text-sm font-semibold touch-manipulation"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Mobile-optimized form field components
export function MobileFormField({ label, required, children, error, description }) {
  return (
    <div className="space-y-2">
      <Label className={`text-sm font-medium ${required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}>
        {label}
      </Label>
      <div className="space-y-1">
        {children}
        {error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export function MobileInput(props) {
  return (
    <Input
      {...props}
      className={`h-12 text-base ${props.className || ''}`}
      style={{ fontSize: '16px' }} // Prevents zoom on iOS
    />
  );
}

export function MobileTextarea(props) {
  return (
    <Textarea
      {...props}
      className={`min-h-[100px] text-base ${props.className || ''}`}
      style={{ fontSize: '16px' }} // Prevents zoom on iOS
    />
  );
}

export function MobileSelect({ children, ...props }) {
  return (
    <Select {...props}>
      <SelectTrigger className="h-12 text-base">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        {children}
      </SelectContent>
    </Select>
  );
}