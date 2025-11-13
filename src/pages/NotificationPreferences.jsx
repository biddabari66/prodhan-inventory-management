import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { NotificationPreference } from '@/entities/NotificationPreference';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  DollarSign, 
  Users, 
  Package, 
  BookOpen,
  Settings,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

const NOTIFICATION_CATEGORIES = [
  {
    value: 'system',
    label: 'System',
    description: 'App updates, maintenance, security alerts',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  {
    value: 'finance',
    label: 'Finance',
    description: 'Expense approvals, budget alerts, income notifications',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    value: 'inventory',
    label: 'Inventory',
    description: 'Low stock alerts, reorder notifications, stock updates',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    value: 'crm',
    label: 'CRM',
    description: 'New leads, follow-ups, lead assignments',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  {
    value: 'hr',
    label: 'HR',
    description: 'Attendance, tasks, performance reviews',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    value: 'academic',
    label: 'Academic',
    description: 'Course updates, student admissions, class schedules',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
];

export default function NotificationPreferencesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState([]);
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

      const userPreferences = await NotificationPreference.filter({ user_id: user.id });
      
      // Initialize with defaults if no preferences exist
      const allPreferences = NOTIFICATION_CATEGORIES.map(cat => {
        const existing = userPreferences.find(p => p.category === cat.value);
        return existing || {
          user_id: user.id,
          category: cat.value,
          in_app_enabled: true,
          email_enabled: cat.value === 'finance' || cat.value === 'hr' // Default email for important categories
        };
      });

      setPreferences(allPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (category, channel, value) => {
    setPreferences(prev => prev.map(pref => 
      pref.category === category 
        ? { ...pref, [channel]: value }
        : pref
    ));

    // Optimistic update - save immediately
    try {
      const preference = preferences.find(p => p.category === category);
      
      const updatedData = {
        user_id: currentUser.id,
        category: category,
        in_app_enabled: channel === 'in_app_enabled' ? value : preference.in_app_enabled,
        email_enabled: channel === 'email_enabled' ? value : preference.email_enabled
      };

      if (preference.id) {
        await NotificationPreference.update(preference.id, updatedData);
      } else {
        await NotificationPreference.create(updatedData);
      }

      toast.success('Preference updated!');
    } catch (error) {
      console.error('Error saving preference:', error);
      toast.error('Failed to save preference');
      // Revert optimistic update
      loadData();
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const savePromises = preferences.map(pref => {
        const data = {
          user_id: currentUser.id,
          category: pref.category,
          in_app_enabled: pref.in_app_enabled,
          email_enabled: pref.email_enabled
        };

        return pref.id 
          ? NotificationPreference.update(pref.id, data)
          : NotificationPreference.create(data);
      });

      await Promise.all(savePromises);
      toast.success('✅ All preferences saved successfully!');
      await loadData();
    } catch (error) {
      console.error('Error saving all preferences:', error);
      toast.error('Failed to save some preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Bell className="w-12 h-12 animate-pulse text-violet-600 mx-auto" />
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Notification Preferences</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Control how and when you receive notifications
          </p>
        </div>
        <Button 
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {/* Overview Card */}
      <Card className="premium-card border-2 border-violet-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Smart Notification System</h3>
              <p className="text-sm text-muted-foreground">
                Customize your experience by choosing which notifications you want to receive in-app or via email
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-violet-600">
                {preferences.filter(p => p.in_app_enabled || p.email_enabled).length}
              </div>
              <p className="text-xs text-muted-foreground">Active Channels</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const pref = preferences.find(p => p.category === category.value);
          
          return (
            <Card key={category.value} className="premium-card hover:shadow-lg transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${category.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.label}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {category.description}
                    </CardDescription>
                  </div>
                  {(pref?.in_app_enabled || pref?.email_enabled) && (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-violet-600" />
                    <div>
                      <Label htmlFor={`${category.value}-in-app`} className="font-semibold text-sm">
                        In-App Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Show in notification center</p>
                    </div>
                  </div>
                  <Switch
                    id={`${category.value}-in-app`}
                    checked={pref?.in_app_enabled || false}
                    onCheckedChange={(value) => handleToggle(category.value, 'in_app_enabled', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <Label htmlFor={`${category.value}-email`} className="font-semibold text-sm">
                        Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Send to {currentUser?.email}</p>
                    </div>
                  </div>
                  <Switch
                    id={`${category.value}-email`}
                    checked={pref?.email_enabled || false}
                    onCheckedChange={(value) => handleToggle(category.value, 'email_enabled', value)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips Card */}
      <Card className="premium-card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-bold text-blue-900">💡 Pro Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Finance & HR:</strong> We recommend enabling email for critical approvals</li>
                <li>• <strong>Inventory:</strong> Get instant in-app alerts for low stock items</li>
                <li>• <strong>CRM:</strong> Stay updated on new leads and follow-ups</li>
                <li>• <strong>Daily Digest:</strong> Email notifications are batched once daily to reduce inbox clutter</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}