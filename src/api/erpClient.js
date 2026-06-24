// Compatibility bridge for legacy pages that were written against the old
// low-code entity SDK. Built entirely on top of the project's own axios client
// (./client) and domain APIs (./prodhanApi) — no third-party low-code SDK.
//
// Legacy pages use `erp.entities.X.filter(...)`, `erp.auth.me()`,
// `erp.functions.invoke(name, payload)` and `erp.integrations.Core.*`.
import api from './client';
import { endpointFor } from './endpoints';
import { toBackend, toFrontend } from './caseConvert';

const USER_KEY = 'currentUser';
const COMPANY_KEY = 'activeCompanyId';
const DEPT_KEY    = 'activeDepartmentId';
const SCOPE_EVENT = 'scopechange';

/**
 * Writes the user's assigned company/department scope into localStorage and
 * fires a scopechange event so every component using useScope() re-renders.
 *
 * Rules:
 *  - Non-admins: always overwrite — their scope is locked to their profile.
 *  - Admins:     only set a default if nothing is saved yet (they may have
 *                manually chosen a different scope from the header picker).
 */
function seedScopeFromUser(user) {
  try {
    const adminRoles = ['admin', 'super_admin', 'tenant_admin', 'ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'];
    const isAdmin =
      adminRoles.includes(String(user.role || '').toUpperCase().replace(/ /g,'_')) ||
      adminRoles.includes(String(user.job_role || '').toUpperCase().replace(/ /g,'_')) ||
      user.role === 'admin';

    const profileCompanyId   = user.company_id   || user.companyId   || null;
    const profileDepartmentId = user.department_id || user.departmentId || null;

    if (!isAdmin) {
      // Non-admins: scope is always their profile — hard lock.
      if (profileCompanyId)   localStorage.setItem(COMPANY_KEY, String(profileCompanyId));
      else                    localStorage.removeItem(COMPANY_KEY);
      if (profileDepartmentId) localStorage.setItem(DEPT_KEY, String(profileDepartmentId));
      else                     localStorage.removeItem(DEPT_KEY);
    } else {
      // Admins: set a sensible default only when no saved scope exists.
      if (!localStorage.getItem(COMPANY_KEY) && profileCompanyId)
        localStorage.setItem(COMPANY_KEY, String(profileCompanyId));
      if (!localStorage.getItem(DEPT_KEY) && profileDepartmentId)
        localStorage.setItem(DEPT_KEY, String(profileDepartmentId));
    }

    window.dispatchEvent(new CustomEvent(SCOPE_EVENT));
  } catch { /* non-fatal */ }
}
const unwrap = (res) => res.data?.data ?? res.data ?? [];

// Base44-style call signature: filter(query, sortBy, limit) / list(sortBy, limit)
// Base44-style call signature: filter(query, sortBy, limit) / list(sortBy, limit)
function buildParams(query = {}, sortBy, limit, page) {
  const params = toBackend({ ...(query || {}) });
  if (sortBy) {
    const desc = sortBy.startsWith('-');
    const field = desc ? sortBy.slice(1) : sortBy;
    params.sort = `${desc ? '-' : ''}${field}`;
  }
  if (limit) params.limit = limit;
  if (page) params.page = page;
  return params;
}

export function defineEntity(entityName) {
  const endpoint = endpointFor(entityName);
  return {
    list: async (sortBy, limit) =>
      toFrontend(unwrap(await api.get(endpoint, { params: buildParams({}, sortBy, limit) }))),
    listPaginated: async (sortBy, limit, page) => {
      const res = await api.get(endpoint, { params: buildParams({}, sortBy, limit, page) });
      const data = toFrontend(unwrap(res));
      return {
        data,
        total: res.data?.total || data.length,
        page: res.data?.page || 1,
        limit: res.data?.limit || limit || data.length,
        totalPages: res.data?.totalPages || 1,
      };
    },
    filter: async (query, sortBy, limit) =>
      toFrontend(unwrap(await api.get(endpoint, { params: buildParams(query, sortBy, limit) }))),
    filterPaginated: async (query, sortBy, limit, page) => {
      const res = await api.get(endpoint, { params: buildParams(query, sortBy, limit, page) });
      const data = toFrontend(unwrap(res));
      return {
        data,
        total: res.data?.total || data.length,
        page: res.data?.page || 1,
        limit: res.data?.limit || limit || data.length,
        totalPages: res.data?.totalPages || 1,
      };
    },
    get: async (id) => {
      const res = await api.get(`${endpoint}/${id}`);
      return toFrontend(res.data?.data ?? res.data);
    },
    findFirst: async (query) => {
      const rows = unwrap(await api.get(endpoint, { params: buildParams(query, undefined, 1) }));
      const arr = Array.isArray(rows) ? rows : [rows];
      return arr[0] ? toFrontend(arr[0]) : null;
    },
    create: async (data) => {
      const res = await api.post(endpoint, toBackend(data));
      return toFrontend(res.data?.data ?? res.data);
    },
    bulkCreate: async (items) => {
      const res = await api.post(`${endpoint}/bulk`, { items: toBackend(items) });
      return toFrontend(res.data?.data ?? res.data);
    },
    update: async (id, data) => {
      const res = await api.patch(`${endpoint}/${id}`, toBackend(data));
      return toFrontend(res.data?.data ?? res.data);
    },
    delete: async (id) => (await api.delete(`${endpoint}/${id}`)).data,
    subscribe: () => () => {},
  };
}

