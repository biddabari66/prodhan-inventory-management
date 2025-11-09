import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { generateDailyDigest } from '@/functions/generateDailyDigest';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DailyAIDigest({ user }) {
  const [digest, setDigest] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDigest = async () => {
    setIsLoading(true);
    setError(null);
    
    if (!user) {
      setError("User information not available");
      setIsLoading(false);
      return;
    }

    try {
      const response = await generateDailyDigest({ 
        userDetails: {
          full_name: user.full_name || 'Employee',
          designation: user.designation || user.job_role || 'Team Member'
        }
      });
      
      if (response.data?.digest) {
        setDigest(response.data.digest);
      } else {
        throw new Error(response.data?.error || 'Failed to generate digest');
      }
    } catch (err) {
      console.error("Error fetching AI digest:", err);
      setError(err.message);
      
      // Fallback message if digest generation fails
      const currentHour = new Date().getHours();
      const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
      setDigest(`${greeting}, ${user.full_name || 'there'}! Have a productive day at work. Remember to stay focused and achieve your goals today.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDigest();
    }
  }, [user]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-violet-300 animate-spin" />
        </div>
      );
    }
    if (error && !digest) {
      return (
        <div className="text-center text-rose-200">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-medium">Could not load digest</p>
          <Button variant="link" size="sm" className="text-rose-200 h-auto p-0 mt-2" onClick={fetchDigest}>Try again</Button>
        </div>
      );
    }
    return (
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-light">
        {digest}
      </p>
    );
  };

  // Don't render if no user data
  if (!user) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2c225a] via-[#211a42] to-[#1a1433] border border-violet-500/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-base bg-gradient-to-r from-violet-300 to-white bg-clip-text text-transparent">
              Daily AI Digest
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-violet-400 hover:bg-white/10 hover:text-white" onClick={fetchDigest} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      <div className="p-3 bg-black/20 rounded-lg min-h-[100px] flex flex-col justify-center">
        {renderContent()}
      </div>
       <p className="text-xs text-violet-400/50 text-right mt-2">
            Generated at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
    </div>
  );
}