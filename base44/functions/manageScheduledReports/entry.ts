import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SCHEDULED REPORTS MANAGEMENT
 * Uses ScheduledReport entity to store scheduled report configurations
 * Actual scheduling is done via platform automations
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
        // List from ScheduledReport entity
        const tasks = await base44.asServiceRole.entities.ScheduledReport.list('-created_date');
        return Response.json({ success: true, tasks: tasks || [] });
      }

      case 'create': {
        if (!task_data) {
          return Response.json({ error: 'task_data is required' }, { status: 400 });
        }
        
        const { name, description, function_name, function_args, repeat_interval, repeat_unit, start_time, is_active, repeat_on_days, repeat_on_day_of_month } = task_data;
        
        console.log('📝 Creating scheduled report:', name, 'Function:', function_name);
        
        // Store in ScheduledReport entity
        const task = await base44.asServiceRole.entities.ScheduledReport.create({
          name,
          description,
          function_name,
          function_args: function_args || {},
          repeat_interval: repeat_interval || 1,
          repeat_unit: repeat_unit || 'days',
          start_time: start_time || '09:00',
          is_active: is_active !== undefined ? is_active : true,
          repeat_on_days: repeat_on_days || null,
          repeat_on_day_of_month: repeat_on_day_of_month || null,
          created_by_id: user.id,
          created_by_name: user.full_name
        });
        
        console.log('✅ Scheduled report created:', task.id);
        
        return Response.json({ success: true, task });
      }

      case 'toggle': {
        if (!task_id) {
          return Response.json({ error: 'task_id is required' }, { status: 400 });
        }
        const existingTask = await base44.asServiceRole.entities.ScheduledReport.get(task_id);
        const updatedTask = await base44.asServiceRole.entities.ScheduledReport.update(task_id, {
          is_active: !existingTask.is_active
        });
        return Response.json({ success: true, task: updatedTask });
      }

      case 'delete': {
        if (!task_id) {
          return Response.json({ error: 'task_id is required' }, { status: 400 });
        }
        await base44.asServiceRole.entities.ScheduledReport.delete(task_id);
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