
import React, { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, UserCheck, Building2, ArrowRight, Eye, Phone, Mail, MapPin } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function LeadDatabase() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewLead, setQuickViewLead] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(''); // This might become less relevant with the new dialog structure

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [user, userList, leadList] = await Promise.all([
        User.me().catch(() => null),
        User.list().catch(() => []),
        Lead.list().catch(() => [])
      ]);
      setCurrentUser(user);
      setUsers(Array.isArray(userList) ? userList : []);
      setAllLeads(Array.isArray(leadList) ? leadList : []);
    } catch (error) {
      console.error("Failed to load lead database data:", error);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter leads based on selected date range
  const filteredLeads = useMemo(() => {
    if (!dateRange?.from || !Array.isArray(allLeads)) return [];

    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return allLeads.filter(lead => {
      const leadDate = new Date(lead.created_date);
      return leadDate >= fromDate && leadDate <= toDate;
    });
  }, [allLeads, dateRange]);

  // Group users by department for bulk assignment
  const usersByDepartment = useMemo(() => {
    const grouped = {};
    users.forEach(user => {
      const dept = user.department || 'other';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(user);
    });
    return grouped;
  }, [users]);

  // Formatted title for the selected date range
  const selectedDateTitle = useMemo(() => {
    if (!dateRange?.from) {
      return "Select a date range";
    }
    const fromFormatted = format(dateRange.from, 'MMM d, yyyy');
    if (dateRange.to) {
      const toFormatted = format(dateRange.to, 'MMM d, yyyy');
      return `${fromFormatted} - ${toFormatted}`;
    }
    return fromFormatted;
  }, [dateRange]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId, checked) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const openQuickView = (lead) => {
    setQuickViewLead(lead);
    setIsQuickViewOpen(true);
  };

  const openBulkAction = (actionType) => { // This actionType will likely just be 'assign'
    if (selectedLeads.length === 0) {
      toast.warning('Please select leads first.');
      return;
    }
    setBulkActionType(actionType);
    setIsBulkActionDialogOpen(true);
  };

  const handleBulkAssignToEmployee = async (employeeId) => {
    try {
      const updates = selectedLeads.map(leadId =>
        Lead.update(leadId, { assigned_to: employeeId })
      );
      await Promise.all(updates);
      toast.success(`${selectedLeads.length} leads assigned successfully.`);
      setSelectedLeads([]);
      setIsBulkActionDialogOpen(false);
      loadInitialData(); // Refresh data
    } catch (error) {
      console.error('Bulk assign error:', error);
      toast.error('Failed to assign leads.');
    }
  };

  // Deprecated by new bulk assign dialog, but kept for context if needed later.
  // const handleBulkAssignByDepartment = async (department) => {
  //   try {
  //     const departmentUsers = usersByDepartment[department] || [];
  //     if (departmentUsers.length === 0) {
  //       toast.error('No users found in selected department.');
  //       return;
  //     }

  //     // Evenly distribute leads among department users
  //     const updates = selectedLeads.map((leadId, index) => {
  //       const assignedUser = departmentUsers[index % departmentUsers.length];
  //       return Lead.update(leadId, { assigned_to: assignedUser.id });
  //     });

  //     await Promise.all(updates);
  //     toast.success(`${selectedLeads.length} leads distributed among ${department} department.`);
  //     setSelectedLeads([]);
  //     setIsBulkActionDialogOpen(false);
  //     loadInitialData(); // Refresh data
  //   } catch (error) {
  //     console.error('Bulk department assign error:', error);
  //     toast.error('Failed to assign leads by department.');
  //   }
  // };

  // Deprecated by new bulk assign dialog, but kept for context if needed later.
  // const handleBulkPipelineUpdate = async (newStage) => {
  //   try {
  //     const updates = selectedLeads.map(leadId =>
  //       Lead.update(leadId, { lead_status: newStage })
  //     );
  //     await Promise.all(updates);
  //     toast.success(`${selectedLeads.length} leads moved to ${newStage.replace('_', ' ')} stage.`);
  //     setSelectedLeads([]);
  //     setIsBulkActionDialogOpen(false);
  //     loadInitialData(); // Refresh data
  //   } catch (error) {
  //     console.error('Bulk pipeline update error:', error);
  //     toast.error('Failed to update pipeline stages.');
  //   }
  // };

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;
  // const isIndeterminate = selectedLeads.length > 0 && selectedLeads.length < filteredLeads.length; // No longer needed for UI

  const canBulkAssign = currentUser && (currentUser.role === 'admin' || currentUser.job_role === 'department_head' || currentUser.job_role === 'manager');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Date Selection */}
        <Card className="lg:w-80 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="w-5 h-5" />
              Filter leads by creation date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-11"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 shadow-lg border"
                align="start"
                side="right"
                sideOffset={10}
              >
                <div className="p-4">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      // Optionally close the calendar if both from and to dates are selected
                      if (range?.from && range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={1}
                    className="rounded-md"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {dateRange?.from && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm font-medium text-purple-900 mb-1">
                  {selectedDateTitle}
                </div>
                <div className="text-xs text-purple-700">
                  {filteredLeads.length} leads found
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Content Area */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">
                    Leads for {selectedDateTitle}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {filteredLeads.length} leads found
                  </p>
                </div>

                {/* Bulk Actions */}
                {canBulkAssign && selectedLeads.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedLeads.length} selected
                    </span>
                    <Button
                      size="sm"
                      onClick={() => openBulkAction('assign')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Bulk Assign
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No leads found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dateRange?.from
                      ? "No leads were created on the selected date(s)."
                      : "Please select a date range to view leads."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          {canBulkAssign && (
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          )}
                        </TableHead>
                        <TableHead>Lead Information</TableHead>
                        <TableHead>Course Interest</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className="hover:bg-muted/50">
                          <TableCell>
                            {canBulkAssign && (
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={(checked) => handleSelectLead(lead.id, checked)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{lead.student_name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {lead.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {lead.course_interest}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`
                                ${lead.lead_status === 'new' ? 'bg-blue-100 text-blue-800' : ''}
                                ${lead.lead_status === 'contacted' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${lead.lead_status === 'qualified' ? 'bg-green-100 text-green-800' : ''}
                                ${lead.lead_status === 'proposal_sent' ? 'bg-purple-100 text-purple-800' : ''}
                                ${lead.lead_status === 'negotiation' ? 'bg-orange-100 text-orange-800' : ''}
                                ${lead.lead_status === 'converted' ? 'bg-emerald-100 text-emerald-800' : ''}
                                ${lead.lead_status === 'lost' ? 'bg-red-100 text-red-800' : ''}
                                ${lead.lead_status === 'nurturing' ? 'bg-indigo-100 text-indigo-800' : ''}
                                ${!lead.lead_status ? 'bg-gray-100 text-gray-800' : ''}
                              `}
                            >
                              {lead.lead_status?.replace('_', ' ').toUpperCase() || 'NEW'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lead.assigned_to ? (
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-green-600" />
                                <span className="text-sm">
                                  {users.find(u => u.id === lead.assigned_to)?.full_name || 'Assigned'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(lead.created_date), 'MMM d, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openQuickView(lead)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick View Sheet */}
      <Sheet open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Lead Details</SheetTitle>
          </SheetHeader>

          {quickViewLead && (
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {quickViewLead.student_name}</div>
                    <div><span className="font-medium">Phone:</span> {quickViewLead.phone}</div>
                    {quickViewLead.email && <div><span className="font-medium">Email:</span> {quickViewLead.email}</div>}
                    {quickViewLead.city && <div><span className="font-medium">Location:</span> {quickViewLead.city}</div>}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Lead Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Course Interest:</span> {quickViewLead.course_interest}</div>
                    <div><span className="font-medium">Status:</span> {quickViewLead.lead_status?.replace('_', ' ')}</div>
                    <div><span className="font-medium">Source:</span> {quickViewLead.lead_source?.replace('_', ' ')}</div>
                    <div><span className="font-medium">Score:</span> {quickViewLead.lead_score || 0}/100</div>
                    <div><span className="font-medium">Assigned To:</span> {users.find(u => u.id === quickViewLead.assigned_to)?.full_name || 'Unassigned'}</div>
                  </div>
                </div>

                {quickViewLead.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{quickViewLead.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="text-sm text-muted-foreground">
                    Created: {format(new Date(quickViewLead.created_date), 'PPpp')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedLeads.length} Leads</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Select an employee below to assign the {selectedLeads.length} selected leads.
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2"> {/* Added max-height and overflow for scrollable content */}
              {Object.keys(usersByDepartment).length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No users available for assignment.</div>
              ) : (
                Object.entries(usersByDepartment).map(([department, departmentUsers]) => (
                  <div key={department} className="space-y-1">
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                      {department.replace('_', ' ').toUpperCase()} ({departmentUsers.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {departmentUsers.map(user => (
                        <Button
                          key={user.id}
                          variant="outline"
                          className="w-full justify-start h-auto p-3 text-left items-center"
                          onClick={() => handleBulkAssignToEmployee(user.id)}
                        >
                          <UserCheck className="w-4 h-4 mr-2 flex-shrink-0 text-green-600" />
                          <div className="flex-grow">
                            <div className="font-medium text-sm">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
