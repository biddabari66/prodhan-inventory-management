import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info, AlertCircle, CheckCircle } from 'lucide-react';

export const SmartTooltip = ({ 
  children, 
  content, 
  type = 'info', 
  side = 'top',
  showIcon = false,
  iconPosition = 'after',
  className = "",
  delay = 300
}) => {
  const getIcon = () => {
    switch (type) {
      case 'help':
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTooltipStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200';
      case 'success':
        return 'bg-green-50 text-green-900 border-green-200';
      case 'help':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-900 border-blue-200';
    }
  };

  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 ${className}`}>
            {showIcon && iconPosition === 'before' && getIcon()}
            {children}
            {showIcon && iconPosition === 'after' && getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={`max-w-xs p-3 text-sm ${getTooltipStyles()}`}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Predefined tooltip components for common use cases
export const HelpTooltip = ({ content, children, ...props }) => (
  <SmartTooltip 
    content={content} 
    type="help" 
    showIcon={!children} 
    iconPosition="after"
    {...props}
  >
    {children}
  </SmartTooltip>
);

export const InfoTooltip = ({ content, children, ...props }) => (
  <SmartTooltip 
    content={content} 
    type="info" 
    showIcon={!children}
    iconPosition="after"
    {...props}
  >
    {children}
  </SmartTooltip>
);

export const WarningTooltip = ({ content, children, ...props }) => (
  <SmartTooltip 
    content={content} 
    type="warning" 
    showIcon={!children}
    iconPosition="after"
    {...props}
  >
    {children}
  </SmartTooltip>
);

export default SmartTooltip;