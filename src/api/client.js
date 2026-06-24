import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies for refresh token
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Global scope (Sub-Company → Department): auto-apply the active scope from the
  // header picker (see src/lib/scope.js) to every data request so dashboards,
  // orders, CRM, accounting, etc. filter to the selected sub-company/department.
  // Harmless when nothing is selected. Never scope the company/department lists
  // themselves, auth, or platform-admin/billing/onboarding/ai endpoints.
  try {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    const exempt = /\/(companies|departments|auth|admin|billing|onboarding|ai)\b/.test(url);
    if (!exempt) {
      const companyId = localStorage.getItem('activeCompanyId') || null;
      const departmentId = localStorage.getItem('activeDepartmentId') || null;

      if (method === 'get') {
        // Reads: narrow query params to the active scope (never overriding an
        // explicit value already on the request).
        config.params = { ...(config.params || {}) };
        if (departmentId && config.params.departmentId === undefined) {
          config.params.departmentId = departmentId;
        }
        if (companyId && config.params.companyId === undefined) {
          config.params.companyId = companyId;
        }
      } else if (
        (method === 'post' || method === 'put' || method === 'patch') &&
        config.data && typeof config.data === 'object' && !Array.isArray(config.data)
      ) {
        // Writes: stamp the active scope onto the body. Never override values the
        // form set explicitly. The backend ignores fields a model doesn't have.
        if (companyId && config.data.companyId === undefined) {
          config.data = { ...config.data, companyId };
        }
        if (departmentId && config.data.departmentId === undefined) {
          config.data = { ...config.data, departmentId };
        }
      }
    }
  } catch { /* non-fatal */ }

  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/auth';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
