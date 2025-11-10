import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📧 TEST EMAIL SENDER
 * Quick function to test email functionality
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Please login' 
      }, { status: 401 });
    }

    const { recipient_email } = await req.json();
    
    const testEmail = recipient_email || 'biddabari605@gmail.com';

    console.log(`📧 Sending test email to: ${testEmail}`);

    // Send beautiful test email
    const response = await base44.functions.invoke('generateAndSendEmail', {
      to: testEmail,
      emailType: 'system_notification',
      context: {
        recipientName: 'Biddabari Admin',
        subject: '🎉 Test Email from Bee ERP System',
        body: `Assalamualaikum! 🕌

This is a test email from your Bee ERP system to verify that the email functionality is working perfectly.

✅ **Email System Status:** OPERATIONAL
✅ **Integration:** Base44 Core.SendEmail
✅ **Sent By:** ${user.full_name} (${user.email})
✅ **Timestamp:** ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (Bangladesh Time)

**Features Verified:**
• Email sending capability
• HTML template rendering
• Multilingual support
• Branded email design
• Delivery confirmation

**Recent Improvements:**
• 🕵️ Feluda AI now greets with "Assalamualaikum" (Muslim Bangladeshi identity)
• 🌐 Full Bengali + English support
• 💡 Customizable greeting preferences
• 📊 Stable dashboard card colors
• 🎯 Enhanced user experience

If you receive this email successfully, your auto-email system is fully operational and ready for production use! 🚀

JazakAllah Khair! 
The Bee ERP Team 🐝`,
        from_name: 'Bee ERP System'
      }
    });

    console.log('✅ Test email sent successfully!');

    return Response.json({
      success: true,
      message: 'Test email sent successfully!',
      recipient: testEmail,
      sent_at: new Date().toISOString(),
      response: response.data
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});