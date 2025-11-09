import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role for system operations
        const serviceBase44 = base44.asServiceRole;
        
        console.log('🔔 Starting attendance reminder system...');
        
        const currentTime = new Date();
        const currentTimeString = currentTime.toTimeString().substring(0, 5); // HH:MM format
        const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
        
        console.log(`Current time: ${currentTimeString}, Day: ${currentDay}`);

        // Get all active shifts for today
        const shifts = await serviceBase44.entities.Shift.filter({
            is_active: true,
            days_of_week: { $contains: currentDay }
        });

        console.log(`Found ${shifts.length} active shifts for ${currentDay}`);
        
        let remindersSent = 0;
        let whatsappMessagesSent = 0;
        
        for (const shift of shifts) {
            try {
                // Calculate reminder times
                const shiftStartTime = new Date(`1970-01-01T${shift.start_time}:00`);
                const reminderTime = new Date(shiftStartTime.getTime() - 15 * 60 * 1000); // 15 minutes before
                const reminderTimeString = reminderTime.toTimeString().substring(0, 5);
                
                const shiftEndTime = new Date(`1970-01-01T${shift.end_time}:00`);
                const checkoutReminderTime = new Date(shiftEndTime.getTime() - 60 * 60 * 1000); // 1 hour before
                const checkoutReminderTimeString = checkoutReminderTime.toTimeString().substring(0, 5);

                console.log(`Processing shift: ${shift.shift_name} (${shift.start_time} - ${shift.end_time})`);
                console.log(`Reminder at: ${reminderTimeString}, Checkout reminder at: ${checkoutReminderTimeString}`);

                // Get employees assigned to this shift
                const shiftAssignments = await serviceBase44.entities.EmployeeShiftAssignment.filter({
                    shift_id: shift.id,
                    is_active: true
                });

                console.log(`Found ${shiftAssignments.length} employees assigned to shift ${shift.shift_name}`);

                for (const assignment of shiftAssignments) {
                    try {
                        let employee;
                        
                        if (assignment.assignee_type === 'employee') {
                            employee = await serviceBase44.entities.User.get(assignment.assignee_id);
                        } else if (assignment.assignee_type === 'department') {
                            // Get all employees in the department
                            const departmentEmployees = await serviceBase44.entities.User.filter({
                                department: assignment.assignee_id,
                                is_active: true
                            });
                            
                            for (const deptEmployee of departmentEmployees) {
                                await processEmployeeReminder(deptEmployee, shift, currentTimeString, reminderTimeString, checkoutReminderTimeString, serviceBase44);
                                remindersSent++;
                            }
                            continue;
                        }

                        if (employee && employee.is_active) {
                            await processEmployeeReminder(employee, shift, currentTimeString, reminderTimeString, checkoutReminderTimeString, serviceBase44);
                            remindersSent++;
                        }

                    } catch (empError) {
                        console.error(`Error processing employee assignment ${assignment.id}:`, empError);
                    }
                }

            } catch (shiftError) {
                console.error(`Error processing shift ${shift.id}:`, shiftError);
            }
        }

        console.log(`✅ Attendance reminder system completed. ${remindersSent} reminders processed, ${whatsappMessagesSent} WhatsApp messages sent.`);
        
        return Response.json({
            success: true,
            remindersSent,
            whatsappMessagesSent,
            message: 'Attendance reminder system executed successfully'
        });

    } catch (error) {
        console.error('❌ Attendance reminder system error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

async function processEmployeeReminder(employee, shift, currentTime, reminderTime, checkoutReminderTime, base44) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if employee already checked in today
        const todayAttendance = await base44.entities.Attendance.filter({
            employee_id: employee.id,
            date: today
        });

        // Send check-in reminder (15 minutes before shift)
        if (currentTime === reminderTime && todayAttendance.length === 0) {
            console.log(`📱 Sending check-in reminder to ${employee.full_name}`);
            
            // Create in-app notification
            await base44.entities.Notification.create({
                user_id: employee.id,
                title: '⏰ Check-in Reminder',
                message: `Your ${shift.shift_name} starts in 15 minutes (${shift.start_time}). Please remember to check in on time.`,
                category: 'attendance',
                priority: 'medium',
                is_actionable: true,
                action_text: 'Check In Now',
                action_url: '/AttendanceMy'
            });

            // Send WhatsApp reminder if activated
            if (employee.whatsapp_activated && employee.whatsapp_number) {
                try {
                    await sendWhatsAppReminder(employee, 'check_in_reminder', shift, base44);
                } catch (whatsappError) {
                    console.error(`WhatsApp reminder failed for ${employee.full_name}:`, whatsappError);
                }
            }

            // Send email reminder
            try {
                await base44.integrations.Core.SendEmail({
                    to: employee.email,
                    subject: `⏰ Check-in Reminder - ${shift.shift_name}`,
                    body: createEmailTemplate(employee, 'check_in', shift)
                });
            } catch (emailError) {
                console.error(`Email reminder failed for ${employee.full_name}:`, emailError);
            }
        }

        // Send check-out reminder (1 hour before shift ends)
        if (currentTime === checkoutReminderTime && todayAttendance.length > 0 && !todayAttendance[0].check_out_time) {
            console.log(`📱 Sending check-out reminder to ${employee.full_name}`);
            
            // Create in-app notification
            await base44.entities.Notification.create({
                user_id: employee.id,
                title: '🕐 Check-out Reminder',
                message: `Your ${shift.shift_name} ends in 1 hour (${shift.end_time}). Don't forget to check out.`,
                category: 'attendance',
                priority: 'medium',
                is_actionable: true,
                action_text: 'Check Out Now',
                action_url: '/AttendanceMy'
            });

            // Send WhatsApp reminder if activated
            if (employee.whatsapp_activated && employee.whatsapp_number) {
                try {
                    await sendWhatsAppReminder(employee, 'check_out_reminder', shift, base44);
                } catch (whatsappError) {
                    console.error(`WhatsApp reminder failed for ${employee.full_name}:`, whatsappError);
                }
            }

            // Send email reminder
            try {
                await base44.integrations.Core.SendEmail({
                    to: employee.email,
                    subject: `🕐 Check-out Reminder - ${shift.shift_name}`,
                    body: createEmailTemplate(employee, 'check_out', shift)
                });
            } catch (emailError) {
                console.error(`Email reminder failed for ${employee.full_name}:`, emailError);
            }
        }

    } catch (error) {
        console.error(`Error processing reminder for employee ${employee.full_name}:`, error);
    }
}

