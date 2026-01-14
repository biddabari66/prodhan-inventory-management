import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Activity, Filter, Search, User as UserIcon, Clock, Shield, Loader2, RefreshCw } from 'lucide-react';
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

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'update': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'delete': return 'bg-red-100 text-red-700 border border-red-200';
      case 'login': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'logout': return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'export': return 'bg-amber-100 text-amber-700 border border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create': return '✨';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'login': return '🔐';
      case 'logout': return '🚪';
      case 'export': return '📤';
      default: return '📋';
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/20">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-200">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
              <p className="text-slate-500 text-sm">Track all system activities and user actions</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase font-medium">Total Actions</p>
              <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase font-medium">Updates</p>
              <p className="text-2xl font-bold text-blue-600">{logs.filter(l => l.action === 'update').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase font-medium">Deletions</p>
              <p className="text-2xl font-bold text-red-600">{logs.filter(l => l.action === 'delete').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase font-medium">Logins</p>
              <p className="text-2xl font-bold text-purple-600">{logs.filter(l => l.action === 'login').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Filter className="w-4 h-4 text-red-600" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search descriptions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 border-slate-200"
              />
            </div>
            <Select value={filters.user} onValueChange={(value) => setFilters({ ...filters, user: value })}>
              <SelectTrigger className="border-slate-200">
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
              <SelectTrigger className="border-slate-200">
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
              <SelectTrigger className="border-slate-200">
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
        <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
            <CardTitle className="text-base font-semibold text-slate-800">
              Recent Activity ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No activity logs found</p>
                  <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center text-lg">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="font-semibold text-slate-900">{log.user_name || 'System'}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{log.description}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        {log.module && <Badge variant="secondary" className="bg-slate-100 text-slate-700">{log.module}</Badge>}
                        {log.entity_type && <Badge variant="outline" className="border-slate-200 text-slate-600">{log.entity_type}</Badge>}
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