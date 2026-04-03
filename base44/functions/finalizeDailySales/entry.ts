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

    // Determine the business date for finalization (BDT timezone)
    const nowBDT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const targetDate = sales_date || `${nowBDT.getFullYear()}-${String(nowBDT.getMonth() + 1).padStart(2, '0')}-${String(nowBDT.getDate()).padStart(2, '0')}`;

    // Fetch orders in smaller batches, only those without sales_day_date
    const batchSize = 200;
    let ordersToFinalize = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Order.list('-order_date', batchSize, offset);
      
      const eligible = batch.filter(o => {
        if (o.sales_day_date) return false; // Already finalized
        if (!o.order_date) return false;
        const orderDate = new Date(o.order_date);
        if (isNaN(orderDate.getTime())) return false;
        const bdtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(orderDate);
        return bdtDate <= targetDate;
      });

      ordersToFinalize = [...ordersToFinalize, ...eligible];
      offset += batchSize;
      hasMore = batch.length === batchSize;

      // Safety limit: max 5000 orders per finalization
      if (ordersToFinalize.length >= 5000 || offset > 20000) break;

      // Small delay between list calls to avoid rate limiting
      if (hasMore) await sleep(200);
    }

    if (ordersToFinalize.length === 0) {
      return Response.json({
        success: true,
        message: `No unfinalized orders found for ${targetDate} or earlier.`,
        finalized_count: 0,
        sales_date: targetDate
      });
    }

    // Update in small batches with delays to avoid rate limits
    let finalizedCount = 0;
    const errors = [];
    const UPDATE_BATCH_SIZE = 5;

    for (let i = 0; i < ordersToFinalize.length; i += UPDATE_BATCH_SIZE) {
      const chunk = ordersToFinalize.slice(i, i + UPDATE_BATCH_SIZE);
      
      const results = await Promise.allSettled(
        chunk.map(order => {
          const orderDate = new Date(order.order_date);
          const bdtDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(orderDate);
          return base44.asServiceRole.entities.Order.update(order.id, { sales_day_date: bdtDateStr });
        })
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          finalizedCount++;
        } else {
          errors.push({ order_id: chunk[idx].id, error: result.reason?.message });
        }
      });

      // Delay between batches to avoid rate limits
      if (i + UPDATE_BATCH_SIZE < ordersToFinalize.length) {
        await sleep(500);
      }
    }

    return Response.json({
      success: true,
      message: `Successfully finalized ${finalizedCount} orders for ${targetDate}.`,
      finalized_count: finalizedCount,
      total_eligible: ordersToFinalize.length,
      sales_date: targetDate,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      finalized_by: user.full_name || user.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});