
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Phone, Mail, Calendar, Star, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import DateRangeFilter from './DateRangeFilter';

const COURSE_INTERESTS = ["bcs", "bank", "ntrca", "recorded_course", "it_course", "general"];

export default function CRMTableView({ 
  leads = [], 
  users = [], 
  selectedLeads = [], 
  setSelectedLeads = () => {}, 
  onLeadClick = () => {}, 
  onEditLead = () => {},
  getEmployeeName = () => 'Unassigned',
  getStatusColor = () => '',
  getLeadScoreColor = () => '',
  canBulkAssign = false,
  filters = {},
  setFilters = () => {}
}) {
  
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
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

  const isAllSelected = Array.isArray(leads) && leads.length > 0 && selectedLeads.length === leads.length;
  const isIndeterminate = selectedLeads.length > 0 && selectedLeads.length < leads.length;
  
  const campaignOptions = useMemo(() => {
      const safeLeads = Array.isArray(leads) ? leads : [];
      const campaigns = new Set(safeLeads.map(l => l.campaign_name).filter(Boolean));
      return Array.from(campaigns);
  }, [leads]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Leads ({Array.isArray(leads) ? leads.length : 0})</span>
          {canBulkAssign && selectedLeads.length > 0 && (
            <Badge variant="secondary">{selectedLeads.length} selected</Badge>
          )}
        </CardTitle>
        
        {/* Enhanced Filters with Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Input 
            placeholder="Search by name or phone..."
            value={filters.search || ''}
            onChange={e => setFilters({...filters, search: e.target.value})}
          />
          
          <DateRangeFilter
            value={filters.dateRange}
            onChange={(dateRange) => setFilters({...filters, dateRange})}
          />
          
          <Select value={filters.status || 'all'} onValueChange={value => setFilters({...filters, status: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="nurturing">Nurturing</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.assigned_to || 'all'} onValueChange={value => setFilters({...filters, assigned_to: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {(Array.isArray(users) ? users : []).map(user => (
                <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.course_interest || 'all'} onValueChange={value => setFilters({...filters, course_interest: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Course Interest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {COURSE_INTERESTS.map(course => (
                <SelectItem key={course} value={course}>{course.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-auto responsive-table">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {canBulkAssign && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      ref={ref => {
                        if (ref) ref.indeterminate = isIndeterminate;
                      }}
                    />
                  </TableHead>
                )}
                <TableHead>Lead</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Course Interest</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(leads) ? leads : []).map(lead => {
                const followUpCount = lead.call_history?.length || 0;
                const needsFollowUp = followUpCount < 5;
                
                return (
                  <TableRow 
                    key={lead.id} 
                    className="hover:bg-muted/50 transition-colors duration-200"
                    onClick={() => onLeadClick(lead)}
                    style={{ cursor: 'pointer' }}
                  >
                    {canBulkAssign && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.student_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.campaign_name && <Badge variant="secondary">{lead.campaign_name}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {lead.course_interest}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{lead.lead_source?.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.lead_status)}>
                        {lead.lead_status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{lead.lead_score || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getEmployeeName(lead.assigned_to)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(lead.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditLead(lead)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {(Array.isArray(leads) && leads.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No leads found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
