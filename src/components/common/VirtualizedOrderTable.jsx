import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * PRODUCTION: Virtualized table for handling 1000+ orders efficiently
 * Only renders visible rows for instant scrolling
 */
export default function VirtualizedOrderTable({ 
  orders = [], 
  renderRow,
  headers = [],
  containerHeight = 600,
  rowHeight = 72
}) {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleStart = Math.floor(scrollTop / rowHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / rowHeight);
  const overscan = 5;

  const visibleOrders = useMemo(() => {
    return orders.slice(
      Math.max(0, visibleStart - overscan),
      Math.min(orders.length, visibleEnd + overscan)
    );
  }, [orders, visibleStart, visibleEnd, overscan]);

  const totalHeight = orders.length * rowHeight;
  const offsetY = Math.max(0, visibleStart - overscan) * rowHeight;

  return (
    <div 
      className="overflow-auto relative border rounded-lg"
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow>
            {headers.map((header, idx) => (
              <TableHead key={idx} className={header.className}>
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: totalHeight }}>
            <td style={{ padding: 0, border: 'none' }} />
          </tr>
          <tr style={{ transform: `translateY(${offsetY}px)` }}>
            <td colSpan={headers.length} style={{ padding: 0, border: 'none' }}>
              <Table>
                <TableBody>
                  {visibleOrders.map((order, idx) => renderRow(order, idx))}
                </TableBody>
              </Table>
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  );
}