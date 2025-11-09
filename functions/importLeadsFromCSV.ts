import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ success: false, error: 'No file provided' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const csvText = await file.text();
        console.log('CSV file received:', file.name, 'Size:', csvText.length, 'bytes');

        // Enhanced CSV parsing with better error handling
        const lines = csvText
            .split(/\r?\n/) // Handle both \r\n and \n line endings
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length < 2) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: `CSV must have headers and at least one data row. Found ${lines.length} lines.` 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Enhanced CSV parsing that handles quotes and commas better
        const parseCSVLine = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"' && !inQuotes) {
                    inQuotes = true;
                } else if (char === '"' && inQuotes) {
                    if (nextChar === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = false;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            return values;
        };

        // Parse headers with normalization
        const headerValues = parseCSVLine(lines[0]);
        const headers = headerValues.map(h => 
            h.toLowerCase()
             .trim()
             .replace(/['"]/g, '') // Remove quotes
             .replace(/\s+/g, '_') // Replace spaces with underscores
             .replace(/[^\w_]/g, '') // Remove special characters except underscore
        );
        
        console.log('Parsed headers:', headers);

        const allLeads = [];
        const errors = [];
        
        // Process each data row
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                
                if (values.length === 0 || (values.length === 1 && values[0] === '')) {
                    continue; // Skip empty rows
                }
                
                if (values.length !== headers.length) {
                    errors.push(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
                    continue;
                }

                const leadData = {};
                headers.forEach((header, index) => {
                    leadData[header] = values[index] ? values[index].replace(/['"]/g, '').trim() : '';
                });
                
                console.log(`Processing row ${i + 1}:`, leadData);

                // Enhanced field mapping - try multiple possible column names
                const getFieldValue = (possibleNames) => {
                    for (const name of possibleNames) {
                        if (leadData[name] && leadData[name].trim()) {
                            return leadData[name].trim();
                        }
                    }
                    return '';
                };

                // Map common field variations
                const studentName = getFieldValue([
                    'student_name', 'name', 'full_name', 'customer_name', 'lead_name'
                ]);
                
                const phone = getFieldValue([
                    'phone', 'phone_number', 'mobile', 'contact', 'telephone'
                ]);
                
                const courseInterest = getFieldValue([
                    'course_interest', 'course', 'interest', 'subject', 'program'
                ]);
                
                const email = getFieldValue([
                    'email', 'email_address', 'mail'
                ]);

                const createdDate = getFieldValue([
                    'created_date', 'date', 'created', 'timestamp', 'created_time'
                ]);

                const facebookAdName = getFieldValue([
                    'facebook_ad_name', 'ad_name', 'fb_ad_name'
                ]);

                const campaignName = getFieldValue([
                    'campaign_name', 'campaign', 'fb_campaign_name', 'facebook_campaign_name'
                ]);

                // BCS participation - handle multiple formats
                const bcsField = getFieldValue([
                    'has_participated_bcs_exam', 'bcs_exam', 'bcs', 'participated_bcs'
                ]);
                
                const bcsValue = bcsField.toLowerCase();
                const hasBCS = ['yes', 'হ্যাঁ', 'true', '1', 'participated'].some(val => 
                    bcsValue.includes(val.toLowerCase())
                );

                const notes = getFieldValue([
                    'notes', 'note', 'comment', 'comments', 'remarks'
                ]);

                // Validate required fields
                if (!studentName) {
                    errors.push(`Row ${i + 1}: Missing student name`);
                    continue;
                }

                if (!phone) {
                    errors.push(`Row ${i + 1}: Missing phone number`);
                    continue;
                }

                if (!courseInterest) {
                    errors.push(`Row ${i + 1}: Missing course interest`);
                    continue;
                }

                // Create the final lead object
                const finalLead = {
                    student_name: studentName,
                    phone: phone,
                    course_interest: courseInterest,
                    email: email || '',
                    created_date: createdDate || new Date().toISOString().split('T')[0],
                    facebook_ad_name: facebookAdName || '',
                    campaign_name: campaignName || '',
                    has_participated_bcs_exam: hasBCS,
                    notes: notes || '',
                    lead_source: 'csv_import',
                    lead_status: 'new',
                    lead_score: 50,
                    assigned_to: user.id,
                    department: user.department || 'biddabari'
                };

                console.log(`Valid lead created for row ${i + 1}:`, finalLead);
                allLeads.push(finalLead);

            } catch (rowError) {
                console.error(`Error processing row ${i + 1}:`, rowError);
                errors.push(`Row ${i + 1}: ${rowError.message}`);
            }
        }

        console.log(`Processing complete. Found ${allLeads.length} valid leads out of ${lines.length - 1} rows.`);

        if (allLeads.length === 0) {
            const detailedError = `No valid leads found in the file. 
            
Common issues:
- Missing required fields: student_name, phone, course_interest
- Check column headers match expected format
- Ensure data rows are not empty
            
Found headers: ${headers.join(', ')}
Processing errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (and ${errors.length - 5} more...)` : ''}`;
            
            return new Response(JSON.stringify({ 
                success: false, 
                error: detailedError 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create import log
        const importLog = await base44.asServiceRole.entities.ImportLog.create({
            import_id: crypto.randomUUID(),
            file_name: file.name,
            total_leads: allLeads.length,
            processed_leads: 0,
            successful_count: 0,
            duplicate_count: 0,
            failed_count: 0,
            status: 'processing',
            errors: errors.slice(0, 100), // Store first 100 errors
            created_by: user.id
        });

        console.log('Import log created:', importLog.id);

        // Start background processing
        try {
            await base44.functions.invoke('processBulkLeadImport', {
                leads: allLeads,
                import_log_id: importLog.id
            });
            console.log('Background processing started successfully');
        } catch (invokeError) {
            console.error('Failed to start background processing:', invokeError);
            // Update import log to failed status
            await base44.asServiceRole.entities.ImportLog.update(importLog.id, {
                status: 'failed',
                errors: [...errors, `Failed to start processing: ${invokeError.message}`]
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            importLogId: importLog.id,
            totalLeads: allLeads.length,
            errorsFound: errors.length
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Import start error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: `Import failed: ${error.message}` 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});