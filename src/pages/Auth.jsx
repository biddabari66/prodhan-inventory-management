import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

const NEW_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png";

export default function AuthPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await User.login();
      toast.info("Redirecting you to login...");
    } catch (e) {
      console.error("Login initiation failed:", e);
      setError("Could not start the login process. Please try again.");
      toast.error("Could not start the login process. Please try again.");
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      toast.error(decodeURIComponent(errorParam));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950">
      {/* Advanced Animated Background with Grid Pattern */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-600/15 to-cyan-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-gradient-to-r from-pink-600/20 to-rose-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-2 h-2 bg-violet-400/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-fuchsia-400/30 rounded-full animate-bounce" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-cyan-400/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-20 right-20 w-4 h-4 bg-pink-400/25 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-blue-400/20 rounded-full animate-bounce" style={{ animationDelay: '1.2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-slate-900/80 backdrop-blur-2xl border border-violet-500/20 shadow-2xl shadow-violet-900/50 animate-in fade-in zoom-in-95 duration-700">
          <CardHeader className="text-center pb-8 pt-12 px-8">
            {/* Premium Logo with Advanced Effects */}
            <div className="relative mb-10">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 w-28 h-28 mx-auto">
                <div className="w-full h-full rounded-3xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-30 blur-2xl animate-pulse"></div>
              </div>
              
              {/* Logo Container */}
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl shadow-2xl animate-pulse"></div>
                <div className="absolute inset-[2px] bg-slate-950 rounded-3xl flex items-center justify-center overflow-hidden">
                  <img 
                    src={NEW_LOGO_URL} 
                    alt="Biddabari ERP" 
                    className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full mb-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Enterprise Solution</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent font-display leading-tight">
                Biddabari ERP
              </h1>
              
              <p className="text-slate-400 text-lg font-medium">
                AI-Powered Business Management
              </p>
              
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>Lightning Fast</span>
                <span className="text-slate-700">•</span>
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <span>Secure</span>
                <span className="text-slate-700">•</span>
                <Sparkles className="w-3 h-3 text-violet-500" />
                <span>Intelligent</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            {/* Premium Login Button */}
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-700 hover:via-fuchsia-700 hover:to-pink-700 text-white font-bold py-6 text-lg rounded-2xl shadow-lg shadow-violet-900/50 hover:shadow-xl hover:shadow-violet-900/70 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group border border-violet-500/20"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-6 h-6" />
                    <span>Continue with Google</span>
                    <Sparkles className="w-5 h-5 ml-1 animate-pulse" />
                  </>
                )}
              </div>
            </Button>

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-500/30 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300">
                <p className="text-center text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Secure Authentication</p>
                  <p>Your credentials are protected with enterprise-grade security. We never store your Google password.</p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="text-center pb-8 pt-4 px-8 border-t border-slate-800/50">
            <div className="w-full space-y-4">
              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>All Systems Operational</span>
                </div>
              </div>

              {/* Copyright */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  &copy; {new Date().getFullYear()} Biddabari Group. All rights reserved.
                </p>
                <p className="text-xs font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  Powered by Advanced AI Technology
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Bottom Stats/Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-violet-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">99.9%</div>
            <div className="text-xs text-slate-500 mt-1">Uptime</div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm border border-violet-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-fuchsia-400">500+</div>
            <div className="text-xs text-slate-500 mt-1">Active Users</div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm border border-violet-500/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-pink-400">24/7</div>
            <div className="text-xs text-slate-500 mt-1">Support</div>
          </div>
        </div>
      </div>

      {/* Version Badge */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-900/50 backdrop-blur-sm border border-violet-500/20 rounded-full text-xs text-slate-400 font-mono">
        v3.0.0 Beta
      </div>
    </div>
  );
}