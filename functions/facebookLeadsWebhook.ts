import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { createHmac } from 'node:crypto';

// Helper to normalize phone numbers
const normalizePhoneNumber = (phone) => {
    if (!phone) return null;
    let normalized = phone.toString().replace(/[^\d]/g, '');
    if (normalized.startsWith('880')) {
        normalized = '0' + normalized.slice(2);
    }
    return normalized.length >= 11 ? normalized.slice(-11) : null;
};

const validateFacebookSignature = (payload, signature, appSecret) => {
    if (!signature) {
        console.error("Signature is missing from the request!");
        return false;
    }
    const expectedSignature = `sha256=${createHmac('sha256', appSecret).update(payload, 'utf8').digest('hex')}`;
    return signature === expectedSignature;
};

const mapFacebookFormData = (formData) => {
    const mapping = {
        'full_name': 'student_name', 'name': 'student_name', 'student_name': 'student_name',
        'phone_number': 'phone', 'phone': 'phone',
        'email': 'email',
        'course_of_interest': 'course_interest', 'course_interest': 'course_interest', 'course': 'course_interest',
        'participated_bcs_exam': 'has_participated_bcs_exam', 'bcs_exam_experience': 'has_participated_bcs_exam', 'previous_bcs_exam': 'has_participated_bcs_exam',
        'comments': 'notes', 'additional_info': 'notes', 'notes': 'notes'
    };
    const mappedData = {};
    formData.forEach(field => {
        const fieldName = field.name?.toLowerCase().replace(/\s+/g, '_');
        const mappedFieldName = mapping[fieldName] || fieldName;
        if (mappedFieldName === 'has_participated_bcs_exam') {
            const value = field.values[0]?.toLowerCase();
            mappedData[mappedFieldName] = ['yes', 'হ্যাঁ', 'true', '1'].includes(value);
        } else {
            mappedData[mappedFieldName] = field.values[0] || '';
        }
    });
    return mappedData;
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const method = req.method;
        const url = new URL(req.url);

        if (method === 'GET') {
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');
            const VERIFY_TOKEN = Deno.env.get('FACEBOOK_WEBHOOK_VERIFY_TOKEN');
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('Facebook webhook verified successfully');
                return new Response(challenge, { status: 200 });
            } else {
                console.error('Facebook webhook verification failed');
                return new Response('Forbidden', { status: 403 });
            }
        }

        if (method === 'POST') {
            const body = await req.text();
            const signature = req.headers.get('x-hub-signature-256');
            const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
            if (!appSecret || !validateFacebookSignature(body, signature, appSecret)) {
                console.error('Invalid Facebook signature');
                return new Response('Unauthorized', { status: 401 });
            }

            const data = JSON.parse(body);
            for (const entry of data.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'leadgen') {
                        const leadgenData = change.value;
                        const mappedData = mapFacebookFormData(leadgenData.field_data || []);
                        const normalizedPhone = normalizePhoneNumber(mappedData.phone);
                        
                        if (!mappedData.student_name || !normalizedPhone) {
                            console.warn('Skipping lead due to missing name or invalid phone:', mappedData);
                            continue;
                        }

                        const importLog = {
                            facebook_lead_id: leadgenData.leadgen_id, facebook_form_id: leadgenData.form_id,
                            facebook_campaign_id: leadgenData.campaign_id, facebook_campaign_name: leadgenData.campaign_name,
                            facebook_ad_id: leadgenData.ad_id, facebook_ad_name: leadgenData.ad_name,
                            import_method: 'webhook', raw_data: leadgenData,
                        };

                        const leadData = {
                            student_name: mappedData.student_name, phone: normalizedPhone, email: mappedData.email || '',
                            course_interest: mappedData.course_interest || 'General Inquiry', lead_source: 'facebook_ads',
                            lead_status: 'new', lead_score: 75, facebook_lead_id: leadgenData.leadgen_id,
                            facebook_campaign_name: leadgenData.campaign_name, facebook_ad_name: leadgenData.ad_name,
                            campaign_name: leadgenData.campaign_name, has_participated_bcs_exam: !!mappedData.has_participated_bcs_exam,
                            notes: mappedData.notes || '', department: 'biddabari'
                        };
                        
                        try {
                            const createdLead = await base44.asServiceRole.entities.Lead.create(leadData);
                            await base44.asServiceRole.entities.FacebookLeadImport.create({
                                ...importLog, lead_id: createdLead.id, import_status: 'success'
                            });
                        } catch (error) {
                            console.error('Error creating lead:', error);
                            await base44.asServiceRole.entities.FacebookLeadImport.create({
                                ...importLog, import_status: 'failed', error_message: error.message
                            });
                        }
                    }
                }
            }
            return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
        }

        return new Response('Method not allowed', { status: 405 });
    } catch (error) {
        console.error('Facebook webhook error:', error);
        return new Response(JSON.stringify({ error: 'Webhook processing failed', message: error.message }), { status: 500 });
    }
});