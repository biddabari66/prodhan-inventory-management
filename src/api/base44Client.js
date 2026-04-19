// BeeERP local API client — full replacement for Base44 SDK
// Provides entities, auth, and functions interfaces

import { BaseEntity, UserEntity } from '@/entities/base.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(errorData.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = errorData;
    throw err;
  }
  return res.json();
}

// Proxy that creates entity instances on demand
const entitiesProxy = new Proxy({}, {
  get(target, entityName) {
    if (typeof entityName !== 'string') return undefined;
    if (!target[entityName]) {
      target[entityName] = entityName === 'User'
        ? new UserEntity()
        : new BaseEntity(entityName);
    }
    return target[entityName];
  }
});

// BeeERP auth
const auth = {
  async me() {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async updateMe(data) {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    if (data.token) localStorage.setItem('auth_token', data.token);
    return data;
  },

  logout(redirectUrl) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cached_user_data');
    localStorage.removeItem('cached_user_permissions');
    window.location.href = redirectUrl || '/login';
  },

  redirectToLogin(returnUrl) {
    const loginUrl = returnUrl
      ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/login';
    window.location.href = loginUrl;
  }
};

// Functions invoke — calls our server-side /api/functions/:name endpoint
// Falls back to graceful no-op with a warning for unimplemented ones
const functions = {
  async invoke(functionName, payload = {}) {
    try {
      const res = await fetch(`${API_BASE}/api/functions/${functionName}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[functions.invoke] ${functionName} returned ${res.status}:`, err);
        return { success: false, error: err.error || `HTTP ${res.status}`, data: null };
      }
      return res.json();
    } catch (e) {
      console.warn(`[functions.invoke] ${functionName} failed:`, e.message);
      return { success: false, error: e.message, data: null };
    }
  }
};

// App logs stub
const appLogs = {
  logUserInApp: () => Promise.resolve()
};

// Integrations stub
const integrations = {
  Core: {
    InvokeLLM: async () => ({ response: 'AI not configured.' }),
    SendEmail: async (d) => { console.log('[SendEmail]', d); return { success: false }; },
    UploadFile: async ({ file }) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: getAuthHeaders()['Authorization'] || '' },
        body: form
      });
      return res.json();
    },
    ExtractDataFromUploadedFile: async () => ({ success: false }),
    SendSMS: async () => ({ success: false }),
    GenerateImage: async () => ({ url: null })
  }
};

export const base44 = {
  entities: entitiesProxy,
  auth,
  functions,
  integrations,
  appLogs,
  asServiceRole: { entities: entitiesProxy }
};
