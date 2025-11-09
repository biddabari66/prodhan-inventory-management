import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if already in standalone mode (already installed)
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone || 
                        document.referrer.includes('android-app://');
    setIsInStandaloneMode(inStandalone);

    // Don't show prompt if already installed
    if (inStandalone) {
      return;
    }

    // Handle beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // For iOS, show prompt after a delay if not dismissed before
    if (isIOSDevice) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        toast.success('App installed successfully!');
      } else {
        toast.info('Installation cancelled');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // iOS installation instructions
      toast.info('To install: Tap the Share button and select "Add to Home Screen"', {
        duration: 8000
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    // Auto-show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showPrompt || isInStandaloneMode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm pwa-install-banner">
      <Card className="premium-card border-violet-200 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-sm">Install Biddabari ERP</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-4">
            Get the full app experience! Install for faster access and offline capabilities.
          </p>
          
          {isIOS ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="w-3 h-3 text-violet-500" />
                <span>Tap the Share button below</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Download className="w-3 h-3 text-violet-500" />
                <span>Select "Add to Home Screen"</span>
              </div>
              <Button onClick={handleInstallClick} className="w-full btn-primary text-xs h-8">
                Show Instructions
              </Button>
            </div>
          ) : (
            <Button onClick={handleInstallClick} className="w-full btn-primary text-xs h-8">
              <Download className="w-3 h-3 mr-2" />
              Install App
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}