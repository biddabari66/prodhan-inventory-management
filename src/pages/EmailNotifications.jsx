import React from 'react';
import EmailNotificationSettings from '../components/notifications/EmailNotificationSettings';

export default function EmailNotifications() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display text-gradient">Email Notifications</h1>
        <p className="text-lg text-muted-foreground mt-1">Configure and manage email notification settings for the ERP system.</p>
      </div>

      <EmailNotificationSettings />
    </div>
  );
}