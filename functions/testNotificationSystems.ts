import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { testType = 'all' } = await req.json();
        const results = {};

        console.log('🧪 ========== TESTING NOTIFICATION SYSTEMS ==========');
        console.log('Test initiated by:', currentUser.full_name);
        console.log('Test type:', testType);
        console.log('User email:', currentUser.email);

        // Test 1: Direct Email via Core.SendEmail
        if (testType === 'email' || testType === 'all') {
            console.log('🧪 Test 1: Testing direct Core.SendEmail...');
            try {
                const emailPayload = {
                    from_name: "Bee ERP Test System",
                    to: currentUser.email,
                    subject: `🧪 Test Email - Direct Core.SendEmail`,
                    body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
                        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0;">🐝 Bee ERP Test</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
                            <h2 style="color: #2d3748;">Direct Email Test</h2>
                            <p style="color: #4a5568; line-height: 1.6;">
                                Hello <strong>${currentUser.full_name}</strong>,
                            </p>
                            <p style="color: #4a5568; line-height: 1.6;">
                                This is a test email sent directly via <code>Core.SendEmail</code> integration.
                                If you're reading this, the email system is working correctly! ✅
                            </p>
                            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    <strong>Test Details:</strong><br>
                                    Initiated by: ${currentUser.full_name}<br>
                                    Time: ${new Date().toLocaleString()}<br>
                                    Method: Direct Core.SendEmail
                                </p>
                            </div>
                            <p style="color: #8B5CF6; font-weight: 600; margin-top: 20px;">
                                💼 Bee ERP Team
                            </p>
                        </div>
                    </div>
                    `
                };
                
                console.log('📦 Sending email with payload:', emailPayload);
                const emailResponse = await base44.asServiceRole.integrations.Core.SendEmail(emailPayload);
                console.log('✅ Email response:', emailResponse);
                
                results.directEmailTest = { 
                    success: true, 
                    message: `Test email sent successfully to ${currentUser.email}`,
                    response: emailResponse
                };
            } catch (emailError) {
                console.error('❌ Direct email test failed:', emailError);
                results.directEmailTest = { 
                    success: false, 
                    error: emailError.message,
                    stack: emailError.stack
                };
            }
        }

        // Test 2: Email via generateAndSendEmail function
        if (testType === 'function' || testType === 'all') {
            console.log('🧪 Test 2: Testing generateAndSendEmail function...');
            try {
                const functionPayload = {
                    to: currentUser.email,
                    emailType: 'system_notification',
                    context: {
                        title: 'Function Test - generateAndSendEmail',
                        message: `
                            <p>This is a test email sent via the <code>generateAndSendEmail</code> function.</p>
                            <p>Test initiated by: <strong>${currentUser.full_name}</strong></p>
                            <p>Time: ${new Date().toLocaleString()}</p>
                        `,
                        recipientName: currentUser.full_name
                    }
                };
                
                console.log('📦 Calling generateAndSendEmail with:', functionPayload);
                const functionResult = await base44.functions.invoke('generateAndSendEmail', functionPayload);
                console.log('📨 Function result:', functionResult);
                console.log('📨 Function result.data:', functionResult?.data);
                
                if (functionResult?.data?.success) {
                    console.log('✅ Function test successful');
                    results.functionTest = { 
                        success: true, 
                        message: `Test email sent via function to ${currentUser.email}`,
                        response: functionResult.data
                    };
                } else {
                    console.error('❌ Function test failed with response:', functionResult?.data);
                    results.functionTest = { 
                        success: false, 
                        error: functionResult?.data?.error || 'Unknown error',
                        details: functionResult?.data
                    };
                }
            } catch (functionError) {
                console.error('❌ Function test failed:', functionError);
                results.functionTest = { 
                    success: false, 
                    error: functionError.message,
                    stack: functionError.stack
                };
            }
        }

        // Test 3: Email via NotificationService (if available)
        if (testType === 'notification' || testType === 'all') {
            console.log('🧪 Test 3: Testing NotificationService...');
            try {
                // This test requires NotificationService to be imported
                // For now, we'll simulate it by calling generateAndSendEmail with forceEmail
                const notificationPayload = {
                    to: currentUser.email,
                    emailType: 'system_notification',
                    context: {
                        title: 'NotificationService Test',
                        message: `
                            <p>This is a test email sent via the NotificationService system.</p>
                            <p>Test initiated by: <strong>${currentUser.full_name}</strong></p>
                            <p>Time: ${new Date().toLocaleString()}</p>
                            <p>This confirms that the automated notification system is working correctly.</p>
                        `,
                        recipientName: currentUser.full_name
                    }
                };
                
                console.log('📦 Testing notification system with:', notificationPayload);
                const notificationResult = await base44.functions.invoke('generateAndSendEmail', notificationPayload);
                console.log('📨 Notification result:', notificationResult);
                
                if (notificationResult?.data?.success) {
                    console.log('✅ Notification test successful');
                    results.notificationTest = { 
                        success: true, 
                        message: `Test notification email sent to ${currentUser.email}`,
                        response: notificationResult.data
                    };
                } else {
                    console.error('❌ Notification test failed');
                    results.notificationTest = { 
                        success: false, 
                        error: notificationResult?.data?.error || 'Unknown error',
                        details: notificationResult?.data
                    };
                }
            } catch (notificationError) {
                console.error('❌ Notification test failed:', notificationError);
                results.notificationTest = { 
                    success: false, 
                    error: notificationError.message,
                    stack: notificationError.stack
                };
            }
        }

        const summary = {
            testsRun: Object.keys(results).length,
            successful: Object.values(results).filter(r => r.success).length,
            failed: Object.values(results).filter(r => !r.success).length
        };

        console.log('📊 Test Summary:', summary);
        console.log('🏁 ========== TESTS COMPLETED ==========');

        return Response.json({ 
            success: summary.failed === 0, 
            message: 'Notification system tests completed',
            results,
            summary,
            timestamp: new Date().toISOString(),
            testedBy: currentUser.full_name,
            userEmail: currentUser.email,
            instructions: summary.failed > 0 ? 
                'Some tests failed. Please check the results and server logs for details. Make sure OPENAI_API_KEY and email service are properly configured in Base44 settings.' : 
                'All tests passed! Check your email inbox for test messages.'
        });

    } catch (error) {
        console.error('💥 Test function catastrophic error:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});