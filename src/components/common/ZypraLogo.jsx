import React from 'react';

/**
 * Zypra brand mark — clean geometric "Z" on a rounded square,
 * professional flat design (no clip-art feel).
 *
 * <ZypraLogo size={40} />            — mark only
 * <ZypraLogo size={40} withWordmark /> — mark + ZYPRA wordmark
 */
export function ZypraMark({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Zypra">
      <defs>
        <linearGradient id="zy-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#zy-g)" />
      {/* Geometric Z with notched diagonal */}
      <path
        d="M13 14 H35 V19.5 L22.5 28.5 H35 V34 H13 V28.5 L25.5 19.5 H13 Z"
        fill="white"
      />
      {/* subtle highlight */}
      <rect x="2" y="2" width="44" height="22" rx="10" fill="white" opacity="0.08" />
    </svg>
  );
}

export default function ZypraLogo({ size = 40, withWordmark = false, light = false, className = '' }) {
  if (!withWordmark) return <ZypraMark size={size} className={className} />;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <ZypraMark size={size} />
      <div className="leading-none">
        <span
          className={`block font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}
          style={{ fontSize: size * 0.5, letterSpacing: '-0.03em' }}
        >
          ZYPRA
        </span>
        <span
          className={`block font-semibold uppercase ${light ? 'text-white/70' : 'text-orange-600'}`}
          style={{ fontSize: size * 0.22, letterSpacing: '0.28em', marginTop: 2 }}
        >
          ERP Suite
        </span>
      </div>
    </div>
  );
}
