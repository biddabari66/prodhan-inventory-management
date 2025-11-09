import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { markAttendance } from '@/functions/markAttendance';
import { Attendance } from '@/entities/Attendance';

function DigitalClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="p-4 rounded-lg bg-primary-foreground/5">
            <p className="text-5xl font-bold tracking-tight text-gradient">
                {format(time, 'HH:mm:ss')}
            </p>
            <p className="text-muted-foreground mt-1">
                {format(time, 'eeee, dd MMMM yyyy')}
            </p>
        </div>
    );
}

export default function CheckInOut({ currentUser }) {
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);

    const loadTodayAttendance = async () => {
        setIsLoading(true);
        if (!currentUser || !currentUser.employee_id) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await Attendance.filter({
                employee_id: currentUser.employee_id,
                date: today
            });
            if (data && data.length > 0) {
                setTodayAttendance(data[0]);
            } else {
                setTodayAttendance(null);
            }
        } catch (error) {
            console.error("Failed to load today's attendance:", error);
            toast.error("Could not fetch today's attendance data.");
        } finally {
            setIsLoading(false);
        }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocationError(null);
            },
            () => {
                setLocationError("Unable to retrieve your location. Please enable location services.");
            },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        loadTodayAttendance();
        getLocation();
    }, [currentUser]);

    const handleAttendanceAction = async (type) => {
        setIsCheckingIn(true);
        if (!location) {
            toast.error("Location not available. Please enable location and try again.");
            setIsCheckingIn(false);
            return;
        }

        try {
            const { data, error } = await markAttendance({ 
                type: type,
                latitude: location.latitude,
                longitude: location.longitude,
            });

            if (error || !data.success) {
                throw new Error(error || data.message || `${type.charAt(0).toUpperCase() + type.slice(1)} failed.`);
            }
            
            toast.success(data.message);
            loadTodayAttendance();

        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsCheckingIn(false);
        }
    };

    const hasCheckedIn = todayAttendance && todayAttendance.check_in_time;
    const hasCheckedOut = todayAttendance && todayAttendance.check_out_time;

    return (
        <Card className="premium-card">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold text-gradient">Attendance System</CardTitle>
                        <CardDescription>Secure, location-verified attendance tracking</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600 p-2 bg-green-500/10 rounded-lg whitespace-nowrap">
                        <ShieldCheck className="w-5 h-5"/>
                        <span>Geo Protection Active</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="text-center space-y-6">
                <DigitalClock />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Today's Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium">Status:</span>
                                    <Badge variant={hasCheckedIn ? "default" : "secondary"}>
                                        {hasCheckedOut ? "Checked Out" : hasCheckedIn ? "Checked In" : "Not Checked In"}
                                    </Badge>
                                </div>
                                <Button 
                                    onClick={() => handleAttendanceAction('check-in')} 
                                    disabled={isCheckingIn || hasCheckedIn}
                                    className="w-full h-14 text-lg"
                                >
                                    {isCheckingIn && !hasCheckedIn && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    <CheckCircle className="mr-2 h-5 w-5" /> Check In
                                </Button>
                                <Button 
                                    onClick={() => handleAttendanceAction('check-out')} 
                                    variant="outline"
                                    disabled={isCheckingIn || !hasCheckedIn || hasCheckedOut}
                                    className="w-full h-14 text-lg"
                                >
                                    {isCheckingIn && hasCheckedIn && !hasCheckedOut && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    <XCircle className="mr-2 h-5 w-5" /> Check Out
                                </Button>
                                {locationError && <p className="text-xs text-red-500">{locationError}</p>}
                                {location && <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> Location Acquired</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}