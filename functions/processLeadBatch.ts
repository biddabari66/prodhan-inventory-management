import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// **PRODUCTION FIX**: Much longer delays between operations
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const SLEEP_MS_BETWEEN_WRITES = 200; // 200ms between each lead creation

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { batch, import_log_id } = await req.json();

        if (!batch || !import_log_id) {
            return new Response(JSON.stringify({ success: false, error: 'Missing batch or log ID' }), { status: 400 });
        }

        let successful = 0;
        let duplicates = 0;
        let failed = 0;
        const errorMessages = [];

        for (const leadData of batch) {
            try {
                // **FIX**: Check for duplicates by phone + course_interest as requested
                const existingLeads = await base44.asServiceRole.entities.Lead.filter({
                    phone: leadData.phone,
                    course_interest: leadData.course_interest
                }, '-created_date', 1);

                if (existingLeads.length > 0) {
                    duplicates++;
                    continue;
                }
                
                await base44.asServiceRole.entities.Lead.create(leadData);
                successful++;
                
                // **CRITICAL FIX**: Much longer pause between each lead creation
                await sleep(SLEEP_MS_BETWEEN_WRITES);

            } catch (createError) {
                failed++;
                const errorMessage = createError.message.toLowerCase().includes('rate') 
                    ? `Rate limit exceeded - pausing import` 
                    : createError.message;
                errorMessages.push(`Row for ${leadData.student_name || 'Unknown'}: ${errorMessage}`);
                
                // **FIX**: If we hit a rate limit, wait longer before continuing
                if (createError.message.toLowerCase().includes('rate')) {
                    await sleep(5000); // Wait 5 seconds if we hit rate limit
                }
            }
        }

        try {
            // **FIX**: More resilient log update with retry logic
            const log = await base44.asServiceRole.entities.ImportLog.get(import_log_id);
            
            const updatedCounts = {
                processed_leads: log.processed_leads + batch.length,
                successful_count: log.successful_count + successful,
                duplicate_count: log.duplicate_count + duplicates,
                failed_count: log.failed_count + failed,
                errors: [...(log.errors || []), ...errorMessages],
            };

            await base44.asServiceRole.entities.ImportLog.update(import_log_id, updatedCounts);
            
            // **FIX**: Properly mark import as completed when all leads are processed
            if (updatedCounts.processed_leads >= log.total_leads) {
                await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                    status: 'completed'
                });
            }

        } catch (logError) {
            console.error('Failed to update import log:', logError);
            // Don't fail the entire batch if log update fails
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('Error processing lead batch:', error);
        
        // **FIX**: Mark the import as failed if there's a critical error
        try {
            await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                status: 'failed'
            });
        } catch (updateError) {
            console.error('Failed to mark import as failed:', updateError);
        }
        
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});