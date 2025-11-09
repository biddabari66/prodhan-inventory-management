import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationCard({
  icon: Icon,
  title,
  description,
  status,
  isConfigured,
  onToggle,
  category,
  onTest,
  onConfigure
}) {
  const [isToggling, setIsToggling] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const isEnabled = status === 'active';

  const handleToggle = async (checked) => {
    setIsToggling(true);
    try {
      await onToggle(checked ? 'active' : 'inactive');
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to toggle integration');
    } finally {
      setIsToggling(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    
    setIsTesting(true);
    try {
      const result = await onTest();
      if (result.success) {
        toast.success(`${title} test successful`);
      } else {
        toast.error(`${title} test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between h-full group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-violet-100 dark:bg-slate-800">
            <Icon className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            {!isConfigured && (
              <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                <AlertTriangle className="w-3 h-3 mr-1.5" />
                Setup Required
              </Badge>
            )}
            {isConfigured && isEnabled && (
              <Badge variant="outline" className="border-green-400 text-green-600">
                <CheckCircle className="w-3 h-3 mr-1.5" />
                Connected
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize">{category}</Badge>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {/* Status and Toggle */}
        <div className="flex items-center justify-between">
          {isConfigured ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`font-medium ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                  {isEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isToggling && <Loader2 className="w-4 h-4 animate-spin" />}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </>
          ) : (
            <Button 
              variant="outline" 
              disabled 
              className="w-full text-yellow-600 border-yellow-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              Backend Configuration Needed
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        {isConfigured && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              Test
            </Button>
            {onConfigure && (
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigure}
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-1" />
                Configure
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}