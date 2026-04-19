import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Generate a Base44-style ID
function generateId() {
    return crypto.randomUUID().replace(/-/g, '');
}

// Helper: parse filter query — handles Base44-style filter objects
function buildWhereClause(entityType, filters) {
    const conditions = ['entity_type = ?'];
    const params = [entityType];

    if (filters && typeof filters === 'object') {
        for (const [key, value] of Object.entries(filters)) {
            if (value === undefined || value === null) continue;

            // Handle array: IN clause
            if (Array.isArray(value)) {
                const safeVals = value.filter(v => typeof v !== 'object');
                if (safeVals.length === 0) continue;
                const placeholders = safeVals.map(() => '?').join(',');
                conditions.push(`json_extract(data, '$.${key}') IN (${placeholders})`);
                params.push(...safeVals);
                continue;
            }

            // Handle operator objects e.g. { $gte: 5, $lte: 10 }
            if (typeof value === 'object') {
                if (value.$gte !== undefined) {
                    conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) >= ?`);
                    params.push(value.$gte);
                }
                if (value.$lte !== undefined) {
                    conditions.push(`CAST(json_extract(data, '$.${key}') AS REAL) <= ?`);
                    params.push(value.$lte);
                }
                if (value.$like !== undefined) {
                    conditions.push(`json_extract(data, '$.${key}') LIKE ?`);
                    params.push(`%${value.$like}%`);
                }
                if (value.$ne !== undefined) {
                    conditions.push(`json_extract(data, '$.${key}') != ?`);
                    params.push(value.$ne);
                }
                continue; // skip raw object binding
            }

            // Primitive equality
            conditions.push(`json_extract(data, '$.${key}') = ?`);
            params.push(value);
        }
    }

    return { where: conditions.join(' AND '), params };
}

// LIST / FILTER entities
// POST /api/entities/:entityType/filter
router.post('/:entityType/filter', (req, res) => {
    try {
        const { entityType } = req.params;
        const { filters = {}, sort, limit = 500 } = req.body;

        const { where, params } = buildWhereClause(entityType, filters);

        let orderBy = 'updated_date DESC';
        if (sort) {
            const desc = sort.startsWith('-');
            const field = sort.replace(/^-/, '');
            if (['created_date', 'updated_date'].includes(field)) {
                orderBy = `${field} ${desc ? 'DESC' : 'ASC'}`;
            } else {
                orderBy = `json_extract(data, '$.${field}') ${desc ? 'DESC' : 'ASC'}`;
            }
        }

        const rows = db.prepare(
            `SELECT id, data, created_date, updated_date, created_by 
       FROM entities WHERE ${where} ORDER BY ${orderBy} LIMIT ?`
        ).all(...params, limit);

        const results = rows.map(row => ({
            id: row.id,
            ...JSON.parse(row.data),
            created_date: row.created_date,
            updated_date: row.updated_date,
            created_by: row.created_by
        }));

        res.json(results);
    } catch (error) {
        console.error('Entity filter error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET entity by ID
router.get('/:entityType/:id', (req, res) => {
    try {
        const { entityType, id } = req.params;

        const row = db.prepare(
            'SELECT id, data, created_date, updated_date, created_by FROM entities WHERE id = ? AND entity_type = ?'
        ).get(id, entityType);

        if (!row) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json({
            id: row.id,
            ...JSON.parse(row.data),
            created_date: row.created_date,
            updated_date: row.updated_date,
            created_by: row.created_by
        });
    } catch (error) {
        console.error('Entity get error:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE entity
router.post('/:entityType', (req, res) => {
    try {
        const { entityType } = req.params;
        const data = req.body;
        const id = generateId();
        const now = new Date().toISOString();
        const createdBy = req.user?.email || 'system';

        db.prepare(
            `INSERT INTO entities (id, entity_type, data, created_date, updated_date, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`
        ).run(id, entityType, JSON.stringify(data), now, now, createdBy);

        res.status(201).json({
            id,
            ...data,
            created_date: now,
            updated_date: now,
            created_by: createdBy
        });
    } catch (error) {
        console.error('Entity create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE entity
router.put('/:entityType/:id', (req, res) => {
    try {
        const { entityType, id } = req.params;
        const updates = req.body;
        const now = new Date().toISOString();

        const existing = db.prepare(
            'SELECT data FROM entities WHERE id = ? AND entity_type = ?'
        ).get(id, entityType);

        if (!existing) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        const currentData = JSON.parse(existing.data);
        const newData = { ...currentData, ...updates };

        db.prepare(
            'UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_type = ?'
        ).run(JSON.stringify(newData), now, id, entityType);

        res.json({
            id,
            ...newData,
            updated_date: now
        });
    } catch (error) {
        console.error('Entity update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE entity
router.delete('/:entityType/:id', (req, res) => {
    try {
        const { entityType, id } = req.params;

        const result = db.prepare(
            'DELETE FROM entities WHERE id = ? AND entity_type = ?'
        ).run(id, entityType);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json({ success: true, id });
    } catch (error) {
        console.error('Entity delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
