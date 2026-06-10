import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wallet, Boxes, Fingerprint, TrendingUp } from 'lucide-react';

const cards = [
  { label: 'Monthly Revenue', value: '৳ 12,84,500', icon: Wallet, tint: 'from-emerald-400 to-green-500', up: '+18%' },
  { label: 'Items in Stock', value: '8,412', icon: Boxes, tint: 'from-amber-400 to-orange-500', up: '+4%' },
  { label: 'Present Today', value: '142 / 150', icon: Fingerprint, tint: 'from-sky-400 to-indigo-500', up: '95%' },
];

const bars = [40, 65, 50, 80, 60, 92, 70, 100, 78, 88, 72, 96];

/**
 * Animated dashboard / product mock for the hero. Floating chips, animated
 * bar chart, glassy frame.
 */
export default function ProductMock() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-amber-400/30 via-orange-400/20 to-rose-400/20 blur-2xl" />

      {/* floating chips */}
      {!reduce && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}
            className="absolute -left-4 top-16 z-20 hidden rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg sm:flex sm:items-center sm:gap-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            AI forecast ready
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, 12, 0] }}
            transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 0.6 } }}
            className="absolute -right-3 bottom-24 z-20 hidden rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg sm:flex sm:items-center sm:gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            bKash payout sent
          </motion.div>
        </>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-2xl shadow-amber-200/40 backdrop-blur">
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 sm:p-8">
          {/* fake window chrome */}
          <div className="mb-5 flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs font-medium text-slate-400">Zypra ERP · Live Dashboard</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{c.label}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${c.tint} text-white`}>
                    <c.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">{c.up} this month</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 4 }}
                whileInView={{ height: `${h}px` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 rounded-t-md bg-gradient-to-t from-amber-300 to-orange-500"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
