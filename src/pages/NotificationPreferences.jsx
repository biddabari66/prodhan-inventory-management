import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { NotificationPreference } from "@/entities/NotificationPreference";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const NOTIFICATION_CATEGORIES = [
  { 
    value: 'system', 
    label: 'System Alerts', 
    icon: '⚙️',
    description: 'Critical system updates and maintenance notifications',
    examples: ['System updates', 'Maintenance windows', 'Security alerts']
  },
  { 
    value: 'finance', 
    label: 'Finance & Budget', 
    icon: '💰',
    description: 'Financial transactions, approvals, and budget alerts',
    examples: ['Expense approvals', 'Budget warnings', 'Payment reminders']
  },
  { 
    value: 'inventory', 
    label: 'Inventory', 
    icon: '📦',
    description: 'Stock levels, reorders, and inventory movements',
    examples: ['Low stock alerts', 'Reorder notifications', 'Stock updates']
  },
  { 
    value: 'crm', 
    label: 'CRM & Leads', 
    icon: '🎯',
    description: 'Lead assignments, follow-ups, and customer interactions',
    examples: ['New lead assigned', 'Follow-up reminders', 'Lead conversions']
  },
  { 
    value: 'hr', 
    label: 'HR & Attendance', 
    icon: '👥',
    description: 'Employee management, attendance, and performance',
    examples: ['Task assignments', 'Attendance alerts', 'Performance updates']
  },
  { 
    value: 'academic', 
    label: 'Academic & Admissions', 
    icon: '🎓',
    description: 'Student admissions, courses, and academic updates',
    examples: ['New admissions', 'Course updates', 'Student notifications']
  }
];

export default function NotificationPreferencesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Load existing preferences
      const userPrefs = await NotificationPreference.filter({ user_id: user.id });
      
      // Convert to object for easier access
      const prefsMap = {};
      userPrefs.forEach(pref => {
        prefsMap[pref.category] = {
          in_app_enabled: pref.in_app_enabled !== false,
          email_enabled: pref.email_enabled === true
        };
      });

      // Set defaults for categories without preferences
      NOTIFICATION_CATEGORIES.forEach(cat => {
        if (!prefsMap[cat.value]) {
          prefsMap[cat.value] = {
            in_app_enabled: true,
            email_enabled: false
          };
        }
      });

      setPreferences(prefsMap);
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (category, type) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: !prev[category]?.[type]
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing preferences for this user
      const existingPrefs = await NotificationPreference.filter({ user_id: currentUser.id });
      await Promise.all(existingPrefs.map(pref => NotificationPreference.delete(pref.id)));

      // Create new preferences
      const prefsToCreate = Object.entries(preferences).map(([category, settings]) => ({
        user_id: currentUser.id,
        category,
        in_app_enabled: settings.in_app_enabled,
        email_enabled: settings.email_enabled
      }));

      await Promise.all(prefsToCreate.map(pref => NotificationPreference.create(pref)));

      toast.success("✅ Notification preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Notification Preferences</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Customize how you receive notifications to avoid information overload
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Overview Card */}
      <Card className="premium-card bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Smart Notification Control</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Configure your notification preferences by category. Enable in-app notifications for instant alerts, 
                or email notifications for daily digests. This helps prevent notification fatigue while keeping you informed.
              </p>
              <div className="flex gap-3">
                <Badge className="bg-violet-100 text-violet-800">
                  <Smartphone className="w-3 h-3 mr-1" />
                  In-App: Real-time
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  <Mail className="w-3 h-3 mr-1" />
                  Email: Daily Digest
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const categoryPrefs = preferences[category.value] || { in_app_enabled: true, email_enabled: false };
          
          return (
            <Card key={category.value} className="premium-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* In-App Toggle */}
                <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-violet-600" />
                    <div>
                      <Label className="font-semibold">In-App Notifications</Label>
                      <p className="text-xs text-muted-foreground">Instant alerts in the app</p>
                    </div>
                  </div>
                  <Switch
                    checked={categoryPrefs.in_app_enabled}
                    onCheckedChange={() => handleToggle(category.value, 'in_app_enabled')}
                  />
                </div>

                {/* Email Toggle */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <Label className="font-semibold">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Daily digest via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={categoryPrefs.email_enabled}
                    onCheckedChange={() => handleToggle(category.value, 'email_enabled')}
                  />
                </div>

                <Separator />

                {/* Examples */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Examples:</Label>
                  <ul className="mt-2 space-y-1">
                    {category.examples.map((example, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 bg-violet-500 rounded-full"></span>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 Smart Batching Enabled</p>
              <p>
                Email notifications are automatically batched into a daily digest sent at 9:00 AM. 
                In-app notifications appear instantly. You can always adjust these settings anytime.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}