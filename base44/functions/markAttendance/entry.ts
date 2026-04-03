import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
        }

        const body = await req.json();
        const { action, latitude, longitude, accuracy } = body;

        // ===== ANTI-CHEAT: Validate required fields =====
        if (!action || !latitude || !longitude || accuracy === undefined) {
            return Response.json({ success: false, error: 'Missing required location data.', code: 'INVALID_DATA' });
        }

        // ===== ANTI-CHEAT: Reject obviously fake coordinates =====
        if (latitude === 0 && longitude === 0) {
            return Response.json({ success: false, error: 'Invalid GPS coordinates detected.', code: 'FAKE_LOCATION' });
        }
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return Response.json({ success: false, error: 'GPS coordinates out of valid range.', code: 'INVALID_COORDINATES' });
        }

        // ===== ANTI-CHEAT: Reject mock locations (accuracy check) =====
        if (accuracy < 1) {
            return Response.json({ success: false, error: 'Mock location detected. Disable location spoofing apps.', code: 'MOCK_LOCATION' });
        }

        // Get attendance settings
        const settingsList = await base44.entities.AttendanceSetting.list();
        if (!settingsList || settingsList.length === 0) {
            return Response.json({ success: false, error: 'Attendance system not configured. Contact administrator.', code: 'SYSTEM_NOT_CONFIGURED' });
        }
        const settings = settingsList[0];

        // ===== ANTI-CHEAT: GPS accuracy gate =====
        const maxAccuracy = settings.max_gps_accuracy_meters || 150;
        if (accuracy > maxAccuracy) {
            return Response.json({
                success: false,
                error: `GPS accuracy too poor (${Math.round(accuracy)}m). Max allowed: ${maxAccuracy}m. Move to an open area.`,
                code: 'GPS_ACCURACY_ERROR'
            });
        }

        // ===== ANTI-CHEAT: Distance from office =====
        const distance = calculateDistance(latitude, longitude, settings.office_latitude, settings.office_longitude);
        if (distance > settings.radius_meters) {
            return Response.json({
                success: false,
                error: `You are ${Math.round(distance)}m away from office. Must be within ${settings.radius_meters}m.`,
                code: 'LOCATION_OUT_OF_RANGE'
            });
        }

        // ===== Get Bangladesh time (server-side, tamper-proof) =====
        const now = new Date();
        const bdDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const bdTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Check existing attendance
        const existingRecords = await base44.entities.Attendance.filter({ employee_id: user.id, date: bdDate });
        let attendanceRecord = existingRecords.length > 0 ? existingRecords[0] : null;

        if (action === 'check_in') {
            if (attendanceRecord && attendanceRecord.check_in_time) {
                return Response.json({ success: false, error: 'Already checked in today.', code: 'ALREADY_CHECKED_IN' });
            }

            // ===== ANTI-CHEAT: Prevent rapid re-creation (within 60s) =====
            if (attendanceRecord && attendanceRecord.created_date) {
                const createdAt = new Date(attendanceRecord.created_date);
                if ((now.getTime() - createdAt.getTime()) < 60000) {
                    return Response.json({ success: false, error: 'Please wait before trying again.', code: 'RATE_LIMITED' });
                }
            }

            // Get shift info for late calculation
            let shiftStartTime = settings.working_hours_start || '09:00';
            let graceMinutes = settings.late_threshold_minutes || 15;

            try {
                const shiftAssignments = await base44.asServiceRole.entities.EmployeeShiftAssignment.filter({
                    assignee_id: user.id, assignee_type: 'employee', is_active: true
                });
                if (shiftAssignments.length > 0) {
                    const shifts = await base44.asServiceRole.entities.Shift.filter({ id: shiftAssignments[0].shift_id, is_active: true });
                    if (shifts.length > 0) {
                        shiftStartTime = shifts[0].start_time || shiftStartTime;
                        graceMinutes = shifts[0].grace_minutes || graceMinutes;
                    }
                }
            } catch (e) {
                console.warn('Could not load shift info, using defaults:', e.message);
            }

            const status = calculateAttendanceStatus(bdTime, shiftStartTime, graceMinutes);

            const recordData = {
                employee_id: user.id,
                employee_name: user.display_name || user.full_name,
                date: bdDate,
                check_in_time: bdTime,
                status,
                check_in_latitude: latitude,
                check_in_longitude: longitude,
                location_accuracy: Math.round(accuracy),
                distance_from_office: Math.round(distance),
                check_in_ip_address: clientIP,
                device_info: userAgent
            };

            if (attendanceRecord) {
                attendanceRecord = await base44.entities.Attendance.update(attendanceRecord.id, recordData);
            } else {
                attendanceRecord = await base44.entities.Attendance.create(recordData);
            }

            return Response.json({
                success: true,
                message: `Check-in successful! Status: ${status.toUpperCase()}`,
                data: { ...attendanceRecord, bangladesh_time: `${bdDate} ${bdTime}`, distance_from_office: Math.round(distance), location_accuracy: Math.round(accuracy) }
            });

        } else if (action === 'check_out') {
            if (!attendanceRecord || !attendanceRecord.check_in_time) {
                return Response.json({ success: false, error: 'No check-in record found for today.', code: 'NO_CHECK_IN_RECORD' });
            }
            if (attendanceRecord.check_out_time) {
                return Response.json({ success: false, error: 'Already checked out today.', code: 'ALREADY_CHECKED_OUT' });
            }

            const workingHours = calculateWorkingHours(attendanceRecord.check_in_time, bdTime);

            // ===== ANTI-CHEAT: Minimum working time check (at least 1 minute) =====
            if (workingHours < 0.02) {
                return Response.json({ success: false, error: 'Cannot check out within 1 minute of check-in.', code: 'TOO_EARLY_CHECKOUT' });
            }

            const updateData = {
                check_out_time: bdTime,
                check_out_latitude: latitude,
                check_out_longitude: longitude,
                check_out_ip_address: clientIP,
                working_hours: Math.round(workingHours * 100) / 100
            };

            attendanceRecord = await base44.entities.Attendance.update(attendanceRecord.id, updateData);

            return Response.json({
                success: true,
                message: `Check-out successful! Worked ${workingHours.toFixed(1)} hours.`,
                data: { ...attendanceRecord, bangladesh_time: `${bdDate} ${bdTime}`, distance_from_office: Math.round(distance), location_accuracy: Math.round(accuracy) }
            });
        }

        return Response.json({ success: false, error: 'Invalid action.', code: 'INVALID_ACTION' });

    } catch (error) {
        console.error('Attendance error:', error);
        return Response.json({ success: false, error: 'System error. Please try again.', code: 'SYSTEM_ERROR' }, { status: 500 });
    }
});

function calculateAttendanceStatus(currentTime, shiftStartTime, graceMinutes) {
    try {
        const [ch, cm] = currentTime.split(':').map(Number);
        const [sh, sm] = shiftStartTime.split(':').map(Number);
        const currentMin = ch * 60 + cm;
        const shiftMin = sh * 60 + sm + graceMinutes;
        return currentMin <= shiftMin ? 'present' : 'late';
    } catch (e) {
        return 'present';
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateWorkingHours(checkIn, checkOut) {
    try {
        const [ih, im, is] = checkIn.split(':').map(Number);
        const [oh, om, os] = checkOut.split(':').map(Number);
        return Math.max(0, ((oh * 60 + om + (os || 0) / 60) - (ih * 60 + im + (is || 0) / 60)) / 60);
    } catch (e) { return 0; }
}