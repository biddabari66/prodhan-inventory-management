import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { erp } from '@/api/erpClient';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  User as UserIcon, Building2, Phone, Mail, Calendar, DollarSign, Edit, Briefcase, Lock, Settings, AlertTriangle, Save, Loader2, X, Network, Check, Bell, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/integrations/Core';
import DeleteAccountDialog from '../common/DeleteAccountDialog';
import ShiftSelector from '../attendance/ShiftSelector';

const JOB_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'admin', label: 'Admin' }
];

export default function UserProfile({ user, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isEditing, setIsEditing] = useState({
    personal: false,
    work: false,
    settings: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form Data States
  const [personalData, setPersonalData] = useState({});
  const [workData, setWorkData] = useState({});
  const [settingsData, setSettingsData] = useState({});

  // Fetch departments dynamically
  const { data: deptResp } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data ?? [])
  });
  const departments = Array.isArray(deptResp) ? deptResp : [];

  // ─── Company & Department (sub-company) section ──────────────────────────────
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    () => localStorage.getItem('activeCompanyId') || ''
  );
  const [savingDepartment, setSavingDepartment] = useState(false);

  const { data: companyResp } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data ?? [])
  });
  const companies = Array.isArray(companyResp) ? companyResp : [];

  // Departments scoped to the selected company.
  const { data: companyDeptResp } = useQuery({
    queryKey: ['departments', 'by-company', selectedCompanyId],
    queryFn: () => api.get('/departments', { params: { companyId: selectedCompanyId } })
      .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedCompanyId
  });
  const companyDepartments = Array.isArray(companyDeptResp) ? companyDeptResp : [];

  const handleSelectCompany = (id) => {
    setSelectedCompanyId(id);
    const company = companies.find(c => c.id === id);
    if (company) {
      localStorage.setItem('activeCompanyId', company.id);
      localStorage.setItem('activeCompany', company.name || '');
      toast.success(`Switched to ${company.name}`);
    }
  };

  const handleAssignDepartment = async (departmentId) => {
    if (!currentUser?.id) return toast.error('Could not determine current user.');
    setSavingDepartment(true);
    try {
      await erp.entities.User.update(currentUser.id, { department_id: departmentId });
      setCurrentUser(prev => prev ? { ...prev, department_id: departmentId } : prev);
      const dept = companyDepartments.find(d => d.id === departmentId);
      toast.success(`Profile assigned to ${dept?.name || 'department'}`);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(`Failed to assign department: ${err.message}`);
    } finally {
      setSavingDepartment(false);
    }
  };

  // Fetch current user to check if they are admin
  useEffect(() => {
    User.me().then(setCurrentUser).catch(console.error);
  }, []);

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.role === 'admin';

  // Safely initialize state from user prop
  useEffect(() => {
    if (!user) return;
    
    setPersonalData({
      display_name: user.display_name || user.full_name || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      profile_picture_url: user.profile_picture_url || ''
    });

    setWorkData({
      department_id: user.department_id || user.department || '', // Handle legacy `department` if still present
      designation: user.designation || '',
      joining_date: user.joining_date ? new Date(user.joining_date).toISOString().split('T')[0] : '',
      base_salary: user.base_salary?.toString() || '',
      job_role: user.job_role || 'employee'
    });

    setSettingsData({
      admission_target: user.admission_target?.toString() || '',
      incentive_rate: user.incentive_rate?.toString() || '',
      is_active: user.is_active !== false,
      job_role_admin_edit: user.job_role || 'employee',
      base_salary_admin_edit: user.base_salary?.toString() || ''
    });
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const toggleEdit = (section) => {
    setIsEditing(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePersonalSave = async () => {
    if (!personalData.full_name?.trim()) return toast.error("Full name is required.");
    setIsSaving(true);
    try {
      await User.update(user.id, {
        display_name: personalData.display_name,
        full_name: personalData.full_name,
        email: personalData.email,
        phone: personalData.phone
      });
      toast.success('Personal info updated successfully!');
      if (onUpdate) onUpdate();
      toggleEdit('personal');
    } catch (err) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkSave = async () => {
    setIsSaving(true);
    try {
      await User.update(user.id, {
        department_id: workData.department_id,
        department: workData.department_id, // Save to both for legacy compatibility if needed
        designation: workData.designation,
        joining_date: workData.joining_date || null,
        base_salary: parseFloat(workData.base_salary) || 0,
        job_role: workData.job_role
      });
      toast.success('Work info updated successfully!');
      if (onUpdate) onUpdate();
      toggleEdit('work');
    } catch (err) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    setIsSaving(true);
    try {
      const updatePayload = {
        admission_target: parseFloat(settingsData.admission_target) || 0,
        incentive_rate: parseFloat(settingsData.incentive_rate) || 0,
        is_active: settingsData.is_active,
      };

      if (isAdmin) {
        updatePayload.job_role = settingsData.job_role_admin_edit;
        updatePayload.base_salary = parseFloat(settingsData.base_salary_admin_edit) || 0;
      }

      await User.update(user.id, updatePayload);
      toast.success('Settings updated successfully!');
      if (onUpdate) onUpdate();
      toggleEdit('settings');
    } catch (err) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Passwords do not match');
    setIsChangingPassword(true);
    try {
      await erp.api.post('/auth/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPersonalData(prev => ({ ...prev, profile_picture_url: file_url }));
      await User.update(user.id, { profile_picture_url: file_url });
      toast.success("Profile picture updated!");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden relative rounded-xl border">
      {onClose && (
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 rounded-full" onClick={onClose}>
          <X className="w-5 h-5 text-gray-500" />
        </Button>
      )}

      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 overflow-y-auto shrink-0 flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group mb-4">
            <Avatar className="w-24 h-24 border-4 border-white shadow-sm ring-2 ring-violet-100">
              <AvatarImage src={personalData.profile_picture_url || ''} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-medium">
                {personalData.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Edit className="w-6 h-6 text-white" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
            </label>
          </div>
          <h2 className="text-xl font-bold text-center text-slate-800 dark:text-white truncate w-full">
            {personalData.full_name || 'User Profile'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate w-full text-center">
            {workData.designation || 'No Designation'}
          </p>
        </div>

        <nav className="space-y-1">
          <Button variant={activeTab === 'personal' ? 'secondary' : 'ghost'} className={`w-full justify-start ${activeTab === 'personal' ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : ''}`} onClick={() => setActiveTab('personal')}>
            <UserIcon className="w-4 h-4 mr-3" /> Personal Info
          </Button>
          <Button variant={activeTab === 'company' ? 'secondary' : 'ghost'} className={`w-full justify-start ${activeTab === 'company' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}`} onClick={() => setActiveTab('company')}>
            <Network className="w-4 h-4 mr-3" /> Company &amp; Department
          </Button>
          <Button variant={activeTab === 'notifications' ? 'secondary' : 'ghost'} className={`w-full justify-start ${activeTab === 'notifications' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}`} onClick={() => setActiveTab('notifications')}>
            <Bell className="w-4 h-4 mr-3" /> Notifications
          </Button>
          <Button variant={activeTab === 'activity' ? 'secondary' : 'ghost'} className={`w-full justify-start ${activeTab === 'activity' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}`} onClick={() => setActiveTab('activity')}>
            <Activity className="w-4 h-4 mr-3" /> Activity Log
          </Button>
          <Button variant={activeTab === 'security' ? 'secondary' : 'ghost'} className={`w-full justify-start ${activeTab === 'security' ? 'bg-red-50 text-red-700 hover:bg-red-100' : ''}`} onClick={() => setActiveTab('security')}>
            <Lock className="w-4 h-4 mr-3" /> Security
          </Button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* PERSONAL TAB */}
          {activeTab === 'personal' && (
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
                <CardTitle className="text-xl flex items-center gap-2"><UserIcon className="w-5 h-5 text-violet-500" /> Personal Information</CardTitle>
                <Button variant="outline" size="sm" onClick={() => toggleEdit('personal')}>
                  {isEditing.personal ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                  {isEditing.personal ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={personalData.full_name} onChange={e => setPersonalData({ ...personalData, full_name: e.target.value })} disabled={!isEditing.personal} />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={personalData.display_name} onChange={e => setPersonalData({ ...personalData, display_name: e.target.value })} disabled={!isEditing.personal} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" value={personalData.email} onChange={e => setPersonalData({ ...personalData, email: e.target.value })} disabled={!isEditing.personal} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={personalData.phone} onChange={e => setPersonalData({ ...personalData, phone: e.target.value })} disabled={!isEditing.personal} />
                  </div>
                </div>
                {isEditing.personal && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handlePersonalSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700">
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* COMPANY & DEPARTMENT TAB */}
          {activeTab === 'company' && (
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-amber-50/50 p-6">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Network className="w-5 h-5 text-amber-500" /> Company &amp; Department
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Current assignment summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Active Company</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">
                      {companies.find(c => c.id === selectedCompanyId)?.name
                        || localStorage.getItem('activeCompany')
                        || 'None selected'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-4">
                    <p className="text-xs font-medium text-violet-700 uppercase tracking-wide">Your Department</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">
                      {companyDepartments.find(d => d.id === currentUser?.department_id)?.name
                        || departments.find(d => d.id === currentUser?.department_id)?.name
                        || 'Not assigned'}
                    </p>
                  </div>
                </div>

                {/* Company selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-500" /> Company (Sub-company)
                  </Label>
                  <Select value={selectedCompanyId} onValueChange={handleSelectCompany}>
                    <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                    <SelectContent>
                      {companies.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No companies found</div>
                      ) : (
                        companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Selecting a company sets it as your active workspace.</p>
                </div>

                {/* Department selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-violet-500" /> Department
                  </Label>
                  <Select
                    value={currentUser?.department_id || ''}
                    onValueChange={handleAssignDepartment}
                    disabled={!selectedCompanyId || savingDepartment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompanyId ? 'Select your department' : 'Select a company first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {companyDepartments.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">
                          {selectedCompanyId ? 'No departments in this company' : 'Select a company first'}
                        </div>
                      ) : (
                        companyDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    {savingDepartment
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving your department…</>
                      : <><Check className="w-3 h-3 text-emerald-500" /> Picking a department saves it to your profile instantly.</>}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
                <CardTitle className="text-xl flex items-center gap-2"><Bell className="w-5 h-5 text-blue-500" /> Notifications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-500">Your notifications will appear here. Coming soon.</p>
              </CardContent>
            </Card>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'activity' && (
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
                <CardTitle className="text-xl flex items-center gap-2"><Activity className="w-5 h-5 text-green-500" /> Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-500">Your recent activity and audit logs will appear here. Coming soon.</p>
              </CardContent>
            </Card>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
                  <CardTitle className="text-xl flex items-center gap-2"><Lock className="w-5 h-5 text-slate-500" /> Change Password</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData(prev => ({...prev, oldPassword: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" value={passwordData.newPassword} onChange={e => setPasswordData(prev => ({...prev, newPassword: e.target.value}))} placeholder="Min 8 characters" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))} />
                    </div>
                    <Button onClick={handleChangePassword} disabled={isChangingPassword || !passwordData.oldPassword || !passwordData.newPassword} className="bg-slate-800 hover:bg-slate-900 text-white w-full">
                      {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-red-200 bg-red-50/50 shadow-sm">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-xl flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-red-800 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <DeleteAccountDialog />
                </CardContent>
              </Card>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}