// Active-scope store for the Company (sub-company) → Department picker.
//
// The mother company is the Tenant. A `Company` here is a SUB-COMPANY and a
// `Department` belongs to a sub-company. The user picks one of each in the
// header and that selection is auto-applied to every data request by the axios
// interceptor (see src/api/client.js).
//
// Dependency-free: persists to localStorage and notifies subscribers via a
// `window` CustomEvent so any component using `useScope()` re-renders on change.

import { useEffect, useState } from 'react';

const COMPANY_KEY = 'activeCompanyId';
const DEPARTMENT_KEY = 'activeDepartmentId';
const EVENT = 'scopechange';

function read(key) {
  try {
    const v = localStorage.getItem(key);
    return v == null || v === '' ? null : v;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* non-fatal (e.g. storage disabled) */
  }
}

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* SSR / non-browser — ignore */
  }
}

/** @returns {{ companyId: string|null, departmentId: string|null }} */
export function getScope() {
  return {
    companyId: read(COMPANY_KEY),
    departmentId: read(DEPARTMENT_KEY),
  };
}

/** Select a sub-company. Clears the department since it is company-scoped. */
export function setCompany(id) {
  write(COMPANY_KEY, id);
  write(DEPARTMENT_KEY, null);
  emit();
}

/** Select a department within the active sub-company. */
export function setDepartment(id) {
  write(DEPARTMENT_KEY, id);
  emit();
}

/**
 * React hook: current scope values + setters, re-rendering on change.
 * Listens to both same-tab CustomEvents and cross-tab `storage` events.
 */
export function useScope() {
  const [scope, setScope] = useState(getScope);

  useEffect(() => {
    const sync = () => setScope(getScope());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return {
    companyId: scope.companyId,
    departmentId: scope.departmentId,
    setCompany,
    setDepartment,
  };
}
