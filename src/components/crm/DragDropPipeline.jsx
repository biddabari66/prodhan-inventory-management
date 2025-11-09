import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Mail, User, Calendar, Target, Star, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from '@/components/ui/select';

const LEAD_STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  { id: 'contacted', title: 'Contacted', color: 'bg-cyan-500', bgColor: 'bg-cyan-50' },
  { id: 'qualified', title: 'Qualified', color: 'bg-teal-500', bgColor: 'bg-teal-50' },
  { id: 'proposal_sent', title: 'Proposal Sent', color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-purple-500', bgColor: 'bg-purple-50' },
  { id: 'converted', title: 'Converted', color: 'bg-green-500', bgColor: 'bg-green-50' }
];

const LeadCard = ({ lead, getEmployeeName, getStatusColor, getLeadScoreColor, onLeadClick, onStatusChange }) => {
  const handleStatusChange = (newStatus) => {
    onStatusChange(lead.id, newStatus);
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const followUpCount = lead.call_history?.length || 0;
  const needsFollowUp = followUpCount < 5;

  return (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-all duration-300 bg-white border border-gray-200 hover:border-violet-300 hover:scale-[1.01] group">
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors text-sm">
            {lead.student_name}
          </h4>
          <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getScoreColor(lead.lead_score || 0)}`}>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {lead.lead_score || 0}
            </div>
          </div>
        </div>
        
        {needsFollowUp && (
          <div className="bg-amber-50 text-orange-600 mb-2 p-2 text-xs flex items-center gap-2 rounded-md">
            <AlertTriangle className="w-3 h-3" />
            <span>Needs follow-up ({followUpCount}/5)</span>
          </div>
        )}

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Target className="w-3 h-3" />
            <span className="uppercase font-medium">{lead.course_interest}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3 h-3" />
            <span>{lead.phone}</span>
          </div>
          
          {lead.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail className="w-3 h-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{getEmployeeName(lead.assigned_to)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{new Date(lead.created_date).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <Select value={lead.lead_status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full text-xs h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={() => onLeadClick(lead)}
          variant="ghost"
          size="sm"
          className="w-full text-xs hover:bg-violet-50 hover:text-violet-600 transition-colors"
        >
          View Details
        </Button>
      </div>
    </Card>
  );
};

const PipelineColumn = ({ stage, leads, children }) => {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  return (
    <div className={`${stage.bgColor} rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors flex flex-col h-full min-w-[280px] w-[280px]`}>
      <div className="p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{stage.title}</h3>
              <p className="text-xs text-gray-600">{leads.length} leads</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 border">
              {leads.length}
            </span>
            {totalValue > 0 && (
              <p className="text-xs text-gray-600 mt-1">৳{totalValue.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-3 pb-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function DragDropPipeline({ leadsByStatus, onLeadUpdate, onEditLead, users, getEmployeeName, getStatusColor, getLeadScoreColor, onStatusChange }) {
  const [draggedLead, setDraggedLead] = useState(null);
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedLead && draggedLead.lead_status !== newStatus) {
      if (onStatusChange) {
        onStatusChange(draggedLead.id, newStatus);
      } else if (onLeadUpdate) {
        onLeadUpdate();
      }
    }
    setDraggedLead(null);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -320,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 320,
        behavior: 'smooth'
      });
    }
  };

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      // Initial check
      setTimeout(updateScrollButtons, 100);
      
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, []);

  const safeGetEmployeeName = (userId) => {
    if (!Array.isArray(users) || !userId) return 'Unassigned';
    const user = users.find(u => u && u.id === userId);
    return user ? user.full_name : 'Unassigned';
  };

  const leads = leadsByStatus || {};

  return (
    <div className="relative w-full h-full">
      {/* Left Navigation Arrow */}
      {showLeftArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-gray-300 hover:bg-white shadow-xl h-10 w-10 rounded-full"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Right Navigation Arrow */}
      {showRightArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm border-gray-300 hover:bg-white shadow-xl h-10 w-10 rounded-full"
          onClick={scrollRight}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Horizontal Scrolling Container */}
      <div 
        ref={scrollContainerRef}
        className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        <div 
          className="flex gap-4 p-4 h-full"
          style={{ 
            width: `${LEAD_STAGES.length * 300}px`,
            minHeight: '600px'
          }}
        >
          {LEAD_STAGES.map((stage) => {
            const stageLeads = Array.isArray(leads[stage.id]) ? leads[stage.id] : [];

            return (
              <div
                key={stage.id}
                className="flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <PipelineColumn stage={stage} leads={stageLeads}>
                  {stageLeads.length > 0 ? stageLeads.map((lead) => {
                    if (!lead || !lead.id) return null;
                    
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        className="transition-opacity duration-200 hover:opacity-75"
                      >
                        <LeadCard 
                          lead={lead} 
                          getEmployeeName={safeGetEmployeeName}
                          getStatusColor={getStatusColor}
                          getLeadScoreColor={getLeadScoreColor}
                          onLeadClick={onEditLead}
                          onStatusChange={onStatusChange || (() => {})}
                        />
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg flex flex-col justify-center items-center">
                      <p className="text-sm">No leads in this stage</p>
                      <p className="text-xs mt-1">Drag leads here</p>
                    </div>
                  )}
                </PipelineColumn>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 8px;
        }
        
        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}