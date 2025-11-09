import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, differenceInHours } from 'date-fns';

export default function AttendanceTracker({ currentUser, attendanceData }) {
  const [elapsedTime, setElapsedTime] = useState('0h 0m');
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendanceData.find(
    a => a.employee_id === currentUser.id && a.date === today
  );

  useEffect(() => {
    if (todayAttendance && todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      const interval = setInterval(() => {
        const checkInDateTime = new Date(`${today}T${todayAttendance.check_in_time}`);
        const now = new Date();
        const hours = differenceInHours(now, checkInDateTime);
        const minutes = Math.floor((now - checkInDateTime) / (1000 * 60)) % 60;
        setElapsedTime(`${hours}h ${minutes}m`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [todayAttendance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Check-in Time</h3>
          <p>{todayAttendance?.check_in_time || 'Not checked in'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Check-out Time</h3>
          <p>{todayAttendance?.check_out_time || 'Not checked out'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Elapsed Time</h3>
          <p>{elapsedTime}</p>
        </div>
      </CardContent>
    </Card>
  );
}