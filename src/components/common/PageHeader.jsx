import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Zypra design system — unified animated page header.
 * Use on EVERY page so the whole app feels like one product.
 *
 * <PageHeader icon={ShoppingCart} title="Sales Management"
 *   subtitle="Track and manage all your sales orders" actions={<Button…/>} />
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, breadcrumb }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 via-amber-50 to-white dark:from-orange-950/40 dark:via-slate-900 dark:to-slate-900 p-5 md:p-6"
    >
      {/* animated accent line */}
      <motion.div
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        className="absolute left-0 top-0 h-1 w-full origin-left bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600"
      />
      {breadcrumb && <div className="mb-2 text-xs text-slate-500">{breadcrumb}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <motion.div
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
            >
              <Icon className="w-6 h-6 text-white" />
            </motion.div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.div>
  );
}
