import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Loader2, MapPin, Shield, Clock, CheckCircle, AlertTriangle, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { markAttendance } from '@/functions/markAttendance';
import { erp } from '@/api/erpClient';

const LiveClock = React.memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-center py-6">
      <div className="text-5xl font-black text-white tabular-nums tracking-tight">{format(time, 'HH:mm:ss')}</div>
      <div className="text-base text-white/80 font-medium mt-2">{format(time, 'EEEE, d MMMM yyyy')}</div>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">Bangladesh Time</span>
      </div>
    </div>
  );
});
LiveClock.displayName = 'LiveClock';

export default function MobileCheckInOut({ currentUser, todayAttendance, onRefresh }) {
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState(null);

  const getLocation = useCallback(async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('GPS not supported')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0
        });
      });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
    } catch (e) {
      setLocError(e.code === 1 ? 'Location denied. Enable GPS.' : 'Could not get location. Try again.');
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  const handleAction = useCallback(async (action) => {
    if (!location) { toast.error('GPS location required.'); getLocation(); return; }
    setIsSubmitting(true);
    setSubmitAction(action);
    try {
      const response = await markAttendance({
        action,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      });
      if (response.data?.success) {
        toast.success(response.data.message);
        onRefresh?.();
      } else {
        toast.error(response.data?.error || 'Failed. Try again.');
      }
    } catch (e) {
      toast.error(e.message || 'Network error. Try again.');
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  }, [location, onRefresh, getLocation]);

  const hasCheckedIn = !!todayAttendance?.check_in_time;
  const hasCheckedOut = !!todayAttendance?.check_out_time;

  const statusInfo = useMemo(() => {
    if (hasCheckedOut) return { label: 'Day Complete', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: CheckCircle };
    if (hasCheckedIn) return { label: 'Working...', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', icon: Clock };
    return { label: 'Not Checked In', color: 'bg-slate-400', textColor: 'text-slate-700', bgColor: 'bg-slate-100', icon: AlertTriangle };
  }, [hasCheckedIn, hasCheckedOut]);

  return (
    <div className="space-y-4">
      {/* Clock Card */}
      <div className="rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-red-800 shadow-xl overflow-hidden">
        <LiveClock />
      </div>

      {/* Location Status - Compact */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${location ? 'bg-emerald-500 animate-pulse' : locLoading ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
        <div className="flex-1 min-w-0">
          {locLoading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Getting GPS...</p>
          ) : location ? (
            <p className="text-sm text-emerald-700 font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Location locked • {Math.round(location.accuracy)}m accuracy</p>
          ) : (
            <p className="text-sm text-red-600 font-medium">{locError || 'Location unavailable'}</p>
          )}
        </div>
        {!locLoading && !location && (
          <Button variant="ghost" size="sm" onClick={getLocation} className="h-8 px-2 text-xs">Retry</Button>
        )}
      </div>

      {/* Status + Times */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Status Bar */}
          <div className={`px-5 py-3.5 ${statusInfo.bgColor} flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <statusInfo.icon className={`w-5 h-5 ${statusInfo.textColor}`} />
              <span className={`font-semibold text-sm ${statusInfo.textColor}`}>{statusInfo.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">GPS Verified</span>
            </div>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
            <TimeCell label="Check In" value={todayAttendance?.check_in_time} status={todayAttendance?.status} />
            <TimeCell label="Check Out" value={todayAttendance?.check_out_time} />
            <TimeCell label="Hours" value={todayAttendance?.working_hours != null ? `${Number(todayAttendance.working_hours).toFixed(1)}h` : null} />
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3 bg-slate-50/50">
            <Button
              onClick={() => handleAction('check_in')}
              disabled={isSubmitting || hasCheckedIn || locLoading || !location}
              className="w-full h-14 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
            >
              {isSubmitting && submitAction === 'check_in' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              {hasCheckedIn ? 'Already Checked In ✓' : 'Check In Now'}
            </Button>

            <Button
              onClick={() => handleAction('check_out')}
              disabled={isSubmitting || !hasCheckedIn || hasCheckedOut || locLoading || !location}
              variant="outline"
              className="w-full h-14 rounded-xl text-base font-bold border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isSubmitting && submitAction === 'check_out' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5 mr-2" />
              )}
              {hasCheckedOut ? 'Day Complete ✓' : 'Check Out'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anti-cheat notice */}
      <p className="text-center text-[11px] text-slate-400 font-medium px-4">
        🔒 Attendance is GPS-verified, time-stamped server-side, and tamper-proof
      </p>
    </div>
  );
}

function TimeCell({ label, value, status }) {
  return (
    <div className="py-4 px-3 text-center">
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
      {value ? (
        <p className="text-lg font-bold text-slate-800 font-mono">{value}</p>
      ) : (
        <p className="text-lg text-slate-300 font-mono">--:--</p>
      )}
      {status && (
        <Badge className={`mt-1 text-[10px] px-2 py-0 ${status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {status === 'late' ? 'Late' : 'On Time'}
        </Badge>
      )}
    </div>
  );
}