import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // FIXED: Allow department_head, admin, and manager roles to access assignable users
    const authorizedRoles = ['admin', 'department_head', 'manager'];
    const userRole = user.job_role || user.role;

    if (!authorizedRoles.includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role to fetch all users from the admission department
    const assignableUsers = await base44.asServiceRole.entities.User.filter({
      department: 'admission',
      is_active: true
    }, '-created_date', 500); // Limit to 500 active users

    console.log(`User ${user.full_name} (${userRole}) accessing ${assignableUsers.length} assignable users`);

    return new Response(JSON.stringify(assignableUsers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});