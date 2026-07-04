// Global cascading scope picker for the app header: Sub-Company → Department.
// Only visible to SUPER_ADMIN, ADMIN, and MD users.
// Non-admins see a locked badge showing their own workspace.

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

export default function ScopeSelector({ className }) {
  const { companyId: scopeCompanyId, departmentId, setCompany, setDepartment } = useScope();
  const { user, canViewAllCompanies, companyName, departmentName } = useAuth();

  // ✅ Non-admins: always force their profile scope into localStorage on mount/user change
  useEffect(() => {
    if (!user || canViewAllCompanies) return;
    const profileCompanyId    = user.company_id    || user.companyId    || null;
    const profileDepartmentId = user.department_id || user.departmentId || null;
    if (profileCompanyId)    scopeSetCompany(profileCompanyId);
    if (profileDepartmentId) scopeSetDepartment(profileDepartmentId);
  }, [user, canViewAllCompanies]);

  // ─── Admins & MD: load companies from API ───────────────────────────────────
  const { data: companies = [] } = useQuery({
    queryKey: ['scope', 'companies'],
    queryFn: async () => {
      const res = await api.get('/companies');
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || d?.companies || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: canViewAllCompanies,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['scope', 'departments', scopeCompanyId],
    enabled: canViewAllCompanies && !!scopeCompanyId,
    queryFn: async () => {
      const res = await api.get('/departments', { params: { companyId: scopeCompanyId } });
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || d?.departments || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Non-admins/non-MD: show locked workspace badge ─────────────────────────
  if (!canViewAllCompanies) {
    // Build label from AuthContext fields (now populated by backend)
    const label = companyName
      ? `${companyName}${departmentName ? ' · ' + departmentName : ''}`
      : (departmentName || user?.displayName || 'Your workspace');

    return (
      <div className={className || "hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 max-w-[220px] truncate"}>
        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-medium">{label}</span>
      </div>
    );
  }

  // ─── Admins/MD: don't render if no companies returned (avoids layout gap) ────
  if (!companies.length) return null;

  return (
    <div className={className || "hidden md:flex items-center gap-1.5"}>
      <Select
        value={scopeCompanyId || ALL_COMPANIES}
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
        disabled={!scopeCompanyId}
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

