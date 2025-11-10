import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 🔍 SEARCHABLE USER SELECT COMPONENT
 * Beautiful, searchable dropdown for selecting users/employees
 * Shows display_name, avatar, designation, employee ID
 */

export default function SearchableUserSelect({ 
  users = [], 
  value, 
  onChange, 
  placeholder = "Search employees...",
  className = "",
  allowClear = false,
  showAvatar = true,
  showBadge = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      (user.display_name || user.full_name)?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.designation?.toLowerCase().includes(term) ||
      user.employee_id?.toLowerCase().includes(term) ||
      user.department?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const selectedUser = users.find(u => u.id === value);

  const handleSelect = (userId) => {
    onChange(userId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-violet-400 transition-colors bg-white"
      >
        {selectedUser ? (
          <>
            {showAvatar && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedUser.profile_picture_url} />
                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                  {(selectedUser.display_name || selectedUser.full_name)?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedUser.display_name || selectedUser.full_name}
              </p>
              {showBadge && (
                <Badge variant="outline" className="text-xs mt-1">
                  {selectedUser.designation || selectedUser.department}
                </Badge>
              )}
            </div>
            {allowClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="w-4 h-4" />
            <span className="text-sm">{placeholder}</span>
          </div>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-2xl">
            {/* Search Header */}
            <div className="p-3 border-b bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* User List */}
            <ScrollArea className="max-h-[320px]">
              <div className="p-2 space-y-1">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => handleSelect(user.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        value === user.id 
                          ? 'bg-violet-100 border-2 border-violet-500' 
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">
                          {(user.display_name || user.full_name)?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {user.display_name || user.full_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {user.designation || user.department}
                          </Badge>
                          {user.employee_id && (
                            <span className="text-xs text-muted-foreground">
                              {user.employee_id}
                            </span>
                          )}
                        </div>
                      </div>
                      {value === user.id && (
                        <UserCheck className="w-5 h-5 text-violet-600 flex-shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Search className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-600 font-medium">No members found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* No Results State */}
            {users.length === 0 && (
              <div className="p-6 text-center">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                <p className="text-sm text-amber-600 font-medium">No admission team members found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please ensure users have department set to 'admission'
                </p>
              </div>
            )}
          </div>
        </>
      )}
      
      <DialogFooter className="gap-2 mt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleAssign} 
          disabled={!selectedUser || users.length === 0}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <UserCheck className="w-4 h-4 mr-2" />
          Assign {selectedCount} Leads
        </Button>
      </DialogFooter>
    </Dialog>
  );
}