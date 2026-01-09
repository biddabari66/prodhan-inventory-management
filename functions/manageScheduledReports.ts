import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SCHEDULED REPORTS MANAGEMENT
 * Backend function to manage scheduled task creation, listing, toggling, and deletion
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    console.log('📋 Managing scheduled reports...');
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user?.role !== 'admin' && user?.job_role !== 'admin' && user?.job_role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin user authenticated:', user.email);

    const body = await req.text();
    const { action, task_id, task_data } = body ? JSON.parse(body) : {};
    
    console.log('🔧 Action:', action);

    switch (action) {
      case 'list': {
        const tasks = await base44.asServiceRole.scheduledTasks.list();
        return Response.json({ success: true, tasks });
      }

      case 'create': {
        if (!task_data) {
          return Response.json({ error: 'task_data is required' }, { status: 400 });
        }
        
        const { name, description, function_name, function_args, repeat_interval, repeat_unit, start_time, is_active, repeat_on_days, repeat_on_day_of_month } = task_data;
        
        console.log('📝 Creating task:', name, 'Function:', function_name);
        
        const taskConfig = {
          name,
          description,
          function_name,
          function_args: function_args || {},
          repeat_interval: repeat_interval || 1,
          repeat_unit: repeat_unit || 'days',
          start_time: start_time || '09:00',
          is_active: is_active !== undefined ? is_active : true
        };

        // Add weekly/monthly config if provided
        if (repeat_on_days) taskConfig.repeat_on_days = repeat_on_days;
        if (repeat_on_day_of_month) taskConfig.repeat_on_day_of_month = repeat_on_day_of_month;
        
        console.log('🚀 Creating with config:', taskConfig);
        
        const task = await base44.asServiceRole.scheduledTasks.create(taskConfig);
        
        console.log('✅ Task created:', task.id);
        
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