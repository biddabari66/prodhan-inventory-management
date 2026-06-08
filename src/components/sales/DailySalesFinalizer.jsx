import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { erp } from '@/api/erpClient';
import { toast } from 'sonner';
import { CheckCircle, Loader2, CalendarCheck, Lock, AlertTriangle } from 'lucide-react';
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

export default function DailySalesFinalizer({ orders = [], hasPermission, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Get today's date in BDT
  const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
  const timeBDT = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());

  // Pre-compute eligible orders from already-loaded data (INSTANT — no API call)
  const eligibleOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const bdtFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });
    return orders.filter(o => {
      if (o.sales_day_date) return false; // Already finalized
      if (!o.order_date) return false;
      const d = new Date(o.order_date);
      if (isNaN(d.getTime())) return false;
      return bdtFmt.format(d) <= todayBDT;
    });
  }, [orders, todayBDT]);

  const handleFinalize = async () => {
    setConfirmOpen(false);
    if (eligibleOrders.length === 0) {
      toast.info('All orders are already finalized for today.');
      return;
    }

    setIsLoading(true);
    setProgress({ done: 0, total: eligibleOrders.length });

    const bdtFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });
    let finalizedCount = 0;
    let errorCount = 0;

    // Process in parallel batches of 10 — fast but respects rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < eligibleOrders.length; i += BATCH_SIZE) {
      const chunk = eligibleOrders.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        chunk.map(order => {
          const bdtDateStr = bdtFmt.format(new Date(order.order_date));
          return erp.entities.Order.update(order.id, { sales_day_date: bdtDateStr });
        })
      );

      results.forEach(r => {
        if (r.status === 'fulfilled') finalizedCount++;
        else errorCount++;
      });

      setProgress({ done: finalizedCount + errorCount, total: eligibleOrders.length });

      // Small delay between batches if more remain
      if (i + BATCH_SIZE < eligibleOrders.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setIsLoading(false);

    if (finalizedCount > 0) {
      toast.success(`✅ ${finalizedCount} orders finalized for ${todayBDT}`);
    }
    if (errorCount > 0) {
      toast.warning(`${errorCount} orders failed — try again for remaining.`);
    }
    if (finalizedCount === 0 && errorCount === 0) {
      toast.info('No orders to finalize.');
    }

    onComplete?.();
  };

  // Permission check — needs can_approve on sales module
  if (!hasPermission) return null;

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isLoading}
        className="h-10 sm:h-11 px-3 sm:px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl font-semibold transition-all hover:shadow-emerald-500/40"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {progress.total > 0 ? `${progress.done}/${progress.total}` : 'Finalizing...'}
          </>
        ) : (
          <>
            <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Finalize Sales</span>
            <span className="sm:hidden">Finalize</span>
            {eligibleOrders.length > 0 && (
              <Badge className="ml-1 bg-white/20 text-white text-xs rounded-full px-1.5 h-5 min-w-[20px] flex items-center justify-center">
                {eligibleOrders.length}
              </Badge>
            )}
          </>
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Finalize Daily Sales
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {eligibleOrders.length > 0 ? (
                <>
                  <p>
                    This will finalize <strong>{eligibleOrders.length} unfinalized orders</strong> up to today ({todayBDT}).
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
                    Each order gets a <code className="bg-blue-100 px-1 rounded">sales_day_date</code> stamp and won't be re-counted.
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">All orders are already finalized!</p>
                  <p className="text-sm mt-1">No action needed for today.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {eligibleOrders.length > 0 && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleFinalize();
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize {eligibleOrders.length} Orders
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}