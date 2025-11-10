import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Searchable Employee Filter Component
function SearchableEmployeeFilter({ users = [], value, onChange, label = "Assigned To" }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      (user.display_name || user.full_name)?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.employee_id?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <SelectItem value="all">All Employees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          
          <ScrollArea className="max-h-[200px]">
            {filteredUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700">
                    {(user.display_name || user.full_name)?.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{user.display_name || user.full_name}</span>
                  {user.employee_id && (
                    <span className="text-xs text-muted-foreground">({user.employee_id})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </ScrollArea>
          
          {filteredUsers.length === 0 && searchTerm && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No employees found for "{searchTerm}"
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function CRMFilters({ filters, setFilters, users = [], onSearch }) {
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onSearch) {
      onSearch(newFilters);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-white rounded-lg border">
      {/* Status Filter */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700">Status</Label>
        <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Department Filter */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700">Department</Label>
        <Select value={filters.department || 'all'} onValueChange={(value) => handleFilterChange('department', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="biddabari">Biddabari</SelectItem>
            <SelectItem value="boibari">Boibari</SelectItem>
            <SelectItem value="prodhan_com_e_commerce">Prodhan.com</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Source Filter */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700">Source</Label>
        <Select value={filters.source || 'all'} onValueChange={(value) => handleFilterChange('source', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
            <SelectItem value="google_ads">Google Ads</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead Score Filter */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700">Lead Score</Label>
        <Select value={filters.leadScore || 'all'} onValueChange={(value) => handleFilterChange('leadScore', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="high">High (80-100)</SelectItem>
            <SelectItem value="medium">Medium (50-79)</SelectItem>
            <SelectItem value="low">Low (0-49)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700">Date Range</Label>
        <Select value={filters.dateRange || 'all'} onValueChange={(value) => handleFilterChange('dateRange', value)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Searchable Employee Filter */}
      <SearchableEmployeeFilter
        users={users}
        value={filters.assignedTo}
        onChange={(value) => handleFilterChange('assignedTo', value)}
        label="Assigned To"
      />
    </div>
  );
}