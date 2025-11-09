import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const BATCH_SIZE = 50; // How many leads to add to the queue at once
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second delay between each batch insertion

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    let base44;
    try {
        base44 = createClientFromRequest(req);
        const { leads, import_log_id } = await req.json();

        if (!leads || !import_log_id) {
            throw new Error('Missing leads or log ID');
        }

        // Get the parent ImportLog to get the import_id
        const importLog = await base44.asServiceRole.entities.ImportLog.get(import_log_id);
        if (!importLog) {
            throw new Error(`ImportLog with ID ${import_log_id} not found.`);
        }

        // **Throttled Batch Insertion into Queue**
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
            const batch = leads.slice(i, i + BATCH_SIZE);
            
            const queueItems = batch.map((lead, index) => ({
                import_id: importLog.import_id,
                lead_data: lead,
                sequence_number: i + index + 1
            }));
            
            // Use bulkCreate for efficiency
            await base44.asServiceRole.entities.LeadQueue.bulkCreate(queueItems);

            // Pause to avoid rate limiting
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }

        // Once the queue is fully populated, kick off the first processor
        await base44.functions.invoke('processSingleLead', { import_id: importLog.import_id });
        
        return new Response(JSON.stringify({ success: true, message: 'Queue populated successfully' }), { status: 200 });

    } catch (error) {
        console.error('CRITICAL Queue Population Error:', error);
        // Update the log to reflect the failure
        if (base44 && import_log_id) {
            await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                status: 'failed',
                errors: [...(log.errors || []), `Queue Population Failed: ${error.message}`]
            });
        }
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});