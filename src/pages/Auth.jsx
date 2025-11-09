import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogIn, Loader2, Mail, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-violet-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/25 to-cyan-500/25 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-2 h-2 bg-white/20 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-violet-400/30 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-pink-400/30 rounded-full animate-bounce delay-500"></div>
        <div className="absolute bottom-20 right-20 w-4 h-4 bg-blue-400/20 rounded-full animate-bounce delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-violet-500/25 animate-in fade-in zoom-in-95 duration-700">
          <CardHeader className="text-center pb-8 pt-12">
            {/* Premium Logo Container */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-black rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden">
                {/* Subtle inner gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-2xl"></div>
                <img 
                  src={NEW_LOGO_URL} 
                  alt="Biddabari ERP" 
                  className="w-20 h-20 object-contain relative z-10"
                />
              </div>
              {/* Glowing Ring Effect */}
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-2xl bg-gradient-to-r from-violet-500/30 via-purple-500/30 to-pink-500/30 blur-lg animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-display">
                Welcome to Biddabari ERP
              </h1>
              <p className="text-gray-600 text-lg">Sign in to continue</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group"
            >
              {/* Button Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-6 h-6" />
                    <span>Sign in with Google</span>
                    <Sparkles className="w-5 h-5 ml-1 animate-pulse" />
                  </>
                )}
              </div>
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-center text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="text-center pb-8 pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 justify-center text-sm text-gray-500">
                <div className="w-8 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
                <span>Secure Authentication</span>
                <div className="w-8 h-px bg-gradient-to-l from-transparent to-gray-300"></div>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <p>&copy; {new Date().getFullYear()} Biddabari Group. All rights reserved.</p>
                <p className="font-medium bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                  Advanced ERP Solution
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Additional Decorative Elements */}
      <div className="absolute bottom-4 right-4 text-white/30 text-xs">
        v2.0.1
      </div>
    </div>
  );
}