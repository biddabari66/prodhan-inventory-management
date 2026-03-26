import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { leads, import_log_id } = await req.json();

        if (!leads || !import_log_id) {
            return new Response(JSON.stringify({ success: false, error: 'Missing leads or import log ID' }), { status: 400 });
        }

        const importLog = await base44.asServiceRole.entities.ImportLog.get(import_log_id);
        if (!importLog) {
            return new Response(JSON.stringify({ success: false, error: 'Import log not found' }), { status: 404 });
        }
        
        let successfulCount = importLog.successful_count || 0;
        let failedCount = importLog.failed_count || 0;
        let processedCount = importLog.processed_leads || 0;

        // Process each lead from the batch
        for (const lead of leads) {
            try {
                // Create the lead without duplicate checking
                await base44.asServiceRole.entities.Lead.create(lead);
                successfulCount++;
            } catch (error) {
                console.error('Failed to create lead:', error, lead);
                failedCount++;
            } finally {
                processedCount++;
                // Update progress every 10 leads for better performance
                if (processedCount % 10 === 0 || processedCount === leads.length) {
                    await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                        processed_leads: processedCount,
                        successful_count: successfulCount,
                        duplicate_count: 0, // No duplicate checking
                        failed_count: failedCount
                    });
                }
            }
        }

        // Final update to mark as completed
        await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
            status: 'completed',
            processed_leads: processedCount,
            successful_count: successfulCount,
            duplicate_count: 0, // No duplicate checking
            failed_count: failedCount
        });

        return new Response(JSON.stringify({ success: true, message: "Processing complete" }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bulk lead import error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});