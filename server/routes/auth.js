import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prodhan-inventory-secret-key-2024';

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const userData = JSON.parse(user.data || '{}');
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                ...userData,
                created_date: user.created_date
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
    try {
        const { email, password, full_name, ...extraData } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const id = crypto.randomUUID().replace(/-/g, '');
        const now = new Date().toISOString();

        db.prepare(`
      INSERT INTO users (id, email, password, full_name, role, data, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, hashedPassword, full_name || '', 'user', JSON.stringify(extraData), now, now);

        const token = jwt.sign(
            { id, email, role: 'user' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            user: { id, email, full_name: full_name || '', role: 'user', ...extraData }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = JSON.parse(user.data || '{}');
        res.json({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            ...userData,
            created_date: user.created_date
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/auth/me
router.put('/me', (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const updates = req.body;
        const now = new Date().toISOString();

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentData = JSON.parse(user.data || '{}');
        const newData = { ...currentData, ...updates };

        // Update allowed top-level fields
        const fullName = updates.full_name || updates.display_name || user.full_name;

        db.prepare(
            'UPDATE users SET data = ?, full_name = ?, updated_date = ? WHERE id = ?'
        ).run(JSON.stringify(newData), fullName, now, req.user.id);

        res.json({
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: user.role,
            ...newData
        });
    } catch (error) {
        console.error('Update me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ success: true });
});

// GET /api/auth/public-settings
router.get('/public-settings', (req, res) => {
    res.json({
        id: 'local-app',
        public_settings: {
            app_name: 'Prodhan Inventory Management',
            requires_auth: false
        }
    });
});

export { JWT_SECRET };
export default router;
