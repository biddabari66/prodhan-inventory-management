// Base entity class that mimics the Base44 SDK entity API
// All entities use the local Express API server instead of Base44

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
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

export class BaseEntity {
    constructor(entityName) {
        this.entityName = entityName;
    }

    async filter(filters = {}, sort = '-updated_date', limit = 500) {
        const res = await fetch(`${API_BASE}/api/entities/${this.entityName}/filter`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ filters, sort, limit })
        });
        return handleResponse(res);
    }

    async get(id) {
        const res = await fetch(`${API_BASE}/api/entities/${this.entityName}/${id}`, {
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    }

    async create(data) {
        const res = await fetch(`${API_BASE}/api/entities/${this.entityName}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    }

    async update(id, data) {
        const res = await fetch(`${API_BASE}/api/entities/${this.entityName}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    }

    async delete(id) {
        const res = await fetch(`${API_BASE}/api/entities/${this.entityName}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    }

    async list(sort, limit) {
        return this.filter({}, sort, limit);
    }

    /**
     * subscribe() — Base44 used this for real-time updates via WebSocket.
     * We stub it out: calls the callback once with fresh data, then returns
     * an unsubscribe function. This keeps pages functional without real-time.
     */
    subscribe(callback, errorCallback) {
        let cancelled = false;

        // Fetch initial data and call callback once
        this.filter()
            .then(data => {
                if (!cancelled && typeof callback === 'function') {
                    callback(data);
                }
            })
            .catch(err => {
                if (!cancelled && typeof errorCallback === 'function') {
                    errorCallback(err);
                }
            });

        // Return unsubscribe function
        return () => { cancelled = true; };
    }

    async count(filters = {}) {
        const data = await this.filter(filters, null, 10000);
        return data.length;
    }

    // stub for bulk operations
    async bulkCreate(items) {
        const results = [];
        for (const item of items) {
            results.push(await this.create(item));
        }
        return results;
    }

    async bulkDelete(ids) {
        for (const id of ids) {
            await this.delete(id);
        }
        return { success: true, count: ids.length };
    }

    // Alias used in some components
    async getById(id) {
        return this.get(id);
    }
}

// User entity has special auth methods
export class UserEntity extends BaseEntity {
    constructor() {
        super('User');
    }

    async me() {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    }

    async updateMe(data) {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    }
}

export function createEntity(name) {
    if (name === 'User') return new UserEntity();
    return new BaseEntity(name);
}
