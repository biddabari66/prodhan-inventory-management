// Global cascading scope picker for the app header: Sub-Company → Department.
// The selection is persisted via src/lib/scope.js and auto-applied to all data
// requests by the axios request interceptor (src/api/client.js).

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Network, Lock } from 'lucide-react';
import api from '@/api/client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useScope, setCompany as scopeSetCompany, setDepartment as scopeSetDepartment } from '@/lib/scope';
import { useAuth } from '@/lib/AuthContext';

const ALL_COMPANIES  = '__all_companies__';
const ALL_DEPARTMENTS = '__all_departments__';

const TRIGGER_CLASS =
  'h-8 w-[160px] text-xs border-amber-300 dark:border-amber-700/60 ' +
  'bg-amber-50/60 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300 ' +
  'focus:ring-amber-500';

export default function ScopeSelector() {
  const { companyId, departmentId, setCompany, setDepartment } = useScope();
  const { user } = useAuth();

  const isAdmin =
    user?.role === 'admin' ||
    ['admin', 'super_admin'].includes(String(user?.job_role || '').toLowerCase());

  // ✅ FIX: Ensure non-admin users always have their profile scope set in localStorage.
  // This fires once when the component mounts and whenever the user object changes.
  useEffect(() => {
    if (!user || isAdmin) return;

    const profileCompanyId    = user.company_id    || user.companyId    || null;
    const profileDepartmentId = user.department_id || user.departmentId || null;

    if (profileCompanyId)    scopeSetCompany(profileCompanyId);
    if (profileDepartmentId) scopeSetDepartment(profileDepartmentId);
  }, [user, isAdmin]);

  // ─── Admins: load companies from API ────────────────────────────────────────
  const { data: companies = [] } = useQuery({
    queryKey: ['scope', 'companies'],
    queryFn: async () => {
      const res = await api.get('/companies');
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || d?.companies || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['scope', 'departments', companyId],
    enabled: isAdmin && !!companyId,
    queryFn: async () => {
      const res = await api.get('/departments', { params: { companyId } });
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || d?.departments || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Non-admins: show locked workspace badge ─────────────────────────────────
  if (!isAdmin) {
    const deptName    = user?.department?.name || user?.department_name || user?.department || null;
    const companyName = user?.company?.name    || user?.company_name    || user?.company    || null;
    const label = companyName
      ? `${companyName}${deptName ? ' · ' + deptName : ''}`
      : (deptName || 'Your workspace');

    return (
      <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 max-w-[220px] truncate">
        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-medium">{label}</span>
      </div>
    );
  }

  // ─── Admins: don't render if no companies returned (avoids layout gap) ───────
  if (!companies.length) return null;

  return (
    <div className="hidden md:flex items-center gap-1.5">
      <Select
        value={companyId || ALL_COMPANIES}
        onValueChange={(v) => setCompany(v === ALL_COMPANIES ? null : v)}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Sub-Company">
          <Building2 className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600" />
          <SelectValue placeholder="Sub-Company" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          <SelectItem value={ALL_COMPANIES}>All sub-companies</SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={departmentId || ALL_DEPARTMENTS}
        onValueChange={(v) => setDepartment(v === ALL_DEPARTMENTS ? null : v)}
        disabled={!companyId}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Department">
          <Network className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600" />
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
