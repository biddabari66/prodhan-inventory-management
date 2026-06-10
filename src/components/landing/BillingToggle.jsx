import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animated monthly / yearly billing toggle with a sliding pill.
 */
export default function BillingToggle({ yearly, onChange }) {
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <span
        className={`text-sm font-semibold transition ${
          yearly ? 'text-slate-400' : 'text-slate-900'
        }`}
      >
        Monthly
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={yearly}
        onClick={() => onChange(!yearly)}
        className="relative inline-flex h-8 w-16 items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-1 shadow-inner"
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="block h-6 w-6 rounded-full bg-white shadow-md"
          style={{ marginLeft: yearly ? 'auto' : 0 }}
        />
      </button>

      <span
        className={`text-sm font-semibold transition ${
          yearly ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        Yearly
      </span>

      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
        Save 20%
      </span>
    </div>
  );
}
