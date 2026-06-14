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
const unwrap = (res) => res.data?.data ?? res.data ?? [];

// Base44-style call signature: filter(query, sortBy, limit) / list(sortBy, limit)
function buildParams(query = {}, sortBy, limit) {
  const params = toBackend({ ...(query || {}) });
  if (sortBy) {
    const desc = sortBy.startsWith('-');
    const field = desc ? sortBy.slice(1) : sortBy;
    params.sort = `${desc ? '-' : ''}${field}`;
  }
  if (limit) params.limit = limit;
  return params;
}

export function defineEntity(entityName) {
  const endpoint = endpointFor(entityName);
  return {
    list: async (sortBy, limit) =>
      toFrontend(unwrap(await api.get(endpoint, { params: buildParams({}, sortBy, limit) }))),
    filter: async (query, sortBy, limit) =>
      toFrontend(unwrap(await api.get(endpoint, { params: buildParams(query, sortBy, limit) }))),
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
    return user;
  },
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data.accessToken) localStorage.setItem('accessToken', res.data.accessToken);
    if (res.data.user) localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
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
  integrations,
  entities: new Proxy({}, { get: (_t, name) => defineEntity(String(name)) }),
};

export default erp;
