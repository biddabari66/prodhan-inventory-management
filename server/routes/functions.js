import { Router } from 'express';

const router = Router();

/**
 * POST /api/functions/:name
 * Call a named backend function.
 * Implements core functions that were previously Base44 cloud functions.
 * Returns { success, data, error } shape matching Base44's response format.
 */

// Helper: safe async handler
const fn = (handler) => async (req, res) => {
    try {
        const result = await handler(req);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error(`[functions/${req.params.name}] error:`, err.message);
        res.status(500).json({ success: false, error: err.message, data: null });
    }
};

// Import db for functions that need entity access
import db from '../db.js';

// ─── Inventory deduction on order shipped ────────────────────────────────────
async function deductInventoryOnShip(payload) {
    const { order } = payload;
    if (!order || order.order_status !== 'shipped') return { skipped: true };

    const orderItems = order.order_items || [];
    let deducted = 0;

    for (const item of orderItems) {
        if (!item.inventory_id) continue;
        const invRow = db.prepare(
            "SELECT data FROM entities WHERE id = ? AND entity_type = 'Inventory'"
        ).get(item.inventory_id);
        if (!invRow) continue;

        const inv = JSON.parse(invRow.data);
        const qty = item.quantity || 1;
        const newStock = Math.max(0, (inv.current_stock || 0) - qty);
        const newData = {
            ...inv,
            current_stock: newStock,
            total_sold: (inv.total_sold || 0) + qty,
            status: newStock <= 0 ? 'out_of_stock' : newStock <= (inv.minimum_stock || 0) ? 'low_stock' : 'active'
        };
        db.prepare("UPDATE entities SET data = ?, updated_date = ? WHERE id = ?")
            .run(JSON.stringify(newData), new Date().toISOString(), item.inventory_id);

        // Create movement record
        const movId = crypto.randomUUID().replace(/-/g, '');
        db.prepare("INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?,?,?,?,?)")
            .run(movId, 'InventoryMovement', JSON.stringify({
                inventory_item_id: item.inventory_id,
                movement_type: 'out',
                quantity: -qty,
                reference_type: 'sale',
                reference_number: order.order_number,
                notes: `Auto-deduct on ship | Order: ${order.order_number}`,
                movement_date: new Date().toISOString().split('T')[0],
                balance_after: newStock
            }), new Date().toISOString(), new Date().toISOString());
        deducted++;
    }
    return { items_deducted: deducted, order_number: order.order_number };
}

// ─── Revert inventory on cancel ──────────────────────────────────────────────
async function revertInventoryOnCancel(payload) {
    const { order } = payload;
    if (!order || order.order_status !== 'cancelled') return { skipped: true };

    const orderItems = order.order_items || [];
    let reverted = 0;

    // Check if sale movements exist
    const existingMovs = db.prepare(
        "SELECT data FROM entities WHERE entity_type = 'InventoryMovement' AND json_extract(data, '$.reference_number') = ? AND json_extract(data, '$.reference_type') = 'sale'"
    ).all(order.order_number);

    if (existingMovs.length === 0) return { skipped: true, reason: 'No sale movements found' };

    for (const item of orderItems) {
        if (!item.inventory_id) continue;
        const invRow = db.prepare(
            "SELECT data FROM entities WHERE id = ? AND entity_type = 'Inventory'"
        ).get(item.inventory_id);
        if (!invRow) continue;
        const inv = JSON.parse(invRow.data);
        const qty = item.quantity || 1;
        const newStock = (inv.current_stock || 0) + qty;
        const newData = {
            ...inv,
            current_stock: newStock,
            total_sold: Math.max(0, (inv.total_sold || 0) - qty),
            status: newStock <= 0 ? 'out_of_stock' : newStock <= (inv.minimum_stock || 0) ? 'low_stock' : 'active'
        };
        db.prepare("UPDATE entities SET data = ?, updated_date = ? WHERE id = ?")
            .run(JSON.stringify(newData), new Date().toISOString(), item.inventory_id);
        reverted++;
    }
    return { items_reverted: reverted };
}

// ─── Generate Employee ID ─────────────────────────────────────────────────────
async function generateEmployeeId(payload) {
    const { user_id } = payload;
    const count = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const empId = `EMP-${String(count).padStart(3, '0')}`;
    if (user_id) {
        const user = db.prepare('SELECT data FROM users WHERE id = ?').get(user_id);
        if (user) {
            const d = JSON.parse(user.data || '{}');
            db.prepare('UPDATE users SET data = ? WHERE id = ?')
                .run(JSON.stringify({ ...d, employee_id: empId }), user_id);
        }
    }
    return { employee_id: empId };
}

// ─── Get inventory search suggestions ────────────────────────────────────────
async function getInventorySearchSuggestions(payload) {
    const { query } = payload;
    if (!query) return { suggestions: [] };
    const rows = db.prepare(
        "SELECT data FROM entities WHERE entity_type = 'Inventory' AND (json_extract(data, '$.item_name') LIKE ? OR json_extract(data, '$.barcode') LIKE ?) LIMIT 10"
    ).all(`%${query}%`, `%${query}%`);
    return {
        suggestions: rows.map(r => {
            const d = JSON.parse(r.data);
            return { id: d.id, name: d.item_name, barcode: d.barcode, stock: d.current_stock };
        })
    };
}

// ─── Route dispatcher ─────────────────────────────────────────────────────────
const functionHandlers = {
    deductInventoryOnShip,
    revertInventoryOnCancel,
    generateEmployeeId,
    getInventorySearchSuggestions,
};

router.post('/:name', fn(async (req) => {
    const { name } = req.params;
    const payload = req.body || {};

    const handler = functionHandlers[name];
    if (handler) {
        return await handler(payload);
    }

    // For unimplemented functions, return a graceful stub
    console.log(`[functions/${name}] stub called with:`, JSON.stringify(payload).substring(0, 100));
    return {
        message: `Function '${name}' acknowledged (self-hosted stub)`,
        payload_received: Object.keys(payload)
    };
}));

export default router;
