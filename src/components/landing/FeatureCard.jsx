import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Interactive feature card with pointer-tracked tilt, spotlight glow,
 * hover lift and icon micro-animation.
 */
export default function FeatureCard({ icon: Icon, title, desc, delay = 0 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [style, setStyle] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });

  const onMove = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setStyle({
      ry: (px - 0.5) * 10,
      rx: (0.5 - py) * 10,
      mx: px * 100,
      my: py * 100,
    });
  };

  const onLeave = () => setStyle({ rx: 0, ry: 0, mx: 50, my: 50 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="h-full [perspective:1000px]"
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${style.rx}deg) rotateY(${style.ry}deg)`,
          transition: 'transform 0.2s ease-out',
        }}
        className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-100/70"
      >
        {/* spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at ${style.mx}% ${style.my}%, rgba(245,158,11,0.14), transparent 60%)`,
          }}
        />
        <div className="relative">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Icon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
          <span className="mt-4 inline-flex h-1 w-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300 group-hover:w-12" />
        </div>
      </div>
    </motion.div>
  );
}
