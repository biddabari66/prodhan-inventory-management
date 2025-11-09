import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        const { action, latitude, longitude, accuracy } = await req.json();

        // Get attendance settings
        const settingsList = await base44.entities.AttendanceSetting.list();
        if (!settingsList || settingsList.length === 0) {
            return Response.json({
                success: false,
                error: 'Attendance system not configured. Please contact administrator.',
                code: 'SYSTEM_NOT_CONFIGURED'
            });
        }

        const settings = settingsList[0];

        // Validate GPS accuracy
        if (accuracy > settings.max_gps_accuracy_meters) {
            return Response.json({
                success: false,
                error: `GPS accuracy too poor (${Math.round(accuracy)}m). Please try again with better signal.`,
                code: 'GPS_ACCURACY_ERROR'
            });
        }

        // Calculate distance from office
        const distance = calculateDistance(
            latitude, longitude, 
            settings.office_latitude, settings.office_longitude
        );

        if (distance > settings.radius_meters) {
            return Response.json({
                success: false,
                error: `You are ${Math.round(distance)}m away from office. Must be within ${settings.radius_meters}m to ${action.replace('_', ' ')}.`,
                code: 'LOCATION_OUT_OF_RANGE'
            });
        }

        // Get current time in Bangladesh timezone
        const bangladeshTime = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const bangladeshDateTime = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Dhaka',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date());

        // Check for existing attendance record
        const existingRecords = await base44.entities.Attendance.filter({
            employee_id: user.id,
            date: bangladeshTime
        });

        let attendanceRecord = existingRecords.length > 0 ? existingRecords[0] : null;

        if (action === 'check_in') {
            if (attendanceRecord && attendanceRecord.check_in_time) {
                return Response.json({
                    success: false,
                    error: 'Already checked in today',
                    code: 'ALREADY_CHECKED_IN'
                });
            }

            // Get user's shift assignment to determine proper start time
            const shiftAssignments = await base44.asServiceRole.entities.EmployeeShiftAssignment.filter({
                assignee_id: user.id,
                assignee_type: 'employee',
                is_active: true
            });

            let shiftStartTime = settings.working_hours_start; // Default fallback
            let graceMinutes = settings.late_threshold_minutes; // Default grace period

            if (shiftAssignments.length > 0) {
                // Get shift details
                const shifts = await base44.asServiceRole.entities.Shift.filter({
                    id: shiftAssignments[0].shift_id,
                    is_active: true
                });
                
                if (shifts.length > 0) {
                    shiftStartTime = shifts[0].start_time;
                    graceMinutes = shifts[0].grace_minutes || settings.late_threshold_minutes;
                }
            }

            // FIXED: Calculate late status with proper grace period logic
            const status = calculateAttendanceStatus(bangladeshDateTime, shiftStartTime, graceMinutes);

            const recordData = {
                employee_id: user.id,
                employee_name: user.display_name || user.full_name,
                date: bangladeshTime,
                check_in_time: bangladeshDateTime,
                status: status,
                check_in_latitude: latitude,
                check_in_longitude: longitude,
                location_accuracy: accuracy,
                distance_from_office: distance,
                check_in_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
                device_info: req.headers.get('user-agent') || 'unknown'
            };

            if (attendanceRecord) {
                attendanceRecord = await base44.entities.Attendance.update(attendanceRecord.id, recordData);
            } else {
                attendanceRecord = await base44.entities.Attendance.create(recordData);
            }

            // Send notification for late check-in
            if (status === 'late') {
                await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Send a gentle reminder notification to ${user.full_name} that they checked in late at ${bangladeshDateTime} and should try to arrive on time for better attendance records.`
                });
            }

            return Response.json({
                success: true,
                message: `✅ Check-in successful! Status: ${status.toUpperCase()}`,
                data: {
                    ...attendanceRecord,
                    bangladesh_time: `${bangladeshTime} ${bangladeshDateTime}`,
                    distance_from_office: Math.round(distance),
                    location_accuracy: Math.round(accuracy)
                }
            });

        } else if (action === 'check_out') {
            if (!attendanceRecord || !attendanceRecord.check_in_time) {
                return Response.json({
                    success: false,
                    error: 'No check-in record found for today',
                    code: 'NO_CHECK_IN_RECORD'
                });
            }

            if (attendanceRecord.check_out_time) {
                return Response.json({
                    success: false,
                    error: 'Already checked out today',
                    code: 'ALREADY_CHECKED_OUT'
                });
            }

            // Calculate working hours
            const workingHours = calculateWorkingHours(attendanceRecord.check_in_time, bangladeshDateTime);

            const updateData = {
                check_out_time: bangladeshDateTime,
                check_out_latitude: latitude,
                check_out_longitude: longitude,
                working_hours: workingHours
            };

            attendanceRecord = await base44.entities.Attendance.update(attendanceRecord.id, updateData);

            return Response.json({
                success: true,
                message: `✅ Check-out successful! Worked ${workingHours.toFixed(1)} hours today.`,
                data: {
                    ...attendanceRecord,
                    bangladesh_time: `${bangladeshTime} ${bangladeshDateTime}`,
                    distance_from_office: Math.round(distance),
                    location_accuracy: Math.round(accuracy)
                }
            });
        }

    } catch (error) {
        console.error('Attendance marking error:', error);
        return Response.json({
            success: false,
            error: 'An error occurred while processing attendance. Please try again.',
            code: 'SYSTEM_ERROR'
        });
    }
});

// FIXED: Proper late status calculation with grace period
function calculateAttendanceStatus(currentTime, shiftStartTime, graceMinutes) {
    try {
        // Parse times (format: "HH:mm:ss")
        const [currentHour, currentMinute, currentSecond] = currentTime.split(':').map(Number);
        const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);
        
        // Convert to total minutes for easy comparison
        const currentTotalMinutes = (currentHour * 60) + currentMinute + (currentSecond / 60);
        const shiftTotalMinutes = (shiftHour * 60) + shiftMinute;
        const graceEndMinutes = shiftTotalMinutes + graceMinutes;
        
        console.log(`Attendance Status Check:`, {
            currentTime,
            shiftStartTime,
            graceMinutes,
            currentTotalMinutes: currentTotalMinutes.toFixed(1),
            shiftTotalMinutes,
            graceEndMinutes,
            isWithinGrace: currentTotalMinutes <= graceEndMinutes
        });
        
        // Within grace period = present, after grace period = late
        if (currentTotalMinutes <= graceEndMinutes) {
            return 'present';
        } else {
            return 'late';
        }
    } catch (error) {
        console.error('Error calculating attendance status:', error);
        return 'present'; // Default to present if calculation fails
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function calculateWorkingHours(checkInTime, checkOutTime) {
    try {
        const [inHour, inMinute, inSecond] = checkInTime.split(':').map(Number);
        const [outHour, outMinute, outSecond] = checkOutTime.split(':').map(Number);
        
        const inTotalMinutes = (inHour * 60) + inMinute + (inSecond / 60);
        const outTotalMinutes = (outHour * 60) + outMinute + (outSecond / 60);
        
        const workingMinutes = outTotalMinutes - inTotalMinutes;
        return Math.max(0, workingMinutes / 60); // Convert to hours, ensure non-negative
    } catch (error) {
        console.error('Error calculating working hours:', error);
        return 0;
    }
}