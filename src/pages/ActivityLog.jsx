import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { FileText, Filter, Search, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const userMatch = filters.user === 'all' || log.user_id === filters.user;
    const moduleMatch = filters.module === 'all' || log.module === filters.module;
    const actionMatch = filters.action === 'all' || log.action === filters.action;
    const searchMatch = !filters.search || log.description.toLowerCase().includes(filters.search.toLowerCase());
    return userMatch && moduleMatch && actionMatch && searchMatch;
  });

  if (isLoading) {
    return <div className="p-6">Loading activity logs...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">Track all system activities and user actions.</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search descriptions..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
          <Select value={filters.user} onValueChange={(value) => setFilters({ ...filters, user: value })}>
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="crm">CRM</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredLogs.map(log => (
          <div key={log.id} className="flex items-start gap-4 p-4 bg-white rounded-lg shadow">
            <div className="p-3 bg-gray-100 rounded-full">
              <UserIcon className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-semibold">{log.user_name || 'System'}</p>
                <p className="text-sm text-gray-500">{format(new Date(log.timestamp), 'MMM d, yyyy, h:mm a')}</p>
              </div>
              <p>{log.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                <Badge variant="secondary">{log.module}</Badge>
                {log.entity_type && <Badge variant="outline">{log.entity_type}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}