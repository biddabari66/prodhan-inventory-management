import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        // Initialize Base44 client from request
        const base44 = createClientFromRequest(req);

        // 1. Authenticate the user making the request
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Get the current user
        let user;
        try {
            user = await base44.auth.me();
            if (!user) {
                return new Response(JSON.stringify({ error: 'User not found' }), { 
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (e) {
            console.error('Authentication failed:', e);
            return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. If the user already has an Employee ID, return it
        if (user.employee_id) {
            return new Response(JSON.stringify({ 
                message: 'Employee ID already exists.',
                employee_id: user.employee_id 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 4. Generate a new unique Employee ID using service role
        const currentYear = new Date().getFullYear();
        const prefix = `BIDD-${currentYear}-`;

        let newEmployeeId;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                // Fetch all users with service role to ensure we have admin permissions
                const allUsers = await base44.asServiceRole.entities.User.list('-employee_id', 1000);
                
                // Filter users who have employee IDs for the current year
                const currentYearUsers = allUsers.filter(u => 
                    u.employee_id && u.employee_id.startsWith(prefix)
                );

                console.log(`Found ${currentYearUsers.length} users with ${currentYear} employee IDs`);

                // Find the highest sequence number
                let highestSequence = 0;
                
                currentYearUsers.forEach(u => {
                    if (u.employee_id && u.employee_id.startsWith(prefix)) {
                        // Extract the sequence number from the employee ID
                        const sequencePart = u.employee_id.replace(prefix, '');
                        const sequenceNum = parseInt(sequencePart, 10);
                        
                        if (!isNaN(sequenceNum) && sequenceNum > highestSequence) {
                            highestSequence = sequenceNum;
                        }
                    }
                });

                // Generate the next sequence number
                const nextSequence = highestSequence + 1;
                newEmployeeId = `${prefix}${String(nextSequence).padStart(4, '0')}`;

                console.log(`Generated Employee ID: ${newEmployeeId}`);

                // 5. Try to update the user with the new Employee ID using service role
                await base44.asServiceRole.entities.User.update(user.id, { 
                    employee_id: newEmployeeId 
                });

                console.log(`Successfully assigned Employee ID ${newEmployeeId} to user ${user.id}`);

                // 6. Return success response
                return new Response(JSON.stringify({ 
                    employee_id: newEmployeeId,
                    message: 'Employee ID generated and assigned successfully'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });

            } catch (updateError) {
                attempts++;
                console.error(`Attempt ${attempts} failed:`, updateError);

                // If it's a unique constraint violation or similar, try generating a new ID
                if (updateError.message && updateError.message.includes('duplicate') || 
                    updateError.message && updateError.message.includes('unique')) {
                    
                    console.log('Duplicate detected, retrying with next sequence...');
                    continue; // This will increment the sequence and try again
                }

                // If it's not a duplicate issue and we've tried multiple times, give up
                if (attempts >= maxAttempts) {
                    throw updateError;
                }

                // Wait a bit before retrying to avoid race conditions
                await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            }
        }

        // If we've exhausted all attempts
        throw new Error(`Failed to generate unique Employee ID after ${maxAttempts} attempts`);

    } catch (error) {
        console.error("Error in generateEmployeeId function:", error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to generate Employee ID', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});