import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { NotificationPreference } from '@/entities/NotificationPreference';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NOTIFICATION_CATEGORIES = [
  { id: 'system', name: 'System Alerts' },
  { id: 'finance', name: 'Finance Updates' },
  { id: 'inventory', name: 'Inventory Alerts' },
  { id: 'crm', name: 'CRM Notifications' },
  { id: 'hr', name: 'HR Updates' },
  { id: 'academic', name: 'Academic Alerts' },
];

export default function NotificationSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [initialPreferences, setInitialPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      const savedPreferences = await NotificationPreference.filter({ user_id: user.id });
      
      const prefsMap = {};
      const initialPrefsMap = {};

      NOTIFICATION_CATEGORIES.forEach(category => {
        const savedPref = savedPreferences.find(p => p.category === category.id);
        prefsMap[category.id] = {
          in_app_enabled: savedPref?.in_app_enabled ?? true,
          email_enabled: savedPref?.email_enabled ?? false,
        };
        initialPrefsMap[category.id] = savedPref;
      });

      setPreferences(prefsMap);
      setInitialPreferences(initialPrefsMap);

    } catch (error) {
      console.error("Error loading notification settings:", error);
      toast.error("Failed to load settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (category, method, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [method]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    toast.info("Saving your preferences...");

    try {
      const promises = NOTIFICATION_CATEGORIES.map(async (category) => {
        const categoryId = category.id;
        const newPref = preferences[categoryId];
        const oldPref = initialPreferences[categoryId];

        if (oldPref) {
          // If a preference record exists, update it
          return NotificationPreference.update(oldPref.id, {
            ...newPref,
            user_id: currentUser.id,
            category: categoryId,
          });
        } else {
          // If no record exists, create a new one
          return NotificationPreference.create({
            ...newPref,
            user_id: currentUser.id,
            category: categoryId,
          });
        }
      });

      await Promise.all(promises);
      toast.success('Notification settings saved successfully!');
      loadSettings(); // Reload to get the latest state
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading notification settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notification Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage how you receive notifications from the system.</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Delivery Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {NOTIFICATION_CATEGORIES.map(category => (
              <div key={category.id} className="p-4 border rounded-lg dark:border-gray-700">
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">{category.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <Label htmlFor={`${category.id}-in_app`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Bell className="w-4 h-4" />
                      In-App Notifications
                    </Label>
                    <Switch
                      id={`${category.id}-in_app`}
                      checked={preferences[category.id]?.in_app_enabled ?? true}
                      onCheckedChange={(checked) => handlePreferenceChange(category.id, 'in_app_enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <Label htmlFor={`${category.id}-email`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Mail className="w-4 h-4" />
                      Email Notifications
                    </Label>
                    <Switch
                      id={`${category.id}-email`}
                      checked={preferences[category.id]?.email_enabled ?? false}
                      onCheckedChange={(checked) => handlePreferenceChange(category.id, 'email_enabled', checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}