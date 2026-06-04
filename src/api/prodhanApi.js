import api from './client';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  refresh: () => api.post('/auth/refresh').then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orderApi = {
  list: (params) => api.get('/orders', { params }).then(r => r.data),
  get: (id) => api.get(`/orders/${id}`).then(r => r.data),
  create: (data) => api.post('/orders', data).then(r => r.data),
  update: (id, data) => api.patch(`/orders/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/orders/${id}`).then(r => r.data),
  stats: () => api.get('/orders/stats').then(r => r.data),
  sendToCourier: (id, courierData) =>
    api.post(`/orders/${id}/send-to-courier`, courierData).then(r => r.data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }).then(r => r.data),
  get: (id) => api.get(`/inventory/${id}`).then(r => r.data),
  create: (data) => api.post('/inventory', data).then(r => r.data),
  update: (id, data) => api.patch(`/inventory/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/inventory/${id}`).then(r => r.data),
  lowStock: () => api.get('/inventory/low-stock').then(r => r.data),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust-stock`, data).then(r => r.data),
  movements: (id, params) => api.get(`/inventory/${id}/movements`, { params }).then(r => r.data),
};

// ─── CRM / Leads ─────────────────────────────────────────────────────────────
export const crmApi = {
  leads: {
    list: (params) => api.get('/crm/leads', { params }).then(r => r.data),
    get: (id) => api.get(`/crm/leads/${id}`).then(r => r.data),
    create: (data) => api.post('/crm/leads', data).then(r => r.data),
    update: (id, data) => api.patch(`/crm/leads/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/crm/leads/${id}`).then(r => r.data),
    pipeline: () => api.get('/crm/leads/pipeline').then(r => r.data),
    stats: () => api.get('/crm/leads/stats').then(r => r.data),
    addFollowUp: (id, data) => api.post(`/crm/leads/${id}/follow-up`, data).then(r => r.data),
    convert: (id, data) => api.post(`/crm/leads/${id}/convert`, data).then(r => r.data),
    bulkAssign: (leadIds, assignedToId) =>
      api.post('/crm/leads/bulk-assign', { leadIds, assignedToId }).then(r => r.data),
  },
};

// ─── Users / Employees ────────────────────────────────────────────────────────
export const userApi = {
  list: (params) => api.get('/users', { params }).then(r => r.data),
  get: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post('/users', data).then(r => r.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
  attendanceSummary: (id, params) =>
    api.get(`/users/${id}/attendance-summary`, { params }).then(r => r.data),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  checkIn: (data) => api.post('/attendance/check-in', data).then(r => r.data),
  checkOut: () => api.post('/attendance/check-out').then(r => r.data),
  manualMark: (data) => api.post('/attendance/manual', data).then(r => r.data),
  list: (params) => api.get('/attendance', { params }).then(r => r.data),
  my: (params) => api.get('/attendance/my', { params }).then(r => r.data),
  dailyReport: (date) => api.get('/attendance/daily-report', { params: { date } }).then(r => r.data),
  monthlySummary: (month, year) =>
    api.get('/attendance/monthly-summary', { params: { month, year } }).then(r => r.data),
};

// ─── Payroll ──────────────────────────────────────────────────────────────────
export const payrollApi = {
  list: (params) => api.get('/payroll', { params }).then(r => r.data),
  calculate: (data) => api.post('/payroll/calculate', data).then(r => r.data),
  approve: (id) => api.patch(`/payroll/${id}/approve`).then(r => r.data),
  markPaid: (id) => api.patch(`/payroll/${id}/mark-paid`).then(r => r.data),
};

// ─── Finance ─────────────────────────────────────────────────────────────────
export const financeApi = {
  dashboard: () => api.get('/finance/dashboard').then(r => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  list: () => api.get('/notifications').then(r => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
};
