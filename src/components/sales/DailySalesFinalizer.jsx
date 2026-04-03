import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CheckCircle, Loader2, CalendarCheck, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { finalizeDailySales } from '@/functions/finalizeDailySales';

export default function DailySalesFinalizer({ isAdmin, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  // Get today's date in BDT
  const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
  const timeBDT = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());

  const handleFinalize = async () => {
    setConfirmOpen(false);
    setIsLoading(true);
    try {
      const response = await finalizeDailySales({ sales_date: todayBDT });
      const data = response.data;
      
      if (data.success) {
        setResult(data);
        if (data.finalized_count > 0) {
          toast.success(`✅ ${data.finalized_count} orders finalized for ${todayBDT}`);
        } else {
          toast.info('All orders are already finalized for today.');
        }
        onComplete?.();
      } else {
        toast.error(data.error || 'Failed to finalize');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isLoading}
        className="h-11 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl font-semibold transition-all hover:shadow-emerald-500/40"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Finalizing...
          </>
        ) : (
          <>
            <CalendarCheck className="w-5 h-5 mr-2" />
            Finalize Today's Sales
          </>
        )}
      </Button>

      {result && result.finalized_count > 0 && (
        <Badge className="bg-emerald-100 text-emerald-800 rounded-full px-3 h-8 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {result.finalized_count} finalized
        </Badge>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Finalize Daily Sales
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will mark <strong>all orders up to today ({todayBDT})</strong> as finalized for daily sales counting.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                <strong>Current time (BDT):</strong> {timeBDT}
                <br />
                <strong>Business day:</strong> {todayBDT}
                <br /><br />
                Orders received <strong>after</strong> you press this button will count towards <strong>tomorrow's</strong> sales.
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
                <Lock className="w-4 h-4 inline mr-1" />
                Once finalized, each order gets a <code>sales_day_date</code> stamp and won't be re-counted.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalize}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalize Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}