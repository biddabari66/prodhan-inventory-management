import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const DELAY_BETWEEN_LEADS = 1500; // 1.5 seconds between each lead - very conservative
const PROGRESS_UPDATE_INTERVAL = 10; // Update progress every 10 processed leads
const MAX_RETRIES_PER_LEAD = 3;
const EXPONENTIAL_BACKOFF_BASE = 500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { leads, import_log_id } = await req.json();

        if (!leads || !import_log_id) {
            throw new Error('Missing leads or import log ID');
        }

        console.log(`🚀 Starting streaming import of ${leads.length} leads`);

        let processed = 0;
        let successful = 0;
        let duplicates = 0;
        let failed = 0;
        const errors = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            let leadProcessed = false;
            let retryCount = 0;

            // **RETRY LOGIC**: Each lead gets multiple attempts with exponential backoff
            while (!leadProcessed && retryCount < MAX_RETRIES_PER_LEAD) {
                try {
                    // **DUPLICATE CHECK**: Check if lead already exists (phone + course_interest)
                    const existingLeads = await base44.asServiceRole.entities.Lead.filter(
                        { 
                            phone: lead.phone, 
                            course_interest: lead.course_interest 
                        },
                        '-created_date',
                        1
                    );

                    if (existingLeads.length > 0) {
                        duplicates++;
                        console.log(`📝 Lead ${i + 1}: Duplicate found for ${lead.student_name}`);
                    } else {
                        await base44.asServiceRole.entities.Lead.create(lead);
                        successful++;
                        console.log(`✅ Lead ${i + 1}: Successfully created ${lead.student_name}`);
                    }
                    
                    leadProcessed = true;

                } catch (error) {
                    retryCount++;
                    const isRateLimit = error.message.toLowerCase().includes('rate');
                    
                    if (isRateLimit && retryCount < MAX_RETRIES_PER_LEAD) {
                        const backoffDelay = EXPONENTIAL_BACKOFF_BASE * Math.pow(2, retryCount - 1);
                        console.log(`⏳ Lead ${i + 1}: Rate limit hit, retrying in ${backoffDelay}ms (attempt ${retryCount})`);
                        await sleep(backoffDelay);
                    } else {
                        // Permanent failure
                        failed++;
                        errors.push(`${lead.student_name}: ${error.message}`);
                        console.log(`❌ Lead ${i + 1}: Failed permanently - ${error.message}`);
                        leadProcessed = true; // Move on to next lead
                    }
                }
            }

            processed++;

            // **REAL-TIME PROGRESS UPDATES**: Update the import log frequently
            if (processed % PROGRESS_UPDATE_INTERVAL === 0 || processed === leads.length) {
                await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                    processed_leads: processed,
                    successful_count: successful,
                    duplicate_count: duplicates,
                    failed_count: failed,
                    errors: errors,
                    status: processed === leads.length ? 'completed' : 'processing'
                });
                
                console.log(`📊 Progress: ${processed}/${leads.length} leads processed`);
            }

            // **CONSERVATIVE DELAY**: Always wait between leads to respect rate limits
            if (i < leads.length - 1) { // Don't delay after the last lead
                await sleep(DELAY_BETWEEN_LEADS);
            }
        }

        // **FINAL UPDATE**: Mark as completed
        await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
            status: 'completed',
            processed_leads: processed,
            successful_count: successful,
            duplicate_count: duplicates,
            failed_count: failed,
            errors: errors
        });

        console.log(`🎉 Import completed: ${successful} successful, ${duplicates} duplicates, ${failed} failed`);

        return new Response(JSON.stringify({ 
            success: true, 
            summary: { processed, successful, duplicates, failed }
        }), { status: 200 });

    } catch (error) {
        console.error('💥 Critical streaming import error:', error);
        
        // Mark import as failed
        if (import_log_id) {
            try {
                await base44.asServiceRole.entities.ImportLog.update(import_log_id, {
                    status: 'failed',
                    errors: [`Critical error: ${error.message}`]
                });
            } catch (updateError) {
                console.error('Failed to update import log:', updateError);
            }
        }

        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});