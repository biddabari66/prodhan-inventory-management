import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for admin operation
    const users = await base44.asServiceRole.entities.User.list();
    const notificationPreferences = await base44.asServiceRole.entities.NotificationPreference.list();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unread notifications from yesterday
    const allNotifications = await base44.asServiceRole.entities.Notification.filter(
      {
        created_date: { $gte: yesterday.toISOString(), $lt: today.toISOString() }
      },
      '-created_date',
      1000
    );

    // Group notifications by user
    const notificationsByUser = {};
    allNotifications.forEach(notif => {
      if (!notificationsByUser[notif.user_id]) {
        notificationsByUser[notif.user_id] = [];
      }
      notificationsByUser[notif.user_id].push(notif);
    });

    const digestsSent = [];

    // Send digest to each user
    for (const [userId, userNotifications] of Object.entries(notificationsByUser)) {
      const user = users.find(u => u.id === userId);
      if (!user || !user.email) continue;

      // Check user's notification preferences
      const userPrefs = notificationPreferences.filter(p => p.user_id === userId);
      const emailEnabledCategories = userPrefs
        .filter(p => p.email_enabled)
        .map(p => p.category);

      // Filter notifications based on user preferences
      const emailNotifications = userNotifications.filter(n => 
        emailEnabledCategories.includes(n.category)
      );

      if (emailNotifications.length === 0) continue;

      // Group by category
      const byCategory = {};
      emailNotifications.forEach(n => {
        if (!byCategory[n.category]) {
          byCategory[n.category] = [];
        }
        byCategory[n.category].push(n);
      });

      // Build digest email HTML
      let digestHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0;">🕵️ Bee ERP Daily Digest</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Your daily summary for ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background: white; padding: 24px;">
            <p style="margin: 0 0 16px 0; color: #374151;">
              Hello ${user.full_name},<br><br>
              Here's your daily digest with ${emailNotifications.length} notification${emailNotifications.length !== 1 ? 's' : ''}.
            </p>
      `;

      Object.entries(byCategory).forEach(([category, notifications]) => {
        const categoryIcons = {
          system: '⚙️',
          finance: '💰',
          inventory: '📦',
          crm: '🎯',
          hr: '👥',
          academic: '🎓'
        };

        digestHTML += `
          <div style="margin: 24px 0; border-left: 4px solid #7C3AED; padding-left: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #7C3AED; font-size: 16px;">
              ${categoryIcons[category] || '📌'} ${category.charAt(0).toUpperCase() + category.slice(1)} (${notifications.length})
            </h3>
        `;

        notifications.forEach(notif => {
          const priorityColors = {
            urgent: '#DC2626',
            high: '#F59E0B',
            medium: '#3B82F6',
            low: '#6B7280'
          };

          digestHTML += `
            <div style="background: #F9FAFB; padding: 12px; margin-bottom: 8px; border-radius: 8px; border-left: 3px solid ${priorityColors[notif.priority] || '#6B7280'};">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #111827; font-size: 14px;">
                ${notif.title}
              </p>
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 13px;">
                ${notif.message}
              </p>
              ${notif.action_url ? `
                <a href="${notif.action_url}" style="display: inline-block; background: #7C3AED; color: white; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-size: 12px; margin-top: 4px;">
                  ${notif.action_text || 'View Details'} →
                </a>
              ` : ''}
            </div>
          `;
        });

        digestHTML += `</div>`;
      });

      digestHTML += `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">
                You received this email because you have email notifications enabled.<br>
                <a href="${Deno.env.get('APP_URL') || 'https://app.example.com'}/NotificationPreferences" style="color: #7C3AED;">Manage your preferences</a>
              </p>
            </div>
          </div>
        </div>
      `;

      // Send digest email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `📬 Your Daily Digest - ${emailNotifications.length} update${emailNotifications.length !== 1 ? 's' : ''}`,
        body: digestHTML
      });

      digestsSent.push({
        user_id: userId,
        email: user.email,
        notification_count: emailNotifications.length
      });
    }

    return Response.json({
      success: true,
      digests_sent: digestsSent.length,
      total_notifications: allNotifications.length,
      details: digestsSent
    });

  } catch (error) {
    console.error('Error sending daily digests:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});