import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZoomClass } from '@/entities/ZoomClass';
import { StudentAttendance } from '@/entities/StudentAttendance';
import { User } from '@/entities/User';
import { RefreshCw, Video, Users } from 'lucide-react';

export default function LiveAttendanceDashboard() {
  const [liveClasses, setLiveClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLiveDashboardData();
    const interval = setInterval(fetchLiveDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLiveDashboardData = async () => {
    setIsLoading(true);
    try {
      const [allClasses, allAttendance, allInstructors] = await Promise.all([
        ZoomClass.list(),
        StudentAttendance.list(),
        User.filter({ designation: 'Instructor' })
      ]);
      
      const live = allClasses.filter(c => c.status === 'live');
      setLiveClasses(live);
      setAttendance(allAttendance);
      setInstructors(allInstructors);
    } catch (error) {
      console.error("Error fetching live data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Live Class Monitoring</h2>
        <Button variant="outline" onClick={fetchLiveDashboardData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {liveClasses.length === 0 ? (
        <p>No classes are currently live.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveClasses.map(cls => {
            const classAttendance = attendance.filter(a => a.zoom_meeting_id === cls.zoom_meeting_id);
            const instructor = instructors.find(i => i.id === cls.instructor_id);

            return (
              <Card key={cls.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{cls.topic}</span>
                    <Badge className="bg-red-500 text-white">LIVE</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p><span className="font-semibold">Instructor:</span> {instructor?.full_name}</p>
                  <p><span className="font-semibold">Subject:</span> {cls.subject}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      <span className="text-lg font-bold">{classAttendance.length}</span>
                      <span>Participants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}