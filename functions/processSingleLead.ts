import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    let base44;
    try {
        base44 = createClientFromRequest(req);
        const { import_id } = await req.json();

        if (!import_id) {
            return new Response(JSON.stringify({ success: false, error: 'Missing import ID' }), { status: 400 });
        }

        // Get the next pending lead from the queue
        const pendingLeads = await base44.asServiceRole.entities.LeadQueue.filter(
            { import_id, status: 'pending' }, 
            'sequence_number', 
            1
        );

        if (pendingLeads.length === 0) {
            // No more leads to process, mark the entire import as completed
            const importLogs = await base44.asServiceRole.entities.ImportLog.filter({ import_id });
            if (importLogs.length > 0) {
                await base44.asServiceRole.entities.ImportLog.update(importLogs[0].id, { status: 'completed' });
            }
            return new Response(JSON.stringify({ success: true, message: 'Import completed' }), { status: 200 });
        }

        const queueItem = pendingLeads[0];
        await base44.asServiceRole.entities.LeadQueue.update(queueItem.id, { status: 'processing' });
        
        let success = false;
        let isDuplicate = false;
        let errorMessage = null;

        try {
            const { lead_data } = queueItem;
            const existingLeads = await base44.asServiceRole.entities.Lead.filter(
                { phone: lead_data.phone, course_interest: lead_data.course_interest },
                '-created_date',
                1
            );

            if (existingLeads.length > 0) {
                isDuplicate = true;
            } else {
                await base44.asServiceRole.entities.Lead.create(lead_data);
            }
            success = true;

        } catch (createError) {
            console.error(`Failed to process lead ${queueItem.id}:`, createError);
            errorMessage = createError.message;

            if (createError.message.toLowerCase().includes('rate') && (queueItem.retry_count || 0) < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS);
                await base44.asServiceRole.entities.LeadQueue.update(queueItem.id, {
                    status: 'pending',
                    retry_count: (queueItem.retry_count || 0) + 1
                });
                
                // Re-trigger itself after a delay
                setTimeout(() => base44.functions.invoke('processSingleLead', { import_id }), RETRY_DELAY_MS);
                return new Response(JSON.stringify({ success: true, retried: true }), { status: 200 });
            }
        }
        
        await base44.asServiceRole.entities.LeadQueue.update(queueItem.id, {
            status: 'completed',
            error_message: errorMessage
        });

        // Update the central import log
        const importLogs = await base44.asServiceRole.entities.ImportLog.filter({ import_id });
        if (importLogs.length > 0) {
            const log = importLogs[0];
            await base44.asServiceRole.entities.ImportLog.update(log.id, {
                processed_leads: (log.processed_leads || 0) + 1,
                successful_count: success && !isDuplicate ? (log.successful_count || 0) + 1 : (log.successful_count || 0),
                duplicate_count: isDuplicate ? (log.duplicate_count || 0) + 1 : (log.duplicate_count || 0),
                failed_count: !success ? (log.failed_count || 0) + 1 : (log.failed_count || 0),
                errors: errorMessage ? [...(log.errors || []), `${queueItem.lead_data.student_name}: ${errorMessage}`] : (log.errors || [])
            });
        }
        
        // **Crucial**: Trigger the next item in the queue
        setTimeout(() => base44.functions.invoke('processSingleLead', { import_id }), 100); // Small delay to yield execution

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('CRITICAL Single Lead Processing Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});