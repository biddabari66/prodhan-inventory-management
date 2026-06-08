import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 📱 PWA INSTALLATION PROMPT
 * Encourages users to install the app for native-like experience
 */

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show prompt after user has been on the site for 30 seconds
      setTimeout(() => {
        const hasDeclined = localStorage.getItem('pwa_install_declined');
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
        
        if (!hasDeclined && !isInstalled) {
          setShowPrompt(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('🎉 App installed successfully!');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDecline = () => {
    localStorage.setItem('pwa_install_declined', 'true');
    setShowPrompt(false);
    toast.info('You can install anytime from browser menu');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-6 z-40 max-w-sm animate-in slide-in-from-bottom duration-500">
      <Card className="border-2 border-violet-500 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-base">Install ZYPRA ERP</p>
                <p className="text-xs text-muted-foreground">Get native app experience</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecline}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>✓</span>
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>✓</span>
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>✓</span>
              <span>Add to home screen</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Install Now
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}