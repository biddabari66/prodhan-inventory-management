import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, Globe } from 'lucide-react';

export default function DepartmentSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select department...",
  className = "",
  required = false,
  includeAllOption = false,
  allOptionLabel = "All Departments",
  disabled = false
}) {
  const { data: resp, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data ?? [])
  });

  const departments = Array.isArray(resp) ? resp : [];

  return (
    <Select value={value || undefined} onValueChange={onValueChange} required={required} disabled={disabled}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={isLoading ? "Loading departments..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {includeAllOption && (
              <SelectItem value="all">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <span>{allOptionLabel}</span>
                </div>
              </SelectItem>
            )}
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                <div className="flex items-center gap-3">
                  {dept.branding?.logo ? (
                    <img src={dept.branding.logo} alt="logo" className="w-4 h-4 object-contain" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{dept.branding?.name || dept.name}</span>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}