// ─── Auth ───────────────────────────────────────────────────────────────────
const auth = {
  me: async () => {
    const res = await api.get('/auth/me');
    const raw = res.data?.user ?? res.data?.data ?? res.data;
    const user = toFrontend(raw);
    user.full_name = user.full_name || user.display_name || user.name;
    user.name = user.name || user.display_name || user.full_name;
    // Normalize role: backend enum (SUPER_ADMIN/TENANT_ADMIN/USER) -> legacy 'admin'|'user'
    // so every legacy `user.role === 'admin'` check across the app works.
    const adminish = ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN'];
    user.role =
      adminish.includes(String(user.role || '').toUpperCase()) ||
      adminish.includes(String(user.job_role || '').toUpperCase())
        ? 'admin'
        : 'user';
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // ✅ KEY FIX: seed the user's company/department scope into localStorage
    // so the axios interceptor (client.js) auto-stamps it on every API call.
    seedScopeFromUser(user);
    return user;
  },
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data.accessToken) localStorage.setItem('accessToken', res.data.accessToken);
    if (res.data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      // ✅ Seed scope immediately on login
      seedScopeFromUser(toFrontend(res.data.user));
    }
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('zypra-query-cache'); // drop persisted data cache
    localStorage.removeItem('cached_user_permissions');
    window.location.href = '/Auth';
  },
  changePassword: async (payload) => (await api.post('/auth/change-password', payload)).data,
  redirectToLogin: () => {
    window.location.href = '/Auth';
  },
};

// ─── Server-side functions (named action -> REST endpoint) ────────────────────
const FUNCTION_ROUTES = {
  steadfastIntegration: { method: 'post', url: '/integrations/steadfast' },
  syncInventoryToSheet: { method: 'post', url: '/integrations/google-sheets/sync' },
  syncToAdprofit: { method: 'post', url: '/integrations/adprofit/sync' },
  sendWhatsAppMessage: { method: 'post', url: '/integrations/whatsapp/send' },
  sendTestEmail: { method: 'post', url: '/integrations/email/test' },
  generateAndSendEmail: { method: 'post', url: '/integrations/email/send' },
  manageIntegrationStatus: { method: 'get', url: '/integrations' },
};

const functions = {
  invoke: async (functionName, payload = {}) => {
    const route = FUNCTION_ROUTES[functionName] || {
      method: 'post',
      url: `/functions/${functionName}`,
    };
    const res =
      route.method === 'get'
        ? await api.get(route.url, { params: payload })
        : await api.post(route.url, payload);
    return { data: res.data };
  },
};

// ─── Core integrations ────────────────────────────────────────────────────────
const integrations = {
  Core: {
    InvokeLLM: async (p) => (await api.post('/ai/invoke', p)).data,
    SendEmail: async (p) => (await api.post('/integrations/email/send', p)).data,
    SendSMS: async (p) => (await api.post('/integrations/whatsapp/send', p)).data,
    UploadFile: async (formData) =>
      (await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data,
    GenerateImage: async (p) => (await api.post('/ai/image', p)).data,
    ExtractDataFromUploadedFile: async (p) => (await api.post('/ai/extract', p)).data,
  },
};

export const erp = {
  appLogs: { logUserInApp: async () => true },
  functions,
  auth,
  api,
  integrations,
  entities: new Proxy({}, { get: (_t, name) => defineEntity(String(name)) }),
};

export default erp;
