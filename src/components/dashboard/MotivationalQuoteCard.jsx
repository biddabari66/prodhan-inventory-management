import React, { useState, useEffect } from 'react';
import { generateMotivationalQuote } from '@/functions/generateMotivationalQuote';
import { RefreshCw, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MotivationalQuoteCard({ user }) {
  const [quoteData, setQuoteData] = useState({ quote: '', author: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuote = async () => {
    setIsLoading(true);
    setError(null);

    console.log("🔄 Fetching new motivational quote...");
    try {
      const { data } = await generateMotivationalQuote({});
      if (data && data.quote) {
        setQuoteData(data);
        console.log("✅ New quote fetched successfully.");
      } else {
        throw new Error(data.error || "Invalid response from server");
      }
    } catch (e) {
      console.error('❌ Failed to fetch quote:', e);
      setError(e.message);
      toast.error("Could not fetch a new quote.", {
        description: "Please try again in a moment."
      });
      // Fallback quote
      setQuoteData({ quote: "The secret of getting ahead is getting started.", author: "Mark Twain" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <div className="bg-pink-100 p-4 premium-card space-y-3 relative">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">STRATEGIC & INNOVATIVE QUOTE</h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7"
          onClick={() => fetchQuote()}
          disabled={isLoading}>

          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {error && !quoteData.quote ?
      <div className="text-center py-4 text-red-500">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-medium">Could not load quote</p>
        </div> :

      <div>
          <blockquote className="text-foreground italic text-sm border-l-2 border-orange-500 pl-3">
            "{quoteData.quote || 'Loading your daily inspiration...'}"
          </blockquote>
          <p className="text-right text-xs text-muted-foreground mt-2 font-medium">— {quoteData.author || 'Think Tank'}</p>
        </div>
      }
    </div>);

}