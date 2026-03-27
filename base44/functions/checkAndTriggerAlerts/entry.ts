import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🔔 AUTOMATED ALERT CHECKER & TRIGGER SYSTEM
 * Runs periodically to check all active alerts and trigger notifications
 * Called by cron job or manual trigger
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // For cron jobs, use service role. For manual triggers, check admin auth.
    const method = req.method;
    let isManualTrigger = false;
    
    if (method === 'POST') {
      try {
        const user = await base44.auth.me();
        if (!user || !['admin', 'super_admin'].includes(user.job_role)) {
          return Response.json({ 
            success: false, 
            error: 'Unauthorized - Admin access required' 
          }, { status: 401 });
        }
        isManualTrigger = true;
      } catch (authError) {
        // If no user, assume it's a cron/webhook call
        console.log('Running as automated cron job');
      }
    }

    console.log(`🔔 Checking alerts... (Manual: ${isManualTrigger})`);

    // Fetch all active alerts
    const alerts = await base44.asServiceRole.entities.AlertConfiguration.filter({
      is_active: true
    });

    console.log(`📋 Found ${alerts.length} active alerts to check`);

    const results = {
      total_checked: alerts.length,
      triggered: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Process each alert
    for (const alert of alerts) {
      try {
        const shouldTrigger = await evaluateAlert(base44, alert);
        
        if (shouldTrigger) {
          await triggerAlert(base44, alert, shouldTrigger.data);
          
          // Update last triggered timestamp
          await base44.asServiceRole.entities.AlertConfiguration.update(alert.id, {
            last_triggered: new Date().toISOString(),
            trigger_count: (alert.trigger_count || 0) + 1
          });

          results.triggered++;
          results.details.push({
            alert_name: alert.name,
            status: 'triggered',
            reason: shouldTrigger.reason
          });

          console.log(`✅ Alert triggered: ${alert.name}`);
        } else {
          results.skipped++;
          console.log(`⏭️ Alert skipped (conditions not met): ${alert.name}`);
        }

      } catch (error) {
        console.error(`❌ Alert check failed: ${alert.name}`, error);
        results.failed++;
        results.details.push({
          alert_name: alert.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log(`📊 Alert Check Summary: ${results.triggered} triggered, ${results.skipped} skipped, ${results.failed} failed`);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      is_manual: isManualTrigger,
      results: results
    });

  } catch (error) {
    console.error('❌ Alert checker error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Evaluate if alert should trigger
async function evaluateAlert(base44, alert) {
  // Handle different alert types
  switch (alert.alert_type) {
    case 'threshold':
      return await evaluateThresholdAlert(base44, alert);
    
    case 'low_stock':
      return await evaluateLowStockAlert(base44, alert);
    
    case 'scheduled_report':
      return await evaluateScheduledReport(base44, alert);
    
    default:
      return false;
  }
}

// Evaluate threshold-based alerts
async function evaluateThresholdAlert(base44, alert) {
  const { entity_type, metric_field, condition, threshold_value } = alert;

  // Fetch relevant entities
  const entityMap = {
    'Inventory': base44.asServiceRole.entities.Inventory,
    'Expense': base44.asServiceRole.entities.Expense,
    'Income': base44.asServiceRole.entities.Income,
    'Lead': base44.asServiceRole.entities.Lead,
    'Attendance': base44.asServiceRole.entities.Attendance
  };

  const entityAPI = entityMap[entity_type];
  if (!entityAPI) return false;

  const entities = await entityAPI.list();

  // Check conditions
  const matchingEntities = entities.filter(entity => {
    const value = entity[metric_field];
    if (value === undefined || value === null) return false;

    switch (condition) {
      case 'less_than':
        return value < threshold_value;
      case 'greater_than':
        return value > threshold_value;
      case 'equals':
        return value === threshold_value;
      default:
        return false;
    }
  });

  if (matchingEntities.length > 0) {
    return {
      data: matchingEntities,
      reason: `${matchingEntities.length} ${entity_type}(s) match condition: ${metric_field} ${condition} ${threshold_value}`
    };
  }

  return false;
}

// Evaluate low stock alerts
async function evaluateLowStockAlert(base44, alert) {
  const inventory = await base44.asServiceRole.entities.Inventory.list();
  
  const lowStockItems = inventory.filter(item => 
    (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
  );

  if (lowStockItems.length > 0) {
    return {
      data: lowStockItems,
      reason: `${lowStockItems.length} items below reorder point`
    };
  }

  return false;
}

// Evaluate scheduled reports
async function evaluateScheduledReport(base44, alert) {
  const now = new Date();
  const lastTriggered = alert.last_triggered ? new Date(alert.last_triggered) : null;

  // Check if it's time to send based on frequency
  let shouldSend = false;

  if (!lastTriggered) {
    shouldSend = true; // First time
  } else {
    const hoursSinceLastTrigger = (now - lastTriggered) / (1000 * 60 * 60);

    switch (alert.report_frequency) {
      case 'daily':
        shouldSend = hoursSinceLastTrigger >= 24;
        break;
      case 'weekly':
        shouldSend = hoursSinceLastTrigger >= 168; // 7 days
        break;
      case 'monthly':
        shouldSend = hoursSinceLastTrigger >= 720; // 30 days
        break;
    }
  }

  if (shouldSend) {
    return {
      data: { report_type: alert.report_type },
      reason: `Scheduled ${alert.report_frequency} report due`
    };
  }

  return false;
}

// Trigger alert notifications
async function triggerAlert(base44, alert, triggerData) {
  const recipients = alert.recipients || [];

  console.log(`📧 Triggering alert "${alert.name}" to ${recipients.length} recipients`);

  // Determine email type and context based on alert type
  let emailType = 'system_notification';
  let emailContext = {
    subject: `🔔 Alert: ${alert.name}`,
    body: `Alert triggered: ${alert.description || alert.name}`
  };

  if (alert.alert_type === 'low_stock' && Array.isArray(triggerData)) {
    // Send individual low stock emails
    for (const item of triggerData.slice(0, 10)) { // Limit to prevent spam
      for (const recipientEmail of recipients) {
        await base44.functions.invoke('generateAndSendEmail', {
          to: recipientEmail,
          emailType: 'low_stock_alert',
          context: {
            item_name: item.item_name,
            current_stock: item.current_stock || 0,
            minimum_stock: item.minimum_stock || 0,
            reorder_point: item.reorder_point || item.minimum_stock || 0,
            department: item.department,
            supplier_name: item.supplier_name,
            supplier_lead_time_days: item.supplier_lead_time_days
          }
        });
      }
    }
  } else if (alert.alert_type === 'scheduled_report') {
    // Send department report
    const reportType = alert.report_type || 'department_report';
    
    // Trigger department report function
    await base44.functions.invoke('sendDepartmentReport', {
      department: triggerData.report_type === 'department_report' ? 'boibari' : 'finance_summary',
      include_pdf: alert.include_pdf
    });
  } else {
    // Generic alert notification
    for (const recipientEmail of recipients) {
      await base44.functions.invoke('generateAndSendEmail', {
        to: recipientEmail,
        emailType: emailType,
        context: {
          recipientName: recipientEmail.split('@')[0],
          subject: emailContext.subject,
          body: emailContext.body
        }
      });

      // Create in-app notification
      const recipient = await base44.asServiceRole.entities.User.filter({ email: recipientEmail });
      if (recipient.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: recipient[0].id,
          title: alert.name,
          message: emailContext.body,
          category: alert.module || 'system',
          priority: 'high',
          is_actionable: true,
          action_text: 'View Details',
          action_url: `/${alert.module}`
        });
      }
    }
  }

  console.log(`✅ Alert "${alert.name}" triggered successfully`);
}