import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Activity, Filter, Search, User as UserIcon, Clock, Loader2, RefreshCw, FileEdit, Trash2, LogIn, LogOut, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: 'all',
    module: 'all',
    action: 'all',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logData, userData] = await Promise.all([
        AuditLog.list('-timestamp', 200),
        User.list(),
      ]);
      setLogs(logData);
      setUsers(userData);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Premium pill badge styling
  const getActionBadge = (action) => {
    const config = {
      create: { label: 'Create', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      update: { label: 'Update', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
      delete: { label: 'Delete', class: 'bg-red-50 text-red-700 border border-red-200' },
      login: { label: 'Login', class: 'bg-purple-50 text-purple-700 border border-purple-200' },
      logout: { label: 'Logout', class: 'bg-slate-100 text-slate-600 border border-slate-200' },
      export: { label: 'Export', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
    };
    const { label, class: className } = config[action] || { label: action, class: 'bg-slate-100 text-slate-600 border border-slate-200' };
    return <Badge className={`${className} rounded-full px-3 py-0.5 text-xs font-medium`}>{label}</Badge>;
  };

  const getActionIcon = (action) => {
    const iconClass = "w-4 h-4";
    switch (action) {
      case 'create': return <Activity className={`${iconClass} text-emerald-600`} />;
      case 'update': return <FileEdit className={`${iconClass} text-blue-600`} />;
      case 'delete': return <Trash2 className={`${iconClass} text-red-600`} />;
      case 'login': return <LogIn className={`${iconClass} text-purple-600`} />;
      case 'logout': return <LogOut className={`${iconClass} text-slate-500`} />;
      case 'export': return <Download className={`${iconClass} text-amber-600`} />;
      default: return <Activity className={`${iconClass} text-slate-500`} />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const userMatch = filters.user === 'all' || log.user_id === filters.user;
    const moduleMatch = filters.module === 'all' || log.module === filters.module;
    const actionMatch = filters.action === 'all' || log.action === filters.action;
    const searchMatch = !filters.search || log.description?.toLowerCase().includes(filters.search.toLowerCase());
    return userMatch && moduleMatch && actionMatch && searchMatch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
          </div>
          <p className="text-slate-600 font-medium">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-6 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Activity Log</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Activity Log</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Track all system activities and user actions</p>
          </div>
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards - Minimalist White Design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">{logs.length}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Total Actions</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <FileEdit className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">{logs.filter(l => l.action === 'update').length}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Updates</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">{logs.filter(l => l.action === 'delete').length}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Deletions</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">{logs.filter(l => l.action === 'login').length}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Logins</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="border-b border-slate-100 py-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Filter className="w-4 h-4 text-[#D32F2F]" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search descriptions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 h-10 bg-white border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <Select value={filters.user} onValueChange={(value) => setFilters({ ...filters, user: value })}>
              <SelectTrigger className="h-10 border-slate-200 rounded-lg">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.module} onValueChange={(value) => setFilters({ ...filters, module: value })}>
              <SelectTrigger className="h-10 border-slate-200 rounded-lg">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
              <SelectTrigger className="h-10 border-slate-200 rounded-lg">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 py-4 px-5">
            <CardTitle className="flex items-center gap-3 text-sm font-semibold text-[#111827]">
              Recent Activity
              <Badge className="bg-slate-100 text-slate-700 rounded-full px-3 font-medium">
                {filteredLogs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-[#111827] font-medium">No activity logs found</p>
                  <p className="text-[#6B7280] text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="font-semibold text-[#111827]">{log.user_name || 'System'}</p>
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                      <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{log.description}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {getActionBadge(log.action)}
                        {log.module && (
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-0.5 text-xs font-medium">
                            {log.module}
                          </Badge>
                        )}
                        {log.entity_type && (
                          <Badge className="bg-white text-slate-600 border border-slate-200 rounded-full px-3 py-0.5 text-xs font-medium">
                            {log.entity_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}