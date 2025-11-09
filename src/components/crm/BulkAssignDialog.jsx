import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, AlertTriangle, X } from 'lucide-react';

export default function BulkAssignDialog({ isOpen, onClose, users = [], onAssign, selectedCount }) {
  const [selectedUser, setSelectedUser] = useState('');

  const handleAssign = () => {
    if (selectedUser) {
      onAssign(selectedUser);
      setSelectedUser('');
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Fixed Close Button - Top Right */}
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 z-50 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Users className="w-5 h-5 text-violet-600" />
            Bulk Assign Leads
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center p-4 bg-violet-50 rounded-lg">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {selectedCount} leads selected
            </Badge>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Assign to Admission Team Member:
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select an admission team member..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Array.isArray(users) && users.length > 0 ? (
                  <ScrollArea className="h-[280px]">
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          <span>{user.display_name || user.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.designation || 'Admission'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                ) : (
                  <div className="p-3 text-center">
                    <AlertTriangle className="w-4 h-4 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm text-amber-600">No admission department employees found. Please ensure users have department set to 'admission'.</p>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedUser || users.length === 0}
            className="btn-primary"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Assign {selectedCount} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}