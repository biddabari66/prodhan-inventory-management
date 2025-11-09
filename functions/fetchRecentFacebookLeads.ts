import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
        const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');
        
        if (!facebookAppId || !facebookAppSecret) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Facebook API credentials are not configured' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get app access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/oauth/access_token?client_id=${facebookAppId}&client_secret=${facebookAppSecret}&grant_type=client_credentials`
        );
        
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            throw new Error('Failed to get Facebook access token');
        }

        // Get recent leads (last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        // Note: This is a simplified version. In production, you'd need to:
        // 1. Store Facebook page IDs and form IDs in your database
        // 2. Query specific lead forms for each connected page
        // 3. Handle pagination for large result sets
        
        const pageId = 'YOUR_PAGE_ID'; // This should come from your Facebook integration setup
        const formId = 'YOUR_FORM_ID'; // This should come from your Facebook integration setup
        
        const leadsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formId}/leads?fields=id,created_time,field_data&since=${thirtyMinutesAgo}&access_token=${tokenData.access_token}`
        );
        
        const leadsData = await leadsResponse.json();
        
        if (leadsData.error) {
            throw new Error(`Facebook API error: ${leadsData.error.message}`);
        }

        const leads = leadsData.data || [];
        const processedLeads = [];
        
        // Check for existing leads to avoid duplicates
        const existingLeads = await base44.asServiceRole.entities.FacebookLeadImport.filter({
            import_method: 'background_sync'
        });
        const existingLeadIds = new Set(existingLeads.map(l => l.facebook_lead_id));

        for (const fbLead of leads) {
            if (existingLeadIds.has(fbLead.id)) {
                continue; // Skip already processed leads
            }
            
            // Extract lead data from Facebook field_data format
            const leadData = {};
            fbLead.field_data.forEach(field => {
                switch (field.name) {
                    case 'full_name':
                    case 'name':
                        leadData.student_name = field.values[0];
                        break;
                    case 'phone_number':
                    case 'phone':
                        leadData.phone = field.values[0];
                        break;
                    case 'email':
                        leadData.email = field.values[0];
                        break;
                }
            });

            // Create Lead entity
            try {
                const newLead = await base44.asServiceRole.entities.Lead.create({
                    student_name: leadData.student_name || 'Unknown',
                    phone: leadData.phone || '',
                    email: leadData.email || '',
                    lead_source: 'facebook_ads',
                    lead_status: 'new',
                    facebook_lead_id: fbLead.id,
                    course_interest: 'General Inquiry',
                    notes: `Auto-imported via background sync at ${new Date().toISOString()}`
                });

                // Log the import
                await base44.asServiceRole.entities.FacebookLeadImport.create({
                    facebook_lead_id: fbLead.id,
                    lead_id: newLead.id,
                    import_method: 'background_sync',
                    import_status: 'success',
                    raw_data: fbLead
                });

                processedLeads.push(newLead);
            } catch (leadError) {
                console.error('Failed to create lead:', leadError);
                
                // Log the failed import
                await base44.asServiceRole.entities.FacebookLeadImport.create({
                    facebook_lead_id: fbLead.id,
                    import_method: 'background_sync',
                    import_status: 'failed',
                    error_message: leadError.message,
                    raw_data: fbLead
                });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Processed ${processedLeads.length} new leads from Facebook`,
            leads_processed: processedLeads.length,
            leads_found: leads.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Facebook leads fetch error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});