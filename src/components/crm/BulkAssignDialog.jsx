import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, AlertTriangle, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function BulkAssignDialog({ isOpen, onClose, users = [], onAssign, selectedCount }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      (user.display_name || user.full_name)?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.designation?.toLowerCase().includes(term) ||
      user.employee_id?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleAssign = () => {
    if (selectedUser) {
      onAssign(selectedUser);
      setSelectedUser('');
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    setSearchTerm('');
    onClose();
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            Bulk Assign Leads
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Selected Count Badge */}
          <div className="flex items-center justify-center p-4 bg-violet-50 rounded-lg">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {selectedCount} leads selected
            </Badge>
          </div>
          
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Assign to Admission Team Member:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User Selection List */}
          <div className="space-y-2">
            {Array.isArray(users) && users.length > 0 ? (
              <ScrollArea className="h-[280px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedUser === user.id 
                            ? 'bg-violet-100 border-2 border-violet-500' 
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-semibold">
                            {(user.display_name || user.full_name)?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {user.display_name || user.full_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.designation || 'Admission'}
                            </Badge>
                            {user.employee_id && (
                              <span className="text-xs text-muted-foreground">
                                ID: {user.employee_id}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedUser === user.id && (
                          <UserCheck className="w-5 h-5 text-violet-600" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">No members found matching "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 text-center border rounded-lg">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm text-amber-600">No admission department employees found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please ensure users have department set to 'admission'.
                </p>
              </div>
            )}
          </div>

          {/* Selected User Preview */}
          {selectedUserData && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border-2 border-violet-200">
              <p className="text-xs font-medium text-violet-700 mb-2">SELECTED ASSIGNEE:</p>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUserData.profile_picture_url} />
                  <AvatarFallback className="bg-violet-500 text-white">
                    {(selectedUserData.display_name || selectedUserData.full_name)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm">{selectedUserData.display_name || selectedUserData.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUserData.designation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
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
      </DialogContent>
    </Dialog>
  );
}