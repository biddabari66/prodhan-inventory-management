import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  FileText, Search, RefreshCw, Filter, Activity, Users, 
  Eye, Edit, Trash2, LogIn, LogOut, Download, Upload, Shield,
  Calendar, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { withPermission } from '@/components/common/PermissionGuard';

function AuditTrailViewer() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [auditLogs, allUsers] = await Promise.all([
        AuditLog.list('-timestamp', 1000),
        User.list()
      ]);
      
      // Filter only Prodhan.com E-commerce employees
      const prodhanUsers = allUsers.filter(u => 
        u.department === 'prodhan_com_e_commerce' || 
        u.job_role === 'admin' || 
        u.job_role === 'super_admin'
      );
      
      // Filter logs to only show Prodhan.com E-commerce department activities
      const filteredLogs = auditLogs.filter(log => {
        const user = prodhanUsers.find(u => u.id === log.user_id);
        return user || log.module?.toLowerCase().includes('inventory') || 
               log.module?.toLowerCase().includes('sales') ||
               log.module?.toLowerCase().includes('order') ||
               log.module?.toLowerCase().includes('customer');
      });
      
      setLogs(filteredLogs);
      setUsers(prodhanUsers);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      create: <Edit className="w-4 h-4 text-green-600" />,
      update: <Edit className="w-4 h-4 text-blue-600" />,
      delete: <Trash2 className="w-4 h-4 text-red-600" />,
      login: <LogIn className="w-4 h-4 text-indigo-600" />,
      logout: <LogOut className="w-4 h-4 text-slate-600" />,
      export: <Download className="w-4 h-4 text-purple-600" />,
      import: <Upload className="w-4 h-4 text-orange-600" />,
      view_sensitive: <Eye className="w-4 h-4 text-amber-600" />
    };
    return icons[action] || <Activity className="w-4 h-4 text-slate-500" />;
  };

  const getActionBadge = (action) => {
    const styles = {
      create: 'bg-green-100 text-green-800 border-green-300',
      update: 'bg-blue-100 text-blue-800 border-blue-300',
      delete: 'bg-red-100 text-red-800 border-red-300',
      login: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      logout: 'bg-slate-100 text-slate-800 border-slate-300',
      export: 'bg-purple-100 text-purple-800 border-purple-300',
      import: 'bg-orange-100 text-orange-800 border-orange-300',
      view_sensitive: 'bg-amber-100 text-amber-800 border-amber-300'
    };
    return styles[action] || 'bg-slate-100 text-slate-800';
  };

  const uniqueModules = useMemo(() => {
    const modules = [...new Set(logs.map(l => l.module).filter(Boolean))];
    return modules.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
      const matchesUser = userFilter === 'all' || log.user_id === userFilter;
      
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = new Date(log.timestamp) >= new Date(dateFrom);
      }
      if (dateTo && matchesDate) {
        matchesDate = new Date(log.timestamp) <= new Date(dateTo + 'T23:59:59');
      }
      
      return matchesSearch && matchesAction && matchesModule && matchesUser && matchesDate;
    });
  }, [logs, searchTerm, actionFilter, moduleFilter, userFilter, dateFrom, dateTo]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    creates: filteredLogs.filter(l => l.action === 'create').length,
    updates: filteredLogs.filter(l => l.action === 'update').length,
    deletes: filteredLogs.filter(l => l.action === 'delete').length,
    logins: filteredLogs.filter(l => l.action === 'login').length
  }), [filteredLogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Audit Trail</h1>
            <p className="text-slate-600">Track all user activities • Prodhan.com E-commerce Department</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase">Total Activities</p>
            <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase">Creates</p>
            <p className="text-2xl font-bold text-green-600">{stats.creates}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase">Updates</p>
            <p className="text-2xl font-bold text-blue-600">{stats.updates}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase">Deletes</p>
            <p className="text-2xl font-bold text-red-600">{stats.deletes}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 uppercase">Logins</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.logins}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map(mod => (
                  <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Activity Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">User</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[120px]">Module</TableHead>
                  <TableHead className="w-[120px]">Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No activity logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy')}
                          <span className="text-slate-400">
                            {format(new Date(log.timestamp), 'h:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                            {log.user_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-sm truncate max-w-[100px]">
                            {log.user_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getActionBadge(log.action)} flex items-center gap-1 w-fit`}>
                          {getActionIcon(log.action)}
                          {log.action?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.module || 'System'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {log.entity_type || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[300px] truncate">
                        {log.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-slate-500">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3">Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPermission(AuditTrailViewer, 'settings', 'can_view');