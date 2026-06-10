import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Infinite horizontal marquee. Duplicates children for a seamless loop.
 */
export default function Marquee({ items = [], speed = 28, className = '' }) {
  const reduce = useReducedMotion();
  const loop = [...items, ...items];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />

      <motion.div
        className="flex w-max items-center gap-12"
        animate={reduce ? {} : { x: ['0%', '-50%'] }}
        transition={
          reduce
            ? {}
            : { duration: speed, repeat: Infinity, ease: 'linear' }
        }
      >
        {loop.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-400"
          >
            {item.icon ? <item.icon className="h-5 w-5 text-amber-500" /> : null}
            {item.label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
