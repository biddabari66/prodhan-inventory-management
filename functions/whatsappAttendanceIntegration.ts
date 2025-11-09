import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();
        
        console.log(`📱 WhatsApp Integration Action: ${action} by ${user.full_name}`);

        switch (action) {
            case 'generate_activation_code': {
                const activationCode = `BEE-${user.employee_id || user.id.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
                
                await base44.asServiceRole.entities.WhatsAppActivation.create({
                    user_id: user.id,
                    activation_code: activationCode,
                    status: 'pending',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    employee_name: user.full_name,
                    employee_phone: user.phone,
                    whatsapp_number: user.whatsapp_number || user.phone
                });

                console.log(`✅ Activation code generated: ${activationCode} for ${user.full_name}`);

                return Response.json({
                    success: true,
                    activationCode,
                    message: `Activation request created. An admin will approve your WhatsApp connection soon.`
                });
            }

            case 'approve_activation': {
                const { activationId } = params;
                
                const activation = await base44.asServiceRole.entities.WhatsAppActivation.get(activationId);
                
                if (!activation) {
                    return Response.json({ error: 'Activation not found' }, { status: 404 });
                }

                if (activation.status !== 'pending') {
                    return Response.json({ error: 'Activation not in pending status.' }, { status: 400 });
                }

                const userToActivate = await base44.asServiceRole.entities.User.get(activation.user_id);

                if (!userToActivate) {
                    return Response.json({ error: 'User associated with activation not found.' }, { status: 404 });
                }
                
                if (!userToActivate.phone) {
                    return Response.json({ error: 'Employee phone number is not set. Cannot activate WhatsApp.' }, { status: 400 });
                }

                // Update activation status
                await base44.asServiceRole.entities.WhatsAppActivation.update(activationId, {
                    status: 'completed',
                    activated_at: new Date().toISOString()
                });

                // Update user record
                await base44.asServiceRole.entities.User.update(activation.user_id, {
                    whatsapp_activated: true,
                    whatsapp_activated_date: new Date().toISOString(),
                    whatsapp_number: userToActivate.phone
                });

                // Send welcome message via sendWhatsAppMessage function
                try {
                    const welcomeResult = await base44.functions.invoke('sendWhatsAppMessage', {
                        recipientUserId: userToActivate.id,
                        messageContent: `Welcome to Bee ERP WhatsApp notifications! 🎉\n\nYour account has been successfully connected. You will now receive:\n• Attendance reminders\n• Expense approval updates\n• Important HR announcements\n• Report feedback\n\nStay connected with your team! 💼✨`,
                        messageType: 'general'
                    });

                    if (!welcomeResult.data?.success) {
                        console.warn('Welcome message failed to send:', welcomeResult.data?.error);
                    }
                } catch (welcomeError) {
                    console.warn('Error sending welcome message:', welcomeError);
                }

                console.log(`✅ WhatsApp activated for ${userToActivate.full_name}`);

                return Response.json({
                    success: true,
                    message: `WhatsApp activated successfully for ${userToActivate.full_name}`
                });
            }

            case 'reject_activation': {
                const { activationId } = params;
                
                const activation = await base44.asServiceRole.entities.WhatsAppActivation.get(activationId);
                
                if (!activation) {
                    return Response.json({ error: 'Activation not found' }, { status: 404 });
                }

                await base44.asServiceRole.entities.WhatsAppActivation.update(activationId, {
                    status: 'rejected'
                });

                return Response.json({
                    success: true,
                    message: `Activation request rejected for ${activation.employee_name}`
                });
            }

            case 'send_bulk_message': {
                const { employeeIds, messageType, customMessage = '', date = '' } = params;

                if (!employeeIds || employeeIds.length === 0) {
                    return Response.json({ error: 'No employees selected' }, { status: 400 });
                }

                if (messageType !== 'reminder' && !customMessage.trim()) {
                    return Response.json({ error: 'Custom message is required for this message type' }, { status: 400 });
                }

                const results = {
                    sent: 0,
                    failed: 0,
                    skipped: 0,
                    details: []
                };

                // Process each employee
                for (const employeeId of employeeIds) {
                    try {
                        const employee = await base44.asServiceRole.entities.User.get(employeeId);
                        
                        if (!employee) {
                            results.failed++;
                            results.details.push({
                                employee: 'Unknown',
                                status: 'failed',
                                reason: 'Employee not found'
                            });
                            continue;
                        }

                        if (!employee.whatsapp_activated) {
                            results.skipped++;
                            results.details.push({
                                employee: employee.full_name,
                                status: 'skipped',
                                reason: 'WhatsApp not activated'
                            });
                            continue;
                        }

                        // Generate message content based on type
                        let messageContent = '';
                        switch (messageType) {
                            case 'reminder':
                                messageContent = `⏰ Attendance Reminder\n\nDon't forget to check in for your shift today!\n\nQuick check-in: Reply with "IN" or use the Bee ERP app.`;
                                break;
                            case 'announcement':
                                messageContent = `📢 Important Announcement\n\n${customMessage}\n\nFor any questions, contact your HR department.`;
                                break;
                            case 'leave_approved':
                                messageContent = `✅ Leave Request Approved\n\nYour leave request for ${date} has been approved.\n\nEnjoy your time off! 🌴`;
                                break;
                            case 'performance':
                                messageContent = `🎯 Performance Update\n\n${customMessage}\n\nKeep up the excellent work! 💪`;
                                break;
                            default:
                                messageContent = customMessage;
                        }

                        // Send message using sendWhatsAppMessage function
                        const sendResult = await base44.functions.invoke('sendWhatsAppMessage', {
                            recipientUserId: employeeId,
                            messageContent,
                            messageType: messageType === 'reminder' ? 'attendance' : 'general'
                        });

                        if (sendResult.data?.success) {
                            results.sent++;
                            results.details.push({
                                employee: employee.full_name,
                                status: 'sent',
                                reason: 'Message delivered successfully'
                            });
                        } else if (sendResult.data?.skipped) {
                            results.skipped++;
                            results.details.push({
                                employee: employee.full_name,
                                status: 'skipped',
                                reason: sendResult.data.error || 'WhatsApp not properly configured'
                            });
                        } else {
                            results.failed++;
                            results.details.push({
                                employee: employee.full_name,
                                status: 'failed',
                                reason: sendResult.data?.error || 'Unknown error'
                            });
                        }

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));

                    } catch (error) {
                        results.failed++;
                        results.details.push({
                            employee: 'Unknown',
                            status: 'failed',
                            reason: error.message
                        });
                    }
                }

                console.log(`📊 Bulk message results: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);

                return Response.json({
                    success: true,
                    summary: results,
                    message: `Bulk message processed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`
                });
            }

            default:
                return Response.json({ error: 'Unknown action' }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Error in whatsappAttendanceIntegration:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});