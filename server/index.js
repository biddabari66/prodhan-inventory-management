import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db.js';
import authRoutes, { JWT_SECRET } from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import uploadRoutes, { UPLOADS_DIR } from './routes/upload.js';
import functionsRoutes from './routes/functions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(cors({
    origin: IS_PROD
        ? (process.env.FRONTEND_URL || true)
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5180'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Remove X-Powered-By
app.disable('x-powered-by');

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Basic rate limiting (in-memory)
const requestCounts = new Map();
app.use('/api/auth/login', (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 min
    const maxRequests = 20;

    const entry = requestCounts.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
    }
    entry.count++;
    requestCounts.set(key, entry);

    if (entry.count > maxRequests) {
        return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }
    next();
});

// ─── Serve Static Uploads ─────────────────────────────────────────────────────
app.use('/api/uploads', express.static(UPLOADS_DIR));

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            req.user = null;
        }
    }
    next();
});

// ─── Request Logger (dev) ─────────────────────────────────────────────────────
if (!IS_PROD) {
    app.use('/api', (req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/functions', functionsRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'BeeERP',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ─── Serve React SPA (Production) ────────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — Express 5 compatible (no wildcard '*')
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#94a3b8">
        <h1>🐝 BeeERP Server is running</h1>
        <p>API available at <a href="/api/health" style="color:#f59e0b">/api/health</a></p>
        <p style="opacity:0.6">Run <code>npm run build</code> to serve the frontend.</p>
      </body></html>
    `);
    }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({
        error: IS_PROD ? 'Internal server error' : err.message
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🐝 BeeERP Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${IS_PROD ? 'production' : 'development'}`);
});

export default app;
