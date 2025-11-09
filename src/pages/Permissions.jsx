import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { UserPermission } from "@/entities/UserPermission";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Save,
  Crown,
  Users,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Calculator,
  Search,
  Filter,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { debounce } from 'lodash';

// List of all available modules in the system
const ALL_MODULES = [
    { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics', category: 'General', icon: '📊' },
    { id: 'crm', name: 'CRM', description: 'Lead management and customer relations', category: 'Sales', icon: '🎯' },
    { id: 'students', name: 'Students', description: 'Student database management', category: 'Academic', icon: '👨‍🎓' },
    { id: 'admissions', name: 'Admissions', description: 'Manage student admissions and course enrollment', category: 'Academic', icon: '🎓' },
    { id: 'expenses', name: 'Expense Submission', description: 'Submit/track own expense requests (no financial report access)', category: 'Finance', icon: '💳', info: 'Limited to expense submission only.' },
    { id: 'income', name: 'Income Management', description: 'Manage income records and revenue tracking', category: 'Finance - Restricted', icon: '💰', warning: 'Management-level access required.' },
    { id: 'reports', name: 'Advanced Reports', description: 'View and generate all business & financial reports', category: 'Administration', icon: '📈', warning: 'Includes Financial Reports, Budget Planning, and Analytics.' },
    { id: 'inventory', name: 'Inventory', description: 'Stock and inventory management', category: 'Operations', icon: '📦' },
    { id: 'attendance', name: 'Attendance', description: 'Employee and student attendance tracking', category: 'HR', icon: '⏰' },
    { id: 'incentives', name: 'Incentives', description: 'Employee incentives and bonuses', category: 'HR', icon: '🏆' },
    { id: 'users', name: 'User Management', description: 'Manage users and employees', category: 'Administration', icon: '👥' },
    { id: 'settings', name: 'System Settings', description: 'System configuration and integrations', category: 'Administration', icon: '⚙️' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp integration and messaging', category: 'Communication', icon: '💬' },
    { id: 'followup', name: 'Follow-up', description: 'Follow-up tasks and activities', category: 'Sales', icon: '📞' },
    { id: 'hr', name: 'HR Management', description: 'Human resources management', category: 'HR', icon: '🏢' },
    { id: 'analytics', name: 'Analytics', description: 'Advanced analytics and business insights', category: 'Administration', icon: '📊', warning: 'Management-level access required.' },
    { id: 'procurement', name: 'Procurement', description: 'Procurement and purchasing', category: 'Operations', icon: '🛒' }
];

const groupedModules = ALL_MODULES.reduce((groups, module) => {
    const category = module.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(module);
    return groups;
}, {});

export default function Permissions() {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [filters, setFilters] = useState({ search: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await User.list();
      setAllUsers(usersData.filter(user => user.role !== 'admin')); // Don't show admin users
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    if (selectedUser?.id === user.id) return;
    
    setSelectedUser(user);
    setIsLoading(true);
    setSaveStatus(null);
    
    try {
      const userPermissions = await UserPermission.filter({ user_id: user.id });
      const permissionsMap = {};
      userPermissions.forEach(p => {
        permissionsMap[p.module] = p.can_view;
      });
      setPermissions(permissionsMap);
    } catch (error) {
      console.error(`Error loading permissions for ${user.full_name}:`, error);
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (module, value) => {
    setPermissions(prev => ({ ...prev, [module]: value }));
  };

  const savePermissionsForCurrentUser = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Fetch existing permissions for the user
      const existingPermissions = await UserPermission.filter({ user_id: selectedUser.id });
      
      const permissionsToCreate = [];
      const permissionsToDelete = [];
      
      ALL_MODULES.forEach(module => {
        const hasPermission = !!permissions[module.id];
        const existingPerm = existingPermissions.find(p => p.module === module.id);

        if (hasPermission && !existingPerm) {
          // Add permission
          permissionsToCreate.push({
            user_id: selectedUser.id,
            module: module.id,
            can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false
          });
        } else if (!hasPermission && existingPerm) {
          // Remove permission
          permissionsToDelete.push(existingPerm.id);
        }
      });
      
      if (permissionsToCreate.length > 0) {
        for (const perm of permissionsToCreate) {
            await UserPermission.create(perm);
        }
      }

      if (permissionsToDelete.length > 0) {
        for (const id of permissionsToDelete) {
            await UserPermission.delete(id);
        }
      }
      
      setSaveStatus({ type: 'success', message: `Permissions for ${selectedUser.full_name} saved successfully!` });
    } catch (error) {
      console.error("Error saving permissions:", error);
      setSaveStatus({ type: 'error', message: 'Failed to save permissions. Please try again.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };
  
  const grantAllPermissions = () => {
    const allPerms = {};
    ALL_MODULES.forEach(module => { allPerms[module.id] = true; });
    setPermissions(allPerms);
  };
  
  const revokeAllPermissions = () => {
    setPermissions({});
  };

  const grantEmployeeBasicPermissions = () => {
    const basicPerms = {};
    ALL_MODULES.forEach(module => {
      basicPerms[module.id] = ['dashboard', 'admissions', 'expenses', 'inventory', 'attendance', 'incentives', 'crm', 'students'].includes(module.id);
    });
    setPermissions(basicPerms);
  };

  const debouncedSearch = useCallback(debounce((value) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, 300), []);

  const filteredUsers = allUsers.filter(user => 
    user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.email?.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Permissions</h1>
        <p className="text-gray-600 mt-1">Select an employee to manage their module access.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Permission Guidelines</AlertTitle>
        <AlertDescription className="text-blue-700">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Expense Submission:</strong> Allows employees to submit expenses but NOT view financial reports or budgets.</li>
            <li><strong>Advanced Reports:</strong> Grants access to ALL financial data including budgets and analytics.</li>
            <li><strong>Income Management:</strong> Restricted to management roles only.</li>
            <li>Administrators have full access to all modules by default.</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User List */}
        <Card className="lg:col-span-1 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading && allUsers.length === 0 ? <p className="p-4 text-center">Loading users...</p> : 
                filteredUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${selectedUser?.id === user.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              }
              {filteredUsers.length === 0 && !isLoading && (
                <p className="p-4 text-center text-gray-500">No users found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Permission Editor */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Permissions for {selectedUser.full_name}</CardTitle>
                    <CardDescription>{selectedUser.email}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={grantEmployeeBasicPermissions}>Basic</Button>
                    <Button variant="outline" size="sm" onClick={grantAllPermissions}>Grant All</Button>
                    <Button variant="outline" size="sm" onClick={revokeAllPermissions}>Revoke All</Button>
                    <Button onClick={savePermissionsForCurrentUser} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
                 {saveStatus && (
                    <Alert className={`mt-4 ${saveStatus.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {saveStatus.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <AlertTitle className={saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {saveStatus.type === 'success' ? 'Success' : 'Error'}
                    </AlertTitle>
                    <AlertDescription className={saveStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {saveStatus.message}
                    </AlertDescription>
                    </Alert>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(groupedModules).map(([category, modules]) => (
                  <div key={category}>
                    <h4 className="text-base font-semibold text-gray-800 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modules.map(module => (
                        <div key={module.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                          <div>
                            <Label htmlFor={`${module.id}`} className="font-medium text-sm flex items-center gap-2">
                              {module.icon} {module.name}
                              {module.warning && <AlertTriangle className="w-4 h-4 text-red-500" title={module.warning}/>}
                              {module.info && <CheckCircle className="w-4 h-4 text-blue-500" title={module.info}/>}
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                          </div>
                          <Switch
                            id={`${module.id}`}
                            checked={!!permissions[module.id]}
                            onCheckedChange={(checked) => handlePermissionChange(module.id, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-full min-h-[50vh] border-0 shadow-lg">
              <div className="text-center text-gray-500">
                <UserIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">Select an Employee</h3>
                <p>Choose an employee from the list to view and edit their permissions.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}