import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Phone, Flame } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { scoreLead, scoreTier } from './leadScore';

const COLUMNS = [
  { id: 'NEW', title: 'New', dot: 'bg-sky-500', head: 'from-sky-500 to-blue-600' },
  { id: 'CONTACTED', title: 'Contacted', dot: 'bg-amber-500', head: 'from-amber-500 to-orange-500' },
  { id: 'QUALIFIED', title: 'Qualified', dot: 'bg-violet-500', head: 'from-violet-500 to-purple-600' },
  { id: 'FOLLOW_UP', title: 'Follow Up', dot: 'bg-cyan-500', head: 'from-cyan-500 to-teal-600' },
  { id: 'INTERESTED', title: 'Interested', dot: 'bg-orange-500', head: 'from-orange-500 to-orange-600' },
  { id: 'CONVERTED', title: 'Converted', dot: 'bg-emerald-500', head: 'from-emerald-500 to-green-600' },
  { id: 'LOST', title: 'Lost', dot: 'bg-rose-500', head: 'from-rose-500 to-red-600' },
];

const PRIORITY_DOT = {
  URGENT: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-slate-300',
};

function LeadCard({ lead, index, onLeadClick }) {
  const score = scoreLead(lead);
  const tier = scoreTier(score);
  const days = lead.created_date
    ? differenceInDays(new Date(), new Date(lead.created_date))
    : null;

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onLeadClick?.(lead)}
          className={`mb-2 rounded-xl border bg-white dark:bg-slate-900 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 ${
            snapshot.isDragging
              ? 'rotate-1 shadow-xl ring-2 ring-amber-400 border-amber-300'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {lead.student_name || 'Unnamed lead'}
            </p>
            <span
              className={`w-2.5 h-2.5 mt-1 shrink-0 rounded-full ${PRIORITY_DOT[lead.priority] || 'bg-slate-300'}`}
              title={`Priority: ${lead.priority || 'N/A'}`}
            />
          </div>
          {lead.phone && (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Phone className="w-3 h-3" />
              {lead.phone}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              ৳{(Number(lead.value) || 0).toLocaleString()}
            </span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${tier.badge}`}>
              {score >= 70 && <Flame className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
              {score} · {tier.label}
            </span>
          </div>
          {days !== null && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              {days === 0 ? 'Today' : `${days}d ago`}
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ leads, onStatusChange, onLeadClick }) {
  const [dragging, setDragging] = useState(false);

  const columns = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    leads.forEach((l) => {
      const status = (l.lead_status || 'NEW').toUpperCase();
      if (map[status]) map[status].push(l);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => scoreLead(b) - scoreLead(a))
    );
    return map;
  }, [leads]);

  const onDragEnd = (result) => {
    setDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const lead = leads.find((l) => String(l.id) === draggableId);
    if (!lead) return;
    onStatusChange(lead, destination.droppableId);
  };

  return (
    <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMNS.map((col, ci) => {
          const items = columns[col.id] || [];
          const colValue = items.reduce((s, l) => s + (Number(l.value) || 0), 0);
          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: ci * 0.05 }}
              className="min-w-[260px] w-[260px] shrink-0 flex flex-col"
            >
              <div className={`rounded-t-xl bg-gradient-to-r ${col.head} px-3 py-2.5 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/80" />
                  <span className="text-sm font-bold text-white">{col.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white/80">
                    ৳{(colValue / 1000).toFixed(0)}K
                  </span>
                  <Badge className="bg-white/25 text-white border-0 text-[10px] px-1.5">
                    {items.length}
                  </Badge>
                </div>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] max-h-[calc(100vh-340px)] overflow-y-auto rounded-b-xl border border-t-0 p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 ring-2 ring-amber-300/60'
                        : dragging
                          ? 'bg-slate-50/80 dark:bg-slate-800/40 border-dashed border-slate-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {items.map((lead, i) => (
                      <LeadCard key={lead.id} lead={lead} index={i} onLeadClick={onLeadClick} />
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-center text-xs text-slate-400 py-6">Drop leads here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </motion.div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
