import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Phone, MessageCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'new', title: 'New', color: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', title: 'Qualified', color: 'bg-purple-500' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-orange-500' },
  { id: 'converted', title: 'Converted', color: 'bg-green-500' },
];

export default function KanbanBoard({ leads, onStatusChange, onLeadClick }) {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const newColumns = {};
    COLUMNS.forEach(col => {
      newColumns[col.id] = leads.filter(l => l.lead_status === col.id).sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));
    });
    setColumns(newColumns);
  }, [leads]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = [...columns[source.droppableId]];
    const destColumn = [...columns[destination.droppableId]];
    const [movedLead] = sourceColumn.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceColumn.splice(destination.index, 0, movedLead);
      setColumns({
        ...columns,
        [source.droppableId]: sourceColumn
      });
    } else {
      movedLead.lead_status = destination.droppableId;
      destColumn.splice(destination.index, 0, movedLead);
      setColumns({
        ...columns,
        [source.droppableId]: sourceColumn,
        [destination.droppableId]: destColumn
      });
      onStatusChange(movedLead, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
        {COLUMNS.map(col => (
          <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col flex-shrink-0">
            <div className={`py-3 px-4 ${col.color} rounded-t-xl shadow-sm border-b border-white/20`}>
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">{col.title}</h3>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">{columns[col.id]?.length || 0}</Badge>
              </div>
            </div>
            
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-b-xl p-3 overflow-y-auto transition-colors ${
                    snapshot.isDraggingOver ? 'bg-slate-200 dark:bg-slate-800' : ''
                  }`}
                >
                  {columns[col.id]?.map((lead, index) => (
                    <Draggable key={lead.id} draggableId={lead.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onLeadClick(lead)}
                          className={`mb-3 bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:shadow-md hover:border-amber-400 ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-amber-400 scale-105 opacity-90' : ''
                          }`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-2">{lead.student_name}</h4>
                            {lead.lead_score && (
                              <Badge variant="outline" className={`shrink-0 ${lead.lead_score >= 80 ? 'text-amber-500 border-amber-200 bg-amber-50' : 'text-slate-500'}`}>
                                <Star className="w-3 h-3 mr-1" fill={lead.lead_score >= 80 ? "currentColor" : "none"} />
                                {lead.lead_score}%
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                            <Phone className="w-3 h-3" />
                            <span>{lead.phone}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{lead.lead_source}</Badge>
                            {lead.assigned_to && (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                {lead.assigned_to.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
