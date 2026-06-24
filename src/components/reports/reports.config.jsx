// Central registry of every report. Each entry exposes a `useReport(range)` hook
// that returns a normalized shape the hub can render AND export uniformly:
//   { isLoading, isError, refetch, softEmpty, softEmptyLabel,
//     stats:[{label,value,sub,icon}], columns:[{header,key,align,format,render}],
//     rows:[...], summary:[{label,value}], exportSheets?:[...] }
//
// `columns` drive BOTH the on-screen table and the PDF/Excel export.

import React, { useMemo } from 'react';
import {
  ShoppingCart, DollarSign, Package, RotateCcw, Wallet, Boxes,
  Factory, CalendarCheck, Trophy, ListChecks, TrendingDown, AlertTriangle,
} from 'lucide-react';
import {
  useReportData, get, asList, bdt, num, fmtDate, StatusBadge,
} from './reportShared';

const sum = (arr, fn) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
const countBy = (arr, fn) =>
  arr.reduce((acc, x) => {
    const k = fn(x) || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

// Helper: pull an order total across possible field names.
const orderTotal = (o) =>
  Number(o.totalAmount ?? o.total ?? o.grandTotal ?? o.amount ?? 0);
const orderStatus = (o) => o.orderStatus ?? o.status ?? '—';
const orderPayment = (o) => o.paymentStatus ?? o.paymentMethod ?? o.payment ?? '—';

// ============================================================ 1. SALES
function useSalesReport(range) {
  const q = useReportData(
    ['report', 'sales', range.from, range.to],
    () => get('/orders', { dateFrom: range.from, dateTo: range.to }),
  );
  return useMemo(() => {
    const rows = asList(q.data);
    const revenue = sum(rows, orderTotal);
    const byStatus = countBy(rows, orderStatus);
    const cod = rows.filter((o) => /cod|cash/i.test(String(orderPayment(o)))).length;
    const paid = rows.filter((o) => /paid/i.test(String(orderPayment(o)))).length;
    const delivered = byStatus.DELIVERED || byStatus.Delivered || 0;
    return {
      isLoading: q.isLoading, isError: q.isError, refetch: q.refetch,
      stats: [
        { label: 'Total Orders', value: num(rows.length), icon: ShoppingCart },
        { label: 'Revenue', value: bdt(revenue), icon: DollarSign },
        { label: 'COD vs Paid', value: `${cod} / ${paid}`, sub: 'cash / paid orders' },
        { label: 'Delivered', value: num(delivered), sub: `${rows.length ? Math.round((delivered / rows.length) * 100) : 0}% of orders` },
      ],
      columns: [
        { header: 'Order #', key: 'orderNumber', format: (v, r) => v ?? r.orderNo ?? r.id },
        { header: 'Date', key: 'createdAt', format: (v, r) => fmtDate(v ?? r.orderDate ?? r.date) },
        { header: 'Customer', key: 'customerName', format: (v, r) => v ?? r.customer?.name ?? r.customer ?? '—' },
        { header: 'Status', key: 'orderStatus', format: (v, r) => orderStatus(r), render: (v, r) => <StatusBadge value={orderStatus(r)} /> },
        { header: 'Payment', key: 'paymentStatus', format: (v, r) => orderPayment(r) },
        { header: 'Amount', key: 'totalAmount', align: 'right', format: (v, r) => bdt(orderTotal(r)) },
      ],
      rows,
      summary: [
        { label: 'Orders', value: num(rows.length) },
        { label: 'Revenue', value: bdt(revenue) },
        { label: 'COD', value: num(cod) },
        { label: 'Paid', value: num(paid) },
      ],
    };
  }, [q.data, q.isLoading, q.isError, q.refetch]);
}

// ============================================================ 2. INVENTORY
function useInventoryReport(range) {
  const q = useReportData(['report', 'inventory'], () => get('/inventory'));
  return useMemo(() => {
    const rows = asList(q.data);
    const qty = (i) => Number(i.quantity ?? i.stock ?? i.currentStock ?? 0);
    const cost = (i) => Number(i.costPrice ?? i.unitCost ?? i.price ?? 0);
    const reorder = (i) => Number(i.reorderLevel ?? i.lowStockThreshold ?? i.minStock ?? 10);
    const stockValue = sum(rows, (i) => qty(i) * cost(i));
    const lowStock = rows.filter((i) => qty(i) <= reorder(i));
    const outOfStock = rows.filter((i) => qty(i) <= 0);
    return {
      isLoading: q.isLoading, isError: q.isError, refetch: q.refetch,
      stats: [
        { label: 'SKUs', value: num(rows.length), icon: Boxes },
        { label: 'Stock Value', value: bdt(stockValue), icon: DollarSign },
        { label: 'Low Stock', value: num(lowStock.length), sub: 'at/below reorder', icon: AlertTriangle },
        { label: 'Out of Stock', value: num(outOfStock.length), icon: TrendingDown },
      ],
      columns: [
        { header: 'Product', key: 'name', format: (v, r) => v ?? r.productName ?? r.title ?? '—' },
        { header: 'SKU', key: 'sku', format: (v, r) => v ?? r.code ?? '—' },
        { header: 'Qty', key: 'quantity', align: 'right', format: (v, r) => num(qty(r)) },
        { header: 'Reorder Lvl', key: 'reorderLevel', align: 'right', format: (v, r) => num(reorder(r)) },
        { header: 'Unit Cost', key: 'costPrice', align: 'right', format: (v, r) => bdt(cost(r)) },
        { header: 'Stock Value', key: '_val', align: 'right', format: (v, r) => bdt(qty(r) * cost(r)) },
        {
          header: 'Status', key: '_status',
          format: (v, r) => (qty(r) <= 0 ? 'OUT' : qty(r) <= reorder(r) ? 'LOW' : 'OK'),
          render: (v, r) => <StatusBadge value={qty(r) <= 0 ? 'DAMAGED' : qty(r) <= reorder(r) ? 'PENDING' : 'COMPLETED'} />,
        },
      ],
      rows,
      summary: [
        { label: 'SKUs', value: num(rows.length) },
        { label: 'Stock Value', value: bdt(stockValue) },
        { label: 'Low Stock', value: num(lowStock.length) },
      ],
    };
  }, [q.data, q.isLoading, q.isError, q.refetch]);
}

// ============================================================ 3. RETURNS / DAMAGE
function useReturnsReport(range) {
  const q = useReportData(
    ['report', 'returns', range.from, range.to],
    () => get('/orders', { orderStatus: 'RETURNED', dateFrom: range.from, dateTo: range.to }),
  );
  return useMemo(() => {
    const rows = asList(q.data);
    const value = sum(rows, orderTotal);
    return {
      isLoading: q.isLoading, isError: q.isError, refetch: q.refetch,
      stats: [
        { label: 'Returned Orders', value: num(rows.length), icon: RotateCcw },
        { label: 'Return Value', value: bdt(value), icon: DollarSign },
        { label: 'Avg / Return', value: bdt(rows.length ? value / rows.length : 0) },
        { label: 'Period', value: range.label || 'All time' },
      ],
      columns: [
        { header: 'Order #', key: 'orderNumber', format: (v, r) => v ?? r.orderNo ?? r.id },
        { header: 'Date', key: 'createdAt', format: (v, r) => fmtDate(v ?? r.updatedAt ?? r.date) },
        { header: 'Customer', key: 'customerName', format: (v, r) => v ?? r.customer?.name ?? '—' },
        { header: 'Reason', key: 'returnReason', format: (v, r) => v ?? r.reason ?? r.notes ?? '—' },
        { header: 'Value', key: 'totalAmount', align: 'right', format: (v, r) => bdt(orderTotal(r)) },
      ],
      rows,
      summary: [
        { label: 'Returns', value: num(rows.length) },
        { label: 'Value', value: bdt(value) },
      ],
    };
  }, [q.data, q.isLoading, q.isError, q.refetch, range.label]);
}

// ============================================================ 4. FINANCIAL
function useFinancialReport(range) {
  const exp = useReportData(
    ['report', 'fin-exp', range.from, range.to],
    () => get('/expenses', { dateFrom: range.from, dateTo: range.to }),
  );
  const ord = useReportData(
    ['report', 'fin-ord', range.from, range.to],
    () => get('/orders', { dateFrom: range.from, dateTo: range.to }),
  );
  return useMemo(() => {
    const expenses = asList(exp.data);
    const orders = asList(ord.data);
    const expAmt = (e) => Number(e.amount ?? e.total ?? e.value ?? 0);
    const revenue = sum(orders, orderTotal);
    const totalExp = sum(expenses, expAmt);
    const net = revenue - totalExp;
    const byCat = expenses.reduce((acc, e) => {
      const k = e.category ?? e.type ?? e.categoryName ?? 'Uncategorized';
      acc[k] = (acc[k] || 0) + expAmt(e);
      return acc;
    }, {});
    // Detail rows = expense lines plus a leading revenue summary line.
    const rows = [
      { _label: 'Total Sales Revenue', category: 'Revenue', amount: revenue, _kind: 'in', date: range.label },
      ...expenses.map((e) => ({
        _label: e.title ?? e.description ?? e.name ?? 'Expense',
        category: e.category ?? e.type ?? 'Uncategorized',
        amount: expAmt(e),
        date: fmtDate(e.date ?? e.createdAt),
        _kind: 'out',
      })),
    ];
    return {
      isLoading: exp.isLoading || ord.isLoading,
      isError: exp.isError || ord.isError,
      refetch: () => { exp.refetch(); ord.refetch(); },
      stats: [
        { label: 'Revenue', value: bdt(revenue), icon: DollarSign },
        { label: 'Expenses', value: bdt(totalExp), icon: Wallet },
        { label: 'Net Profit', value: bdt(net), sub: net >= 0 ? 'profit' : 'loss', icon: net >= 0 ? TrendingDown : AlertTriangle },
        { label: 'Margin', value: `${revenue ? Math.round((net / revenue) * 100) : 0}%` },
      ],
      columns: [
        { header: 'Item', key: '_label' },
        { header: 'Category', key: 'category' },
        { header: 'Date', key: 'date', format: (v) => v ?? '—' },
        { header: 'Type', key: '_kind', format: (v) => (v === 'in' ? 'Income' : 'Expense') },
        { header: 'Amount', key: 'amount', align: 'right', format: (v) => bdt(v) },
      ],
      rows,
      summary: [
        { label: 'Revenue', value: bdt(revenue) },
        { label: 'Expenses', value: bdt(totalExp) },
        { label: 'Net', value: bdt(net) },
        ...Object.entries(byCat).slice(0, 4).map(([k, v]) => ({ label: k, value: bdt(v) })),
      ],
    };
  }, [exp.data, ord.data, exp.isLoading, ord.isLoading, exp.isError, ord.isError, range.label]);
}

// ============================================================ 5. WHOLESALE (defensive)
function useWholesaleReport(range) {
  const q = useReportData(
    ['report', 'wholesale', range.from, range.to],
    () => get('/wholesale', { dateFrom: range.from, dateTo: range.to }),
    { softFail: true },
  );
  const stats = useReportData(
    ['report', 'wholesale-stats'],
    () => get('/wholesale/stats'),
    { softFail: true },
  );
  return useMemo(() => {
    const rows = asList(q.data);
    const s = stats.data || {};
    const amt = (w) => Number(w.totalAmount ?? w.amount ?? w.total ?? 0);
    const paidF = (w) => Number(w.paidAmount ?? w.paid ?? 0);
    const dueF = (w) => Number(w.dueAmount ?? w.due ?? (amt(w) - paidF(w)));
    const total = s.totalAmount ?? sum(rows, amt);
    const paid = s.paidAmount ?? sum(rows, paidF);
    const due = s.dueAmount ?? sum(rows, dueF);
    const softEmpty = !q.isLoading && rows.length === 0 && q.data === null;
    return {
      isLoading: q.isLoading, isError: false, refetch: q.refetch,
      softEmpty, softEmptyLabel: 'Wholesale endpoint is not available yet.',
      stats: [
        { label: 'Total Amount', value: bdt(total), icon: DollarSign },
        { label: 'Paid', value: bdt(paid) },
        { label: 'Due', value: bdt(due), icon: AlertTriangle },
        { label: 'Transactions', value: num(rows.length) },
      ],
      columns: [
        { header: 'Buyer', key: 'buyerName', format: (v, r) => v ?? r.buyer?.name ?? r.libraryName ?? r.publication ?? '—' },
        { header: 'Date', key: 'createdAt', format: (v, r) => fmtDate(v ?? r.date) },
        { header: 'Items', key: 'itemCount', format: (v, r) => num(v ?? r.items?.length ?? 0) },
        { header: 'Total', key: 'totalAmount', align: 'right', format: (v, r) => bdt(amt(r)) },
        { header: 'Paid', key: 'paidAmount', align: 'right', format: (v, r) => bdt(paidF(r)) },
        { header: 'Due', key: 'dueAmount', align: 'right', format: (v, r) => bdt(dueF(r)) },
      ],
      rows,
      summary: [
        { label: 'Total', value: bdt(total) },
        { label: 'Paid', value: bdt(paid) },
        { label: 'Due', value: bdt(due) },
      ],
    };
  }, [q.data, stats.data, q.isLoading, q.refetch, range.from, range.to]);
}

// ============================================================ 6. PRODUCTION (defensive)
function useProductionReport(range) {
  const q = useReportData(
    ['report', 'production', range.from, range.to],
    () => get('/production-projects/stats', { dateFrom: range.from, dateTo: range.to }),
    { softFail: true },
  );
  return useMemo(() => {
    const data = q.data;
    const softEmpty = !q.isLoading && data === null;
    // stats endpoint may return aggregates and/or a projects array.
    const projects = asList(data?.projects ?? data);
    const byStatus = data?.byStatus ?? countBy(projects, (p) => p.status);
    const byType = data?.byType ?? countBy(projects, (p) => p.type);
    const total = data?.total ?? projects.length;
    const completed = byStatus?.COMPLETED ?? byStatus?.Completed ?? 0;
    const rows = projects.length
      ? projects
      : Object.entries(byStatus || {}).map(([k, v]) => ({ name: k, status: k, count: v, type: '—', assignee: '—' }));
    return {
      isLoading: q.isLoading, isError: false, refetch: q.refetch,
      softEmpty, softEmptyLabel: 'Production endpoint is not available yet.',
      stats: [
        { label: 'Projects', value: num(total), icon: Factory },
        { label: 'Completed', value: num(completed) },
        { label: 'Statuses', value: num(Object.keys(byStatus || {}).length) },
        { label: 'Types', value: num(Object.keys(byType || {}).length) },
      ],
      columns: [
        { header: 'Project', key: 'name', format: (v, r) => v ?? r.title ?? r.status ?? '—' },
        { header: 'Type', key: 'type', format: (v) => v ?? '—' },
        { header: 'Status', key: 'status', render: (v) => <StatusBadge value={v} /> },
        { header: 'Assignee', key: 'assignee', format: (v, r) => v ?? r.assignedTo?.name ?? r.assignedTo ?? '—' },
        { header: 'Count', key: 'count', align: 'right', format: (v) => (v == null ? '—' : num(v)) },
      ],
      rows,
      summary: [
        { label: 'Projects', value: num(total) },
        { label: 'Completed', value: num(completed) },
      ],
    };
  }, [q.data, q.isLoading, q.refetch]);
}

// ============================================================ 7. ATTENDANCE
function useAttendanceReport(range) {
  const q = useReportData(
    ['report', 'attendance', range.from, range.to],
    () => get('/attendance', { dateFrom: range.from, dateTo: range.to }),
  );
  return useMemo(() => {
    const rows = asList(q.data);
    const st = (r) => String(r.status ?? '').toUpperCase();
    const present = rows.filter((r) => st(r) === 'PRESENT').length;
    const absent = rows.filter((r) => st(r) === 'ABSENT').length;
    const late = rows.filter((r) => st(r) === 'LATE').length;
    return {
      isLoading: q.isLoading, isError: q.isError, refetch: q.refetch,
      stats: [
        { label: 'Records', value: num(rows.length), icon: CalendarCheck },
        { label: 'Present', value: num(present) },
        { label: 'Absent', value: num(absent) },
        { label: 'Late', value: num(late) },
      ],
      columns: [
        { header: 'Employee', key: 'employeeName', format: (v, r) => v ?? r.employee?.name ?? r.user?.name ?? '—' },
        { header: 'Date', key: 'date', format: (v, r) => fmtDate(v ?? r.createdAt) },
        { header: 'Check In', key: 'checkIn', format: (v) => v ?? '—' },
        { header: 'Check Out', key: 'checkOut', format: (v) => v ?? '—' },
        { header: 'Status', key: 'status', render: (v) => <StatusBadge value={v} /> },
      ],
      rows,
      summary: [
        { label: 'Present', value: num(present) },
        { label: 'Absent', value: num(absent) },
        { label: 'Late', value: num(late) },
      ],
    };
  }, [q.data, q.isLoading, q.isError, q.refetch]);
}

// ============================================================ 8. KPI
function useKpiReport() {
  const q = useReportData(['report', 'kpi'], () => get('/kpis/dashboard'), { softFail: true });
  return useMemo(() => {
    const data = q.data;
    const softEmpty = !q.isLoading && data === null;
    const rows = asList(data?.employees ?? data?.scores ?? data);
    const avg = rows.length ? sum(rows, (e) => e.score ?? e.kpiScore ?? 0) / rows.length : 0;
    const top = rows.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    return {
      isLoading: q.isLoading, isError: false, refetch: q.refetch,
      softEmpty, softEmptyLabel: 'KPI dashboard data is not available yet.',
      stats: [
        { label: 'Employees', value: num(rows.length), icon: Trophy },
        { label: 'Avg Score', value: avg.toFixed(1) },
        { label: 'Top Performer', value: top?.name ?? top?.employeeName ?? '—' },
        { label: 'Top Score', value: (top?.score ?? top?.kpiScore ?? 0).toFixed?.(1) ?? '—' },
      ],
      columns: [
        { header: 'Employee', key: 'name', format: (v, r) => v ?? r.employeeName ?? r.employee?.name ?? '—' },
        { header: 'Department', key: 'department', format: (v, r) => v ?? r.dept ?? '—' },
        { header: 'Score', key: 'score', align: 'right', format: (v, r) => (v ?? r.kpiScore ?? 0) },
        { header: 'Tasks Done', key: 'tasksCompleted', align: 'right', format: (v) => (v == null ? '—' : num(v)) },
        { header: 'Rating', key: 'rating', format: (v) => v ?? '—' },
      ],
      rows,
      summary: [
        { label: 'Employees', value: num(rows.length) },
        { label: 'Avg Score', value: avg.toFixed(1) },
      ],
    };
  }, [q.data, q.isLoading, q.refetch]);
}

// ============================================================ 9. TASKS
function useTaskReport() {
  const q = useReportData(['report', 'tasks'], () => get('/tasks/stats'), { softFail: true });
  return useMemo(() => {
    const data = q.data;
    const softEmpty = !q.isLoading && data === null;
    const rows = asList(data?.byEmployee ?? data?.employees ?? data);
    const totalDone = sum(rows, (e) => e.completed ?? e.done ?? 0);
    const totalAll = sum(rows, (e) => e.total ?? e.assigned ?? 0);
    return {
      isLoading: q.isLoading, isError: false, refetch: q.refetch,
      softEmpty, softEmptyLabel: 'Task statistics are not available yet.',
      stats: [
        { label: 'Employees', value: num(rows.length), icon: ListChecks },
        { label: 'Completed', value: num(totalDone) },
        { label: 'Assigned', value: num(totalAll) },
        { label: 'Completion', value: `${totalAll ? Math.round((totalDone / totalAll) * 100) : 0}%` },
      ],
      columns: [
        { header: 'Employee', key: 'name', format: (v, r) => v ?? r.employeeName ?? r.employee?.name ?? '—' },
        { header: 'Assigned', key: 'total', align: 'right', format: (v, r) => num(v ?? r.assigned ?? 0) },
        { header: 'Completed', key: 'completed', align: 'right', format: (v, r) => num(v ?? r.done ?? 0) },
        { header: 'Pending', key: 'pending', align: 'right', format: (v, r) => num(v ?? ((r.total ?? r.assigned ?? 0) - (r.completed ?? r.done ?? 0))) },
        {
          header: 'Rate', key: '_rate', align: 'right',
          format: (v, r) => {
            const t = r.total ?? r.assigned ?? 0;
            const d = r.completed ?? r.done ?? 0;
            return `${t ? Math.round((d / t) * 100) : 0}%`;
          },
        },
      ],
      rows,
      summary: [
        { label: 'Completed', value: num(totalDone) },
        { label: 'Assigned', value: num(totalAll) },
      ],
    };
  }, [q.data, q.isLoading, q.refetch]);
}

// ---- Registry ----
export const REPORTS = [
  { id: 'sales', label: 'Sales', icon: ShoppingCart, useReport: useSalesReport, endpoints: 'GET /orders?dateFrom&dateTo' },
  { id: 'inventory', label: 'Inventory', icon: Package, useReport: useInventoryReport, endpoints: 'GET /inventory' },
  { id: 'returns', label: 'Returns / Damage', icon: RotateCcw, useReport: useReturnsReport, endpoints: 'GET /orders?orderStatus=RETURNED&dateFrom&dateTo' },
  { id: 'financial', label: 'Financial', icon: Wallet, useReport: useFinancialReport, endpoints: 'GET /expenses?dateFrom&dateTo + GET /orders' },
  { id: 'wholesale', label: 'Wholesale', icon: Boxes, useReport: useWholesaleReport, endpoints: 'GET /wholesale?dateFrom&dateTo + GET /wholesale/stats' },
  { id: 'production', label: 'Production', icon: Factory, useReport: useProductionReport, endpoints: 'GET /production-projects/stats?dateFrom&dateTo' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, useReport: useAttendanceReport, endpoints: 'GET /attendance?dateFrom&dateTo' },
  { id: 'kpi', label: 'KPI', icon: Trophy, useReport: useKpiReport, endpoints: 'GET /kpis/dashboard' },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, useReport: useTaskReport, endpoints: 'GET /tasks/stats' },
];
