import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, UserCheck, UserX, Sunrise, Sunset, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Attendance } from "@/entities/Attendance";
import { User } from "@/entities/User";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceOverview() {
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, onTime: 0, totalEmployees: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().slice(0, 10);
        
        const [attendanceData, employeeData] = await Promise.all([
            Attendance.filter({ date: today }),
            User.list()
        ]);
        
        const presentToday = attendanceData.filter(a => a.status === 'present' || a.status === 'late');
        const lateToday = attendanceData.filter(a => a.status === 'late');
        const onTimeToday = attendanceData.filter(a => a.status === 'present');
        
        setStats({
          present: presentToday.length,
          absent: employeeData.length - presentToday.length,
          late: lateToday.length,
          onTime: onTimeToday.length,
          totalEmployees: employeeData.length
        });
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        setError("Could not load attendance data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendanceData();
  }, []);

  const attendanceMetrics = [
    { title: "Total Employees", value: stats.totalEmployees, icon: Users, color: "text-sky-400" },
    { title: "On-Time", value: stats.onTime, icon: Sunrise, color: "text-emerald-400" },
    { title: "Late Arrivals", value: stats.late, icon: Sunset, color: "text-amber-400" },
    { title: "Absent Today", value: stats.absent, icon: UserX, color: "text-red-400" },
  ];

  return (
    <div className="card-glassmorphic p-6 sm:p-8 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-2xl shadow-glow-blue border border-blue-500/20">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-gradient">Daily Attendance</h3>
            <p className="text-sm text-muted-foreground">Live overview for today</p>
          </div>
        </div>
        <Badge className="bg-blue-500/20 text-blue-300 text-sm font-bold border border-blue-500/30">
            <Calendar className="w-3 h-3 mr-2" />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="p-4 bg-black/20 rounded-lg space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                </div>
            ))
        ) : error ? (
            <div className="col-span-2 text-center text-red-400 p-4 bg-red-900/20 rounded-lg">{error}</div>
        ) : (
          attendanceMetrics.map((metric, index) => (
            <div key={index} className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <h4 className="text-sm font-semibold text-gray-400">{metric.title}</h4>
                </div>
              <p className="text-3xl font-bold text-white font-display">{metric.value}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}