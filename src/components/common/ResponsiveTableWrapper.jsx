import React from 'react';

/**
 * Wraps a table to enable proper horizontal scrolling on mobile.
 * Use this instead of raw <div className="overflow-x-auto"> around tables.
 * It applies negative margins to break out of page padding on mobile,
 * ensuring the table can scroll the full viewport width.
 */
export default function ResponsiveTableWrapper({ children, className = '' }) {
  return (
    <div className={`-mx-3 sm:-mx-0 ${className}`}>
      <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  );
}