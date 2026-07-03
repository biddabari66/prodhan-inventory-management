import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Loader2, Lock, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function AuthPage() {
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@bee-erp.com',
      password: 'Admin@BeeERP123!',
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      toast.error(decodeURIComponent(errorParam));
    }
  }, []);

  const onSubmit = async (data) => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await login(data);
      toast.success('Welcome back!');
      window.location.href = '/';
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Login failed. Check your credentials.';
      setError(msg);
      toast.error(msg);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-orange-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <CardHeader className="text-center pb-4 pt-10">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ZYPRA ERP</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your workspace</p>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    className={`pl-9 ${errors.email ? 'border-red-500' : ''}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`pl-9 ${errors.password ? 'border-red-500' : ''}`}
                    {...register('password')}
                  />
                </div>
                {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-700 hover:to-orange-700"
              >
                {isLoggingIn ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