async function sendWhatsAppReminder(employee, reminderType, shift, base44) {
    try {
        // Use the WhatsApp attendance integration function
        const whatsappResponse = await base44.functions.invoke('whatsappAttendanceIntegration', {
            action: 'send_attendance_reminder',
            employeeIds: [employee.id],
            messageType: reminderType
        });
        
        console.log(`✅ WhatsApp ${reminderType} sent to ${employee.full_name}:`, whatsappResponse);
    } catch (error) {
        console.error(`❌ WhatsApp reminder failed for ${employee.full_name}:`, error);
        throw error;
    }
}

function createEmailTemplate(employee, reminderType, shift) {
    const baseUrl = Deno.env.get('BASE_URL') || 'https://your-app.base44.app';
    const attendanceUrl = `${baseUrl}/AttendanceMy`;
    
    const templates = {
        check_in: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">⏰ Check-in Reminder</h2>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
                <p>Hello <strong>${employee.full_name}</strong>,</p>
                <p>Your <strong>${shift.shift_name}</strong> starts in 15 minutes at <strong>${shift.start_time}</strong>.</p>
                <p>Please remember to check in on time to maintain your attendance record.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${attendanceUrl}" style="background: #7C3AED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        ✅ Check In Now
                    </a>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #7C3AED;">
                    <p style="margin: 0; color: #666;"><strong>Tip:</strong> Bookmark your attendance page for quick access!</p>
                </div>
                
                <p style="margin-top: 20px;">Stay productive and have a great day!</p>
                <p><strong>Bee ERP HR Team</strong></p>
            </div>
        </div>
        `,
        check_out: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">🕐 Check-out Reminder</h2>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
                <p>Hello <strong>${employee.full_name}</strong>,</p>
                <p>Your <strong>${shift.shift_name}</strong> ends in 1 hour at <strong>${shift.end_time}</strong>.</p>
                <p>Don't forget to check out before leaving to complete your attendance record.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${attendanceUrl}" style="background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        🏠 Check Out Now
                    </a>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f5576c;">
                    <p style="margin: 0; color: #666;"><strong>Remember:</strong> Checking out helps us track your work hours accurately.</p>
                </div>
                
                <p style="margin-top: 20px;">Have a great evening!</p>
                <p><strong>Bee ERP HR Team</strong></p>
            </div>
        </div>
        `
    };
    
    return templates[reminderType] || templates.check_in;
}