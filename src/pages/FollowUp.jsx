
import React, { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneCall, MessageSquare, CalendarCheck, UserCheck } from 'lucide-react';
import LogFollowUpDialog from '../components/followup/LogFollowUpDialog';

export default function FollowUp() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLogOpen, setIsLogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allLeads, allUsers, me] = await Promise.all([
        Lead.list().catch(() => []),
        User.list().catch(() => []),
        User.me().catch(() => null)
      ]);
      setLeads(Array.isArray(allLeads) ? allLeads : []);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setCurrentUser(me);
    } catch (error) {
      console.error("Error loading follow-up data:", error);
      setLeads([]); // Ensure leads is an array on error
      setUsers([]); // Ensure users is an array on error
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeName = (id) => {
      if (!Array.isArray(users)) return 'Unassigned';
      return users.find(u => u.id === id)?.full_name || 'Unassigned';
  }

  const todaysFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter(lead => 
      lead.next_follow_up === today &&
      (currentUser?.role === 'admin' || lead.assigned_to === currentUser?.id)
    );
  }, [leads, currentUser]);

  const overdueFollowUps = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter(lead => 
      lead.next_follow_up && lead.next_follow_up < today &&
      (currentUser?.role === 'admin' || lead.assigned_to === currentUser?.id)
    );
  }, [leads, currentUser]);

  const handleLogFollowUp = (lead) => {
    setSelectedLead(lead);
    setIsLogOpen(true);
  };

  const onLogSubmit = async (leadId, outcome, notes, nextFollowUpDate) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      const updatedHistory = [...(lead.call_history || []), {
        date: new Date().toISOString(),
        outcome,
        notes,
      }];
      
      await Lead.update(leadId, {
        call_history: updatedHistory,
        last_contact_date: new Date().toISOString().slice(0, 10),
        next_follow_up: nextFollowUpDate
      });
      
      setIsLogOpen(false);
      setSelectedLead(null);
      loadData();
    } catch (error) {
      console.error("Error logging follow-up:", error);
    }
  };

  if (isLoading) return <div className="p-8">Loading Follow-up tasks...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-display text-gradient">Daily Follow-Ups</h1>
        <p className="text-lg text-muted-foreground mt-1">Your priority tasks for today to maximize conversions.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-green-500" />
              Today's Follow-Ups ({todaysFollowUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysFollowUps && todaysFollowUps.map(lead => (
              <FollowUpCard key={lead.id} lead={lead} getEmployeeName={getEmployeeName} onLogClick={handleLogFollowUp} />
            ))}
            {(!todaysFollowUps || todaysFollowUps.length === 0) && <p className="text-muted-foreground">No follow-ups scheduled for today. Great job!</p>}
          </CardContent>
        </Card>
        
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <CalendarCheck className="w-6 h-6" />
              Overdue Follow-Ups ({overdueFollowUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueFollowUps && overdueFollowUps.map(lead => (
              <FollowUpCard key={lead.id} lead={lead} getEmployeeName={getEmployeeName} onLogClick={handleLogFollowUp} isOverdue={true} />
            ))}
            {(!overdueFollowUps || overdueFollowUps.length === 0) && <p className="text-muted-foreground">No overdue tasks. Keep it up!</p>}
          </CardContent>
        </Card>
      </div>

      {selectedLead && (
        <LogFollowUpDialog 
          isOpen={isLogOpen}
          onClose={() => setIsLogOpen(false)}
          lead={selectedLead}
          onSubmit={onLogSubmit}
        />
      )}
    </div>
  );
}

const FollowUpCard = ({ lead, getEmployeeName, onLogClick, isOverdue }) => (
  <div className={`p-4 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-bold">{lead.student_name}</h4>
        <p className="text-sm text-muted-foreground">{lead.course_interest?.toUpperCase()}</p>
      </div>
      <Button size="sm" onClick={() => onLogClick(lead)}>Log Follow-Up</Button>
    </div>
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
      <div className="flex items-center gap-1">
        <UserCheck className="w-3 h-3"/>
        {getEmployeeName(lead.assigned_to)}
      </div>
      <div className="flex items-center gap-1">
        <PhoneCall className="w-3 h-3"/>
        {lead.phone}
      </div>
    </div>
  </div>
);
