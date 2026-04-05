import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'manager'].includes(user.job_role?.toLowerCase()) && user.role !== 'admin') {
      return Response.json({ error: 'Only admin/manager can finalize daily sales' }, { status: 403 });
    }

    const body = await req.json();
    const { sales_date } = body;

    const nowBDT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const targetDate = sales_date || `${nowBDT.getFullYear()}-${String(nowBDT.getMonth() + 1).padStart(2, '0')}-${String(nowBDT.getDate()).padStart(2, '0')}`;

    // Fetch recent orders in a single batch
    const allOrders = await base44.asServiceRole.entities.Order.list('-order_date', 1000);
    
    const ordersToFinalize = allOrders.filter(o => {
      if (o.sales_day_date) return false;
      if (!o.order_date) return false;
      const orderDate = new Date(o.order_date);
      if (isNaN(orderDate.getTime())) return false;
      const bdtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(orderDate);
      return bdtDate <= targetDate;
    });

    if (ordersToFinalize.length === 0) {
      return Response.json({
        success: true,
        message: `No unfinalized orders found for ${targetDate} or earlier.`,
        finalized_count: 0,
        sales_date: targetDate
      });
    }

    // Process max 100 per run to stay within time/rate limits
    const batch = ordersToFinalize.slice(0, 100);
    let finalizedCount = 0;
    const errors = [];

    // Update ONE at a time with 2s delay to avoid rate limits
    for (const order of batch) {
      try {
        const orderDate = new Date(order.order_date);
        const bdtDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(orderDate);
        await base44.asServiceRole.entities.Order.update(order.id, { sales_day_date: bdtDateStr });
        finalizedCount++;
      } catch (err) {
        if (err.message?.includes('Rate limit')) {
          // Wait longer on rate limit, then retry once
          await sleep(5000);
          try {
            const orderDate = new Date(order.order_date);
            const bdtDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(orderDate);
            await base44.asServiceRole.entities.Order.update(order.id, { sales_day_date: bdtDateStr });
            finalizedCount++;
          } catch (retryErr) {
            errors.push({ order_id: order.id, error: retryErr.message });
          }
        } else {
          errors.push({ order_id: order.id, error: err.message });
        }
      }
      // Wait between each update
      await sleep(800);
    }

    const remaining = ordersToFinalize.length - batch.length;

    return Response.json({
      success: true,
      message: `Finalized ${finalizedCount} orders for ${targetDate}.${remaining > 0 ? ` ${remaining} more remaining — run again.` : ''}`,
      finalized_count: finalizedCount,
      total_eligible: ordersToFinalize.length,
      remaining,
      sales_date: targetDate,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      finalized_by: user.full_name || user.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});