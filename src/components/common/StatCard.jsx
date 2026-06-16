import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const TONES = {
  orange:  { tile: 'bg-gradient-to-br from-amber-400 to-orange-600',  ring: 'hover:border-orange-300' },
  green:   { tile: 'bg-gradient-to-br from-emerald-400 to-emerald-600', ring: 'hover:border-emerald-300' },
  blue:    { tile: 'bg-gradient-to-br from-sky-400 to-blue-600',     ring: 'hover:border-sky-300' },
  red:     { tile: 'bg-gradient-to-br from-rose-400 to-rose-600',    ring: 'hover:border-rose-300' },
  violet:  { tile: 'bg-gradient-to-br from-violet-400 to-violet-600', ring: 'hover:border-violet-300' },
  slate:   { tile: 'bg-gradient-to-br from-slate-400 to-slate-600',  ring: 'hover:border-slate-300' },
};

/**
 * Zypra design system — unified KPI/stat card.
 * White card, visible border, colored gradient icon tile, subtle hover lift.
 *
 * <StatCard icon={DollarSign} label="Today's Revenue" value="৳12,790"
 *   sub="9 orders today" tone="green" to="/Sales" index={0} />
 */
export default function StatCard({ icon: Icon, label, value, sub, tone = 'orange', to, index = 0, loading }) {
  const reduce = useReducedMotion();
  const t = TONES[tone] || TONES.orange;
  // Treat null/undefined value as "loading" so we never flash a 0 before data.
  const isLoading = loading || value === undefined || value === null || value === '';

  const card = (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.06, 0.4) }}
      whileHover={reduce ? undefined : { y: -3 }}
      className={`group rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:p-5 shadow-sm hover:shadow-md transition-all ${t.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</p>
          {isLoading ? (
            <div className="mt-2 h-7 md:h-8 w-24 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
          )}
          {isLoading ? (
            sub !== undefined && <div className="mt-2 h-3 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 shrink-0 rounded-xl ${t.tile} flex items-center justify-center shadow-md transition-transform group-hover:scale-110`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </motion.div>
  );

  return to ? <Link to={to} className="block">{card}</Link> : card;
}
