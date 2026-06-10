import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Animated amber/orange aurora + gradient mesh background with a subtle
 * honeycomb (hive) motif. Purely decorative, pointer-events-none.
 */
export default function AuroraBackground({ className = '' }) {
  const reduce = useReducedMotion();

  const float = (delay) =>
    reduce
      ? {}
      : {
          animate: {
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
            scale: [1, 1.12, 0.96, 1],
          },
          transition: {
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
            delay,
          },
        };

  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      {/* honeycomb pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
        <defs>
          <pattern id="hive" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">
            <path
              d="M28 0 L56 16 L56 50 L28 66 L0 50 L0 16 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hive)" />
      </svg>

      {/* aurora blobs */}
      <motion.div
        {...float(0)}
        className="absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-amber-300 via-orange-200 to-rose-200 blur-3xl opacity-70"
      />
      <motion.div
        {...float(4)}
        className="absolute right-[-6rem] top-32 h-80 w-80 rounded-full bg-gradient-to-br from-orange-300 to-amber-200 blur-3xl opacity-60"
      />
      <motion.div
        {...float(8)}
        className="absolute left-[-4rem] bottom-0 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200 to-yellow-100 blur-3xl opacity-60"
      />
    </div>
  );
}
