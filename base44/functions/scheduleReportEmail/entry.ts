import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ⏰ SCHEDULED REPORT EMAIL TRIGGER
 * Webhook to be called by external cron service (e.g., cron-job.org)
 * Triggers automated report generation and email
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify webhook secret for security
    const { secret } = await req.json();
    const expectedSecret = Deno.env.get('REPORT_WEBHOOK_SECRET') || 'biddabari-report-secret-2024';

    if (secret !== expectedSecret) {
      console.warn('⚠️ Unauthorized report generation attempt');
      return Response.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('⏰ Scheduled report generation triggered');

    // Call the automated report generator
    const reportResponse = await base44.asServiceRole.functions.invoke('generateAutomatedReports', {});

    if (reportResponse.success) {
      console.log('✅ Scheduled report sent successfully');
      return Response.json({
        success: true,
        message: 'Scheduled report generated and sent',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Report generation failed');
    }

  } catch (error) {
    console.error('❌ Scheduled report error:', error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});