import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || !['admin', 'manager', 'department_head'].includes(user.job_role)) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unauthorized: You do not have permission to update attendance records' 
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { 
            attendance_id, 
            new_status, 
            manual_entry_reason, 
            manual_entry_by 
        } = await req.json();

        if (!attendance_id || !new_status) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing required parameters: attendance_id and new_status' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update the attendance record
        const updateData = {
            status: new_status,
            manual_entry_reason: manual_entry_reason || 'Manual adjustment by admin',
            manual_entry_by_id: manual_entry_by || user.id,
            manual_entry_timestamp: new Date().toISOString()
        };

        await base44.entities.Attendance.update(attendance_id, updateData);

        // Create audit log entry
        try {
            await base44.entities.AuditLog.create({
                user_id: user.id,
                user_name: user.full_name,
                action: 'update',
                entity_type: 'Attendance',
                entity_id: attendance_id,
                module: 'Payroll Management',
                description: `Updated attendance status to '${new_status}' for payroll adjustment. Reason: ${manual_entry_reason || 'Admin override'}`,
                timestamp: new Date().toISOString()
            });
        } catch (auditError) {
            console.warn('Failed to create audit log:', auditError);
            // Don't fail the main operation if audit log fails
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Attendance record updated successfully' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating attendance:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to update attendance record: ' + error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});