import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SCHEDULED REPORTS MANAGEMENT
 * Backend function to manage scheduled task creation, listing, toggling, and deletion
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.job_role !== 'admin' && user?.job_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, task_id, task_data } = await req.json();

    switch (action) {
      case 'list': {
        const tasks = await base44.asServiceRole.scheduledTasks.list();
        return Response.json({ success: true, tasks });
      }

      case 'create': {
        const { name, description, function_name, function_args, repeat_interval, repeat_unit, start_time, is_active, repeat_on_days, repeat_on_day_of_month } = task_data;
        
        const taskConfig = {
          name,
          description,
          function_name,
          function_args,
          repeat_interval,
          repeat_unit,
          start_time,
          is_active: is_active !== undefined ? is_active : true
        };

        // Add weekly/monthly config if provided
        if (repeat_on_days) taskConfig.repeat_on_days = repeat_on_days;
        if (repeat_on_day_of_month) taskConfig.repeat_on_day_of_month = repeat_on_day_of_month;
        
        const task = await base44.asServiceRole.scheduledTasks.create(taskConfig);
        
        return Response.json({ success: true, task });
      }

      case 'toggle': {
        const task = await base44.asServiceRole.scheduledTasks.toggle(task_id);
        return Response.json({ success: true, task });
      }

      case 'delete': {
        await base44.asServiceRole.scheduledTasks.delete(task_id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});