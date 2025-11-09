
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "@/entities/User";
import { Lead } from "@/entities/Lead";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Search, ChevronDown, List, LayoutGrid, FileSpreadsheet } from "lucide-react";
import LeadForm from "../components/crm/LeadForm";
import DragDropPipeline from "../components/crm/DragDropPipeline";
import CRMFilters from "../components/crm/CRMFilters";
import CRMTableView from "../components/crm/CRMTableView";
import BulkAssignDialog from "../components/crm/BulkAssignDialog";
import { toast } from "sonner";
import LeadImportExport from '../components/crm/LeadImportExport';
import { NotificationService } from "../components/notifications/NotificationService";

const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "converted", "lost", "nurturing"];

export default function CRMPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [originalLeads, setOriginalLeads] = useState([]); // Added state to store all leads accessible to the user
  const [stats, setStats] = useState({}); // Added state for status counts
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline');
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});

  // OPTIMIZED: Wrap loadInitialData in useCallback to prevent unnecessary re-renders
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userData, employeeData] = await Promise.all([
        User.me().catch(() => null),
        User.list().catch(() => [])
      ]);
      
      setCurrentUser(userData);
      // Ensure employeeData is an array before setting users
      setUsers(Array.isArray(employeeData) ? employeeData : []);

      let leadsData = [];
      if (userData && (userData.job_role === 'admin' || userData.job_role === 'department_head')) {
        // Admin and Department Heads can see all leads
        leadsData = await Lead.list('-created_date', 1000).catch(() => []); // Max 1000 leads, sorted by created_date DESC
      } else if (userData && userData.id) {
        // Other roles can only see leads assigned to them
        leadsData = await Lead.filter({ assigned_to: userData.id }, '-created_date', 1000).catch(() => []); // Max 1000 leads, sorted by created_date DESC
      } else {
        // No user data or user not authorized for specific leads, no leads loaded
        leadsData = [];
      }
      
      // Ensure leadsData is an array
      leadsData = Array.isArray(leadsData) ? leadsData : [];

      setLeads(leadsData); // Set currently displayed leads
      setOriginalLeads(leadsData); // Store the full set of leads accessible based on role
      
      if (leadsData.length > 0) {
        const statusCounts = leadsData.reduce((counts, lead) => {
          if (lead && lead.lead_status) {
            counts[lead.lead_status] = (counts[lead.lead_status] || 0) + 1;
          }
          return counts;
        }, {});
        setStats(statusCounts);
      } else {
        setStats({}); // No leads, no stats
      }
    } catch (error) {
      console.error("Error loading CRM data:", error);
      toast.error("Failed to load CRM data. Please try again.");
      setUsers([]);
      setLeads([]);
      setOriginalLeads([]);
      setStats({});
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since it doesn't depend on any props or state

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  // This function now applies client-side filters to the originalLeads array.
  // FIXED: Wrap loadLeads in useCallback to prevent dependency issues
  const loadLeads = useCallback(async (filters = searchFilters) => {
    setIsLoading(true); // Still set loading state, although client-side filtering is fast
    try {
      let currentFilteredLeads = [...originalLeads]; // Start with the full set accessible to the user

      // Apply assignedTo filter
      if (filters.assignedTo && filters.assignedTo !== 'all') {
          currentFilteredLeads = currentFilteredLeads.filter(lead => lead.assigned_to === filters.assignedTo);
      }
      // Apply status filter
      if (filters.status && filters.status !== 'all') {
          currentFilteredLeads = currentFilteredLeads.filter(lead => lead.lead_status === filters.status);
      }
      // Apply source filter
      if (filters.source && filters.source !== 'all') {
          currentFilteredLeads = currentFilteredLeads.filter(lead => lead.lead_source === filters.source);
      }
      // Apply course_interest filter
      if (filters.course_interest && filters.course_interest !== 'all') {
          currentFilteredLeads = currentFilteredLeads.filter(lead => lead.course_interest === filters.course_interest);
      }

      // Apply search term filter client-side
      if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          currentFilteredLeads = currentFilteredLeads.filter(lead => 
              (lead.student_name && lead.student_name.toLowerCase().includes(term)) ||
              (lead.phone && lead.phone.toLowerCase().includes(term)) ||
              (lead.email && lead.email.toLowerCase().includes(term))
          );
      }

      // Apply date range filter client-side
      if (filters.dateRange && filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : new Date(filters.dateRange.from);
        toDate.setHours(23, 59, 59, 999);
        
        currentFilteredLeads = currentFilteredLeads.filter(lead => {
          if (!lead.created_date) return false;
          const leadDate = new Date(lead.created_date);
          return leadDate >= fromDate && leadDate <= toDate;
        });
      }

      setLeads(currentFilteredLeads);
    } catch (error) {
      console.error("Failed to apply filters to leads:", error);
      toast.error("Failed to filter leads.");
      // In case of error during filtering, maybe revert to originalLeads or keep current filtered state
    } finally {
      setIsLoading(false);
    }
  }, [originalLeads, searchFilters]);

  // OPTIMIZED: Memoize handleFormSubmit
  const handleFormSubmit = useCallback(async (data) => {
    try {
      if (editingLead) {
        await Lead.update(editingLead.id, data);
        toast.success("Lead updated successfully!");
      } else {
        await Lead.create(data);
        toast.success("Lead created successfully!");
      }
      setEditingLead(null);
      setIsFormOpen(false);
      loadInitialData(); // Re-fetch all initial data to update list and originalLeads
    } catch (error) {
      console.error("Failed to save lead:", error);
      toast.error("Failed to save lead.");
    }
  }, [editingLead, loadInitialData, setIsFormOpen, setEditingLead]);

  // OPTIMIZED: Memoize handleEditLead
  const handleEditLead = useCallback((lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  }, [setEditingLead, setIsFormOpen]);
  
  // OPTIMIZED: Memoize handleBulkAssign
  const handleBulkAssign = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.warning("No leads selected for bulk assignment.");
      return;
    }
    setIsBulkAssignOpen(true);
  }, [selectedRows.length, setIsBulkAssignOpen]);

  // OPTIMIZED: Memoize handleBulkAssignSubmit
  const handleBulkAssignSubmit = useCallback(async (assigneeId) => {
    try {
        const updates = selectedRows.map(leadId => Lead.update(leadId, { assigned_to: assigneeId }));
        await Promise.all(updates);
        
        // Send notifications for lead assignments
        const assignedUser = users.find(u => u && u.id === assigneeId);
        if (assignedUser && currentUser) {
          const assignedLeads = leads.filter(l => selectedRows.includes(l.id));
          
          for (const lead of assignedLeads) {
            if (NotificationService && NotificationService.notifyLeadAssignment) {
                await NotificationService.notifyLeadAssignment(
                  lead.id,
                  assigneeId,
                  currentUser.full_name,
                  lead.student_name || 'Unknown Student'
                );
            }
          }
        }
        
        toast.success(`${selectedRows.length} leads successfully assigned.`);
        setIsBulkAssignOpen(false);
        setSelectedRows([]);
        loadInitialData(); // Re-fetch all initial data to update list and originalLeads
    } catch (error) {
        console.error("Bulk assign error:", error);
        toast.error("Failed to assign leads.");
    }
  }, [selectedRows, users, currentUser, leads, loadInitialData, setIsBulkAssignOpen, setSelectedRows]);

  // This is already wrapped in useCallback
  const handleSearch = useCallback((filters) => {
    setSearchFilters(filters);
    loadLeads(filters); // Calls the client-side filtering function
  }, [loadLeads]); // Depend on loadLeads as it's now useCallback

  // OPTIMIZED: Memoize handleLeadStatusChange
  const handleLeadStatusChange = useCallback(async (leadId, newStatus) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        await Lead.update(leadId, { ...lead, lead_status: newStatus });
        toast.success("Lead status updated successfully!");
        loadInitialData(); // Re-fetch all initial data to update list and originalLeads
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
      toast.error("Failed to update lead status.");
    }
  }, [leads, loadInitialData]);

  const getEmployeeName = useCallback((userId) => {
    if (!Array.isArray(users) || !userId) return 'Unassigned';
    const user = users.find(u => u && u.id === userId);
    return user ? user.full_name : 'Unassigned';
  }, [users]);

  const getStatusColor = useCallback((status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-cyan-100 text-cyan-800',
      qualified: 'bg-teal-100 text-teal-800',
      proposal_sent: 'bg-indigo-100 text-indigo-800',
      negotiation: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      nurturing: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const getLeadScoreColor = useCallback((score) => {
    if (score >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  }, []);

  const leadsByStatus = useMemo(() => {
    if (!Array.isArray(leads)) return {};
    
    return LEAD_STATUSES.reduce((acc, status) => {
      acc[status] = leads.filter(lead => lead && lead.lead_status === status);
      return acc;
    }, {});
  }, [leads]);

  // ENHANCED: Bulk assign permissions for Department Head, Admin, and Manager roles
  const canBulkAssign = useMemo(() => {
    return currentUser && (
      currentUser.role === 'admin' || 
      currentUser.job_role === 'admin' || 
      currentUser.job_role === 'department_head' || 
      currentUser.job_role === 'manager'
    );
  }, [currentUser]);

  // ENHANCED: Filter users more intelligently based on current user's role and department access
  const admissionUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    // Admin can see all admission users
    if (currentUser?.job_role === 'admin' || currentUser?.role === 'admin') {
      return users.filter(user => user.department === 'admission');
    }
    
    // Department heads and managers can see all admission users too
    if (currentUser?.job_role === 'department_head' || currentUser?.job_role === 'manager') {
      return users.filter(user => user.department === 'admission');
    }
    
    // Other roles see limited users
    return users.filter(user => 
      user.department === 'admission' && 
      user.id !== currentUser?.id // Don't show self
    );
  }, [users, currentUser]);
  
  // OPTIMIZED: Show skeleton loader while loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-auto">
              <div className="space-y-1 w-full">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3 md:w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full md:w-1/2"></div>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full md:w-auto justify-center md:justify-start">
                <div className="h-8 px-3 text-xs flex-1 md:flex-none bg-gray-200 rounded-md animate-pulse mr-1"></div>
                <div className="h-8 px-3 text-xs flex-1 md:flex-none bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full lg:w-auto">
              <div className="h-9 w-full md:w-40 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="h-9 w-full md:w-36 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="h-9 w-full md:w-32 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-4 space-y-2 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4"> {/* Updated main wrapper */}
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4"> {/* Outer header styling */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"> {/* Responsive layout for main header content */}
          {/* Left section: Title/Subtitle and View Mode Toggle */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-auto"> {/* Added w-full for small screens */}
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold font-display text-gradient">CRM & Lead Management</h1>
              <p className="text-muted-foreground">Monitor, assign, and convert your leads efficiently.</p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full md:w-auto justify-center md:justify-start"> {/* Added w-full, justify-center for mobile */}
              <Button 
                variant={viewMode === 'pipeline' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('pipeline')}
                className="h-8 px-3 text-xs flex-1 md:flex-none" // flex-1 for full width on mobile
              >
                <LayoutGrid className="w-4 h-4 mr-1"/> Pipeline
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('table')}
                className="h-8 px-3 text-xs flex-1 md:flex-none" // flex-1 for full width on mobile
              >
                <List className="w-4 h-4 mr-1"/> Table
              </Button>
            </div>
          </div>

          {/* Right section: Action buttons */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full lg:w-auto"> {/* Added w-full for small screens */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full md:w-auto"> {/* Added w-full for mobile */}
                  <FileSpreadsheet className="w-4 h-4 mr-2"/>
                  Import / Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Lead Data Management</DialogTitle></DialogHeader>
                <LeadImportExport leads={leads} onImportComplete={loadInitialData} />
              </DialogContent>
            </Dialog>

            {canBulkAssign && (
              <Button 
                onClick={handleBulkAssign} 
                disabled={selectedRows.length === 0}
                variant={selectedRows.length > 0 ? "default" : "outline"}
                size="sm"
                className="w-full md:w-auto" // Added w-full for mobile
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Assign {selectedRows.length > 0 && `(${selectedRows.length})`}
              </Button>
            )}
            
            <Button onClick={() => { setEditingLead(null); setIsFormOpen(true); }} className="btn-primary w-full md:w-auto" size="sm"> {/* Added w-full for mobile */}
              <Plus className="w-4 h-4 mr-2" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Universal Filter Bar */}
        <div className="mt-4"> {/* Added margin-top to separate from above row */}
          <CRMFilters
              filters={searchFilters}
              setFilters={setSearchFilters}
              users={users}
              onSearch={handleSearch}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'pipeline' ? (
          <div className="h-full overflow-auto p-6">
            <DragDropPipeline
              leadsByStatus={leadsByStatus}
              onLeadUpdate={loadInitialData} // Changed to loadInitialData to refresh full data set
              onEditLead={handleEditLead}
              users={users}
              getEmployeeName={getEmployeeName}
              getStatusColor={getStatusColor}
              getLeadScoreColor={getLeadScoreColor}
              onStatusChange={handleLeadStatusChange}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto p-6">
            <CRMTableView 
              leads={leads} 
              users={users}
              onEditLead={handleEditLead}
              onLeadClick={handleEditLead}
              selectedLeads={selectedRows}
              setSelectedLeads={setSelectedRows}
              onSelectionChange={setSelectedRows}
              getEmployeeName={getEmployeeName}
              getStatusColor={getStatusColor}
              getLeadScoreColor={getLeadScoreColor}
              canBulkAssign={canBulkAssign}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          </DialogHeader>
          <LeadForm
            lead={editingLead}
            users={users}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <BulkAssignDialog
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        users={admissionUsers}
        onAssign={handleBulkAssignSubmit}
        selectedCount={selectedRows.length}
      />
    </div>
  );
}
