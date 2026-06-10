import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  User as UserIcon,
  Building2, Phone, Mail, Calendar, DollarSign, Edit, Briefcase, Clock, Shield, Save, Loader2, X, Lock, Settings, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/integrations/Core';
import { format } from 'date-fns';
import { generateAndSendEmail } from '@/functions/generateAndSendEmail';
import DepartmentSelect from '../common/DepartmentSelect';
import ShiftSelector from '../attendance/ShiftSelector';
import WhatsAppActivationButton from '../whatsapp/WhatsAppActivationButton';
import DeleteAccountDialog from '../common/DeleteAccountDialog';

const JOB_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'admin', label: 'Admin' }
];

export default function UserProfile({ user, onUpdate, onClose }) {
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isWorkEditing, setIsWorkEditing] = useState(false);
  const [isSettingsEditing, setIsSettingsEditing] = useState(false); // New state for settings
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [personalData, setPersonalData] = useState({
    display_name: '',
    full_name: '',
    email: '',
    phone: '',
    profile_picture_url: ''
  });
  const [workData, setWorkData] = useState({
    department: '',
    designation: '',
    joining_date: '',
    base_salary: '',
    job_role: ''
  });
  const [settingsData, setSettingsData] = useState({
    admission_target: '',
    incentive_rate: '',
    is_active: true,
    job_role_admin_edit: '', // This will be handled by workData.job_role for display, but admin can edit
    base_salary_admin_edit: '' // This will be handled by workData.base_salary for display, but admin can edit
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (user) {
      setPersonalData({
        display_name: user.display_name || user.full_name || '',
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        profile_picture_url: user.profile_picture_url || ''
      });
      setWorkData({
        department: user.department || '',
        designation: user.designation || '',
        joining_date: (() => {
          if (!user.joining_date) return '';
          try {
            const d = new Date(user.joining_date);
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          } catch {
            return '';
          }
        })(),
        base_salary: user.base_salary?.toString() || '',
        job_role: user.job_role || 'employee'
      });
      setSettingsData({
        admission_target: user.admission_target?.toString() || '',
        incentive_rate: user.incentive_rate?.toString() || '',
        is_active: user.is_active !== false,
        job_role_admin_edit: user.job_role || 'employee', // Keep for internal admin edit state
        base_salary_admin_edit: user.base_salary?.toString() || '' // Keep for internal admin edit state
      });
    }
  }, [user]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const loggedInUserData = await User.me();
        setCurrentUser(loggedInUserData);
      } catch (error) {
        console.error("Failed to fetch logged-in user for admin status:", error);
      }
    };
    loadCurrentUser();
  }, []);

  const isAdmin = () => {
    return currentUser && (currentUser.job_role === 'admin' || currentUser.role === 'admin');
  };

  const isTargetUser = () => {
    return currentUser && user && currentUser.id === user.id;
  };

  const handlePersonalSave = async () => {
    if (!user) {
      toast.error("User data not available to save.");
      return;
    }
    setIsSaving(true);
    
    try {
      if (!personalData.full_name?.trim()) {
        toast.error("Full name is required.");
        setIsSaving(false);
        return;
      }
      if (personalData.email && !/^\S+@\S+\.\S+$/.test(personalData.email)) {
        toast.error("Please enter a valid email address.");
        setIsSaving(false);
        return;
      }

      console.log('🔄 Starting profile update process...');
      
      const updateData = {
        display_name: personalData.display_name,
        full_name: personalData.full_name,
        email: personalData.email,
        phone: personalData.phone,
        profile_picture_url: personalData.profile_picture_url
      };
      
      console.log('📝 Updating user profile with data:', updateData);
      await User.update(user.id, updateData);
      console.log('✅ Profile updated successfully');
      toast.success('✅ Profile updated successfully!');

      // Enhanced email notification system - production ready
      try {
        if (user.email) {
          console.log('📧 Attempting to send profile update email notification...');
          toast.info(`📧 Sending notification to ${user.email}...`);
          
          const emailPayload = {
            to: user.email,
            emailType: 'profile_update',
            context: { 
              employeeName: personalData.full_name || user.full_name,
            }
          };
          
          console.log('📧 Email payload prepared:', emailPayload);
          
          const emailResponse = await generateAndSendEmail(emailPayload);
          console.log('📧 Raw email function response:', emailResponse);

          if (emailResponse?.data?.success) {
            console.log('✅ Email sent successfully via backend function.');
            toast.success(`✅ Notification sent to ${user.email}`);
          } else {
            throw new Error(emailResponse?.data?.error || 'Unknown email error');
          }
          
        } else {
          console.log('⚠️ No email address found for user, skipping notification.');
          toast.warning('⚠️ No email on file - notification not sent.');
        }
      } catch (emailError) {
        console.error('💥 Email sending failed with exception:', emailError);
        toast.error(`❌ Email notification failed: ${emailError.message}`);
      }

      if (onUpdate) {
        console.log('🔄 Calling onUpdate callback...');
        onUpdate();
      }
      setIsEditingPersonal(false);
      
    } catch (error) {
      console.error('💥 Error updating personal information:', error);
      toast.error(`❌ Failed to update profile: ${error.message}`, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkSave = async () => {
    if (!user) {
      toast.error("User data not available to save.");
      return;
    }
    setIsSaving(true);
    try {
      if (workData.base_salary && isNaN(parseFloat(workData.base_salary))) {
        toast.error("Base salary must be a valid number.");
        setIsSaving(false);
        return;
      }

      const updateData = {
        department: workData.department,
        designation: workData.designation,
        joining_date: workData.joining_date,
        base_salary: parseFloat(workData.base_salary) || 0,
        job_role: workData.job_role // Also save job role
      };
      
      await User.update(user.id, updateData);
      toast.success('Work information updated successfully!');
      if (onUpdate) onUpdate();
      setIsWorkEditing(false);
    } catch (error) {
      console.error('Error updating work information:', error);
      toast.error('Failed to update work information.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!user) {
      toast.error("User data not available to save.");
      return;
    }
    setIsSaving(true);
    try {
      if (settingsData.admission_target && isNaN(parseFloat(settingsData.admission_target))) {
        toast.error("Admission target must be a valid number.");
        setIsSaving(false);
        return;
      }
      if (settingsData.incentive_rate && isNaN(parseFloat(settingsData.incentive_rate))) {
        toast.error("Incentive rate must be a valid number.");
        setIsSaving(false);
        return;
      }

      const updateData = {
        admission_target: parseFloat(settingsData.admission_target) || 0,
        incentive_rate: parseFloat(settingsData.incentive_rate) || 0,
        is_active: settingsData.is_active,
      };

      if (isAdmin()) {
        updateData.job_role = settingsData.job_role_admin_edit;
        updateData.base_salary = parseFloat(settingsData.base_salary_admin_edit) || 0;
      }

      await User.update(user.id, updateData);
      toast.success("Account settings updated successfully!");
      if (onUpdate) onUpdate();
      setIsSettingsEditing(false); // Close settings edit mode
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error("Failed to update settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPersonalData((prev) => ({ ...prev, profile_picture_url: file_url }));
      toast.success("Profile picture uploaded successfully");
      await User.update(user.id, { profile_picture_url: file_url });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const getDepartmentDisplayName = (value) => {
    const departments = [
      { value: 'biddabari_publication', label: 'Biddabari Publication' },
      { value: 'it', label: 'IT' },
      { value: 'boibari', label: 'Boibari' },
      { value: 'admission', label: 'Admission' },
      { value: 'service', label: 'Service' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)' },
      { value: 'sales', label: 'Sales' },
      { value: 'r_and_d', label: 'R & D' }
    ];
    const dept = departments.find((d) => d.value === value);
    return dept ? dept.label : value;
  };

  const getJobRoleColor = (jobRole) => ({
    'admin': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'manager': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'employee': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'department_head': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  })[jobRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-6">
        <div className="flex justify-center items-center h-full w-full max-w-4xl min-h-[400px] bg-white dark:bg-slate-900 rounded-lg shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-6">
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-lg shadow-xl overflow-hidden flex flex-col">
        
        {/* Fixed Header - Mobile Optimized */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          </button>

          {/* Header Content - Mobile Optimized */}
          <div className="p-4 md:p-6 pr-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-orange-200 dark:border-orange-800">
                  <AvatarImage src={personalData.profile_picture_url} alt={personalData.full_name} />
                  <AvatarFallback className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    {personalData.full_name?.charAt(0)?.toUpperCase() || user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {personalData.full_name || user?.full_name}
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3">
                  Manage your account information
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {getDepartmentDisplayName(workData.department) || 'N/A'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {workData.designation || 'N/A'}
                  </Badge>
                  {workData.job_role === 'admin' && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="personal" className="w-full">
            {/* Mobile-Optimized Tabs */}
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 mb-6">
              <TabsTrigger 
                value="personal" 
                className="text-xs md:text-sm px-2 py-3 md:px-4 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/30 dark:data-[state=active]:text-orange-300"
              >
                <span className="hidden sm:inline">Personal Info</span>
                <span className="sm:hidden">Personal</span>
              </TabsTrigger>
              <TabsTrigger 
                value="work" 
                className="text-xs md:text-sm px-2 py-3 md:px-4 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/30 dark:data-[state=active]:text-orange-300"
              >
                <span className="hidden sm:inline">Work & Attendance</span>
                <span className="sm:hidden">Work</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="text-xs md:text-sm px-2 py-3 md:px-4 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/30 dark:data-[state=active]:text-orange-300"
              >
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="text-xs md:text-sm px-2 py-3 md:px-4 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/30 dark:data-[state=active]:text-orange-300"
              >
                <span className="hidden sm:inline">Preferences</span>
                <span className="sm:hidden">Prefs</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Personal Info Tab - Mobile Optimized */}
            <TabsContent value="personal" className="space-y-4 md:space-y-6">
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <UserIcon className="w-5 h-5 text-orange-600" />
                    Personal Information
                  </CardTitle>
                  {(isTargetUser() || isAdmin()) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                      className="min-w-[44px] min-h-[44px] p-2 md:px-4 md:py-2"
                      disabled={isSaving || isUploading}
                    >
                      <Edit className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">{isEditingPersonal ? 'View' : 'Edit'}</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  {isEditingPersonal ? (
                    <div className="space-y-4 md:space-y-6">
                      {/* Mobile-Optimized Form Fields */}
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-md">
                            <AvatarImage src={personalData.profile_picture_url} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold text-3xl">
                              {(personalData.display_name?.charAt(0) || personalData.full_name?.charAt(0) || 'U').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow w-full">
                          <Label htmlFor="profile_picture_input">Profile Picture</Label>
                          <Input
                            id="profile_picture_input"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="w-full h-12 text-base file:h-full file:cursor-pointer"
                            disabled={isUploading}
                          />
                          {personalData.profile_picture_url && !isUploading && (
                            <p className="text-sm text-muted-foreground mt-1">Current: <a href={personalData.profile_picture_url} target="_blank" rel="noopener noreferrer" className="underline">View</a></p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={personalData.email}
                            onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
                            className="w-full h-12 text-base"
                            placeholder="Enter your email"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Contact an admin to change your email.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={personalData.phone}
                            onChange={(e) => setPersonalData({...personalData, phone: e.target.value})}
                            className="w-full h-12 text-base"
                            placeholder="Enter your phone number"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="text-sm font-medium flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            Full Name
                          </Label>
                          <Input
                            id="full_name"
                            value={personalData.full_name}
                            onChange={(e) => setPersonalData({...personalData, full_name: e.target.value})}
                            className="w-full h-12 text-base"
                            placeholder="Enter your full name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="display_name" className="text-sm font-medium flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            Display Name
                          </Label>
                          <Input
                            id="display_name"
                            value={personalData.display_name}
                            onChange={(e) => setPersonalData({...personalData, display_name: e.target.value})}
                            className="w-full h-12 text-base"
                            placeholder="How should we display your name?"
                          />
                        </div>
                      </div>
                      
                      {/* Mobile-Optimized Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          onClick={() => setIsEditingPersonal(false)}
                          variant="outline"
                          className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
                          disabled={isSaving || isUploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handlePersonalSave}
                          className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={isSaving || isUploading}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Read-only view - Mobile Optimized
                    <div className="space-y-4">
                      {[
                        { icon: Mail, label: 'Email', value: personalData.email },
                        { icon: Phone, label: 'Phone', value: personalData.phone },
                        { icon: UserIcon, label: 'Full Name', value: personalData.full_name },
                        { icon: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>, label: 'Display Name', value: personalData.display_name }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <item.icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {item.label}
                            </p>
                            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                              {item.value || 'Not set'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Work & Attendance Tab - Mobile Optimized */}
            <TabsContent value="work" className="space-y-4 md:space-y-6">
              {/* Work Information */}
              <Card className="premium-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                    Work Information
                  </CardTitle>
                  {(isTargetUser() || isAdmin()) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWorkEditing(!isWorkEditing)}
                      className="min-w-[44px] min-h-[44px] p-2 md:px-4 md:py-2"
                      disabled={isSaving}
                    >
                      <Edit className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">{isWorkEditing ? 'View' : 'Edit'}</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  {isWorkEditing ? (
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Employee ID</Label>
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm md:text-base font-mono">
                              {user?.employee_id || 'Not assigned'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                          <DepartmentSelect
                            value={workData.department}
                            onValueChange={(value) => setWorkData({...workData, department: value})}
                            placeholder="Select department..."
                            className="h-12"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify department.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="designation" className="text-sm font-medium">Designation</Label>
                          <Input
                            id="designation"
                            value={workData.designation}
                            onChange={(e) => setWorkData({...workData, designation: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter your job title"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify designation.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="job_role" className="text-sm font-medium">Job Role</Label>
                          <Select
                            value={workData.job_role}
                            onValueChange={(value) => setWorkData({...workData, job_role: value})}
                            disabled={!isAdmin()}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select job role"/>
                            </SelectTrigger>
                            <SelectContent>
                              {JOB_ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify job role.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="joining_date" className="text-sm font-medium">Joining Date</Label>
                          <Input
                            id="joining_date"
                            type="date"
                            value={workData.joining_date}
                            onChange={(e) => setWorkData({...workData, joining_date: e.target.value})}
                            className="h-12 text-base"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify joining date.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="base_salary" className="text-sm font-medium">Base Salary</Label>
                          <Input
                            id="base_salary"
                            type="number"
                            value={workData.base_salary}
                            onChange={(e) => setWorkData({...workData, base_salary: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter base salary"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify base salary.</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          onClick={() => setIsWorkEditing(false)}
                          variant="outline"
                          className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleWorkSave}
                          className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'Employee ID', value: user?.employee_id },
                        { label: 'Department', value: getDepartmentDisplayName(workData.department) },
                        { label: 'Designation', value: workData.designation },
                        { label: 'Job Role', value: JOB_ROLES.find(r => r.value === workData.job_role)?.label || workData.job_role },
                        { label: 'Joining Date', value: workData.joining_date && !isNaN(new Date(workData.joining_date)) ? format(new Date(workData.joining_date), 'PPP') : null },
                        { label: 'Base Salary', value: workData.base_salary ? `৳${parseFloat(workData.base_salary).toLocaleString()}` : null }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {item.label}
                            </p>
                            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                              {item.value || 'Not set'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Integration Card */}
              <WhatsAppActivationButton 
                user={user} 
                onActivationChange={() => {
                  // Refresh user data when activation changes
                  onUpdate && onUpdate();
                }}
              />

              {/* Attendance & Shift Settings */}
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Attendance & Shift Settings
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your preferred work shift and attendance settings
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-4">
                    <ShiftSelector 
                      user={user} 
                      onShiftChange={() => {
                        toast.success('✅ Shift preferences updated successfully');
                        if (onUpdate) onUpdate();
                      }}
                      showLabel={true}
                      className="w-full"
                    />
                    
                    {/* Shift Assignment (Admin only) */}
                    {isAdmin() && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                          Admin: Assign Shift for {user?.full_name}
                        </h4>
                        <Select
                          value={user?.assigned_shift || ''}
                          onValueChange={async (shiftId) => {
                            try {
                              await User.update(user.id, { assigned_shift: shiftId });
                              toast.success('Shift assigned successfully');
                              if (onUpdate) onUpdate();
                            } catch (error) {
                              toast.error('Failed to assign shift');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning (9 AM - 6 PM)</SelectItem>
                            <SelectItem value="evening">Evening (2 PM - 11 PM)</SelectItem>
                            <SelectItem value="night">Night (10 PM - 7 AM)</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Your selected shift determines late arrival thresholds</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>All shift changes are logged for audit purposes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account & Settings Tab - Mobile Optimized */}
            <TabsContent value="settings" className="space-y-4 md:space-y-6">
              {/* Performance & Financial Settings */}
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:p-6">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                      Performance & Financial Settings
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Adjust performance targets and financial details
                    </p>
                  </div>
                  {isAdmin() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSettingsEditing(!isSettingsEditing)}
                      className="min-w-[44px] min-h-[44px] p-2 md:px-4 md:py-2"
                      disabled={isSaving}
                    >
                      <Edit className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">{isSettingsEditing ? 'View' : 'Edit'}</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  {isSettingsEditing ? (
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="admission_target" className="text-sm font-medium">Monthly Admission Target</Label>
                          <Input
                            id="admission_target"
                            type="number"
                            value={settingsData.admission_target}
                            onChange={(e) => setSettingsData({...settingsData, admission_target: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter target number"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify admission target.</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="incentive_rate" className="text-sm font-medium">Incentive Rate (%)</Label>
                          <Input
                            id="incentive_rate"
                            type="number"
                            step="0.01"
                            value={settingsData.incentive_rate}
                            onChange={(e) => setSettingsData({...settingsData, incentive_rate: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter percentage"
                            disabled={!isAdmin()}
                          />
                          {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can modify incentive rate.</p>}
                        </div>

                        {/* Admin-only fields moved from Work Information to here for simplified settings tab edit */}
                        {isAdmin() && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="base_salary_admin_edit" className="text-sm font-medium">Base Salary (৳)</Label>
                              <Input
                                id="base_salary_admin_edit"
                                type="number"
                                value={settingsData.base_salary_admin_edit}
                                onChange={(e) => setSettingsData({ ...settingsData, base_salary_admin_edit: e.target.value })}
                                className="h-12 text-base"
                                placeholder="Monthly salary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="job_role_admin_edit" className="text-sm font-medium">Job Role</Label>
                              <Select
                                value={settingsData.job_role_admin_edit}
                                onValueChange={(value) => setSettingsData({ ...settingsData, job_role_admin_edit: value })}
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select job role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {JOB_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Account Status</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Enable or disable account access
                            </p>
                          </div>
                          <Switch
                            checked={settingsData.is_active}
                            onCheckedChange={(checked) => setSettingsData({...settingsData, is_active: checked})}
                            disabled={!isAdmin()}
                          />
                        </div>
                        {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Only administrators can change account activation status.</p>}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          onClick={() => setIsSettingsEditing(false)}
                          variant="outline"
                          className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSettingsSave}
                          className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'Monthly Admission Target', value: settingsData.admission_target },
                        { label: 'Incentive Rate', value: settingsData.incentive_rate ? `${settingsData.incentive_rate}%` : null },
                        { label: 'Account Status', value: settingsData.is_active ? 'Active' : 'Inactive' },
                        isAdmin() && { label: 'Job Role', value: JOB_ROLES.find(r => r.value === settingsData.job_role_admin_edit)?.label || settingsData.job_role_admin_edit },
                        isAdmin() && { label: 'Base Salary', value: settingsData.base_salary_admin_edit ? `৳${parseFloat(settingsData.base_salary_admin_edit).toLocaleString()}` : null }
                      ].filter(Boolean).map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {item.label}
                            </p>
                            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                              {item.value || 'Not set'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notification Preferences (Keep as read-only for now, not specified in edit mode) */}
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">Notification Preferences</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage your account preferences for notifications.
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SMS Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Display Settings (Keep as read-only for now, not specified in edit mode) */}
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-muted-foreground">Toggle dark mode for the application.</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4 md:space-y-6">
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Lock className="w-5 h-5 text-violet-600" />
                    Security Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your account's security preferences.
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white">Password Management</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Change your password regularly to keep your account secure.
                      </p>
                      <Button variant="outline" className="mt-3">Change Password</Button>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add an extra layer of security to your account.
                      </p>
                      <Button variant="outline" className="mt-3" disabled>Enable 2FA</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone - Delete Account */}
              <Card className="border border-red-200 dark:border-red-900">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data.
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <DeleteAccountDialog />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab (Placeholder) */}
            <TabsContent value="preferences" className="space-y-4 md:space-y-6">
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Settings className="w-5 h-5 text-violet-600" />
                    Application Preferences
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize your experience with application settings.
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Language</h4>
                        <p className="text-sm text-muted-foreground">Select your preferred language.</p>
                      </div>
                      <Select defaultValue="en">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="bn">Bengali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="font-medium">Time Zone</h4>
                        <p className="text-sm text-muted-foreground">Set your local time zone.</p>
                      </div>
                      <Select defaultValue="utc+6">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Time Zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc+6">UTC+6 (Dhaka)</SelectItem>
                          <SelectItem value="utc+0">UTC+0 (London)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}