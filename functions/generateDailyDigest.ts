
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import OpenAI from 'npm:openai@4.28.0';

Deno.serve(async (req) => {
    console.log('🔄 Daily Digest generation started');
    
    try {
        // Authenticate user first
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('❌ User authentication failed');
            throw new Error("User not authenticated");
        }

        console.log('✅ User authenticated:', user.email);

        // Parse request body
        let userDetails;
        try {
            const body = await req.json();
            userDetails = body.userDetails;
            console.log('📥 Request body parsed:', { userDetails });
        } catch (parseError) {
            console.error('❌ Failed to parse request body:', parseError);
            throw new Error("Invalid JSON in request body");
        }

        if (!userDetails) {
            console.error('❌ Missing userDetails in request');
            throw new Error("Missing 'userDetails' in the request body.");
        }

        // Check OpenAI API key
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            console.error('❌ OPENAI_API_KEY environment variable not set');
            throw new Error("OPENAI_API_KEY is not configured");
        }

        console.log('✅ OpenAI API key found');

        // Initialize OpenAI client
        let openai;
        try {
            openai = new OpenAI({ apiKey });
            console.log('✅ OpenAI client initialized');
        } catch (openaiError) {
            console.error('❌ Failed to initialize OpenAI client:', openaiError);
            throw new Error("Failed to initialize OpenAI client");
        }

        // Get REAL-TIME date information for Bangladesh
        const now = new Date();
        const options = { timeZone: 'Asia/Dhaka' };
        
        const currentDateTime = {
            fullDate: now.toLocaleDateString('en-US', { 
                ...options,
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
            }),
            dayOfWeek: now.toLocaleDateString('en-US', { ...options, weekday: 'long' }),
            time: now.toLocaleTimeString('en-US', { 
                ...options,
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true // Use AM/PM format
            }),
            month: now.toLocaleDateString('en-US', { ...options, month: 'long' }),
            date: new Date(now.toLocaleString("en-US", options)).getDate(),
            year: new Date(now.toLocaleString("en-US", options)).getFullYear(),
        };

        console.log('📅 Current Bangladesh time:', currentDateTime);

        const systemPrompt = `You are an AI assistant for the Bee ERP system. Generate a concise, positive, and encouraging daily digest for an employee. 

CRITICAL: Use the EXACT current date and time provided. Do not assume any day or date information.

Keep it brief (2-3 sentences), professional yet friendly, and motivational. Make it feel personalized and relevant to their role.`;

        const userPrompt = `Generate a daily digest for ${userDetails.full_name || 'the user'}.

CURRENT REAL-TIME INFORMATION:
- Today is: ${currentDateTime.dayOfWeek}
- Full date: ${currentDateTime.fullDate} 
- Current time: ${currentDateTime.time} (Bangladesh Time)
- The user's role is: ${userDetails.designation || 'employee'}

Create an encouraging message that:
1. References the CORRECT day of the week (${currentDateTime.dayOfWeek}) and time (${currentDateTime.time}).
2. Suggests focus areas appropriate for their role.
3. Is motivational and professional.

Do not mention any other day of the week except ${currentDateTime.dayOfWeek}.`;

        console.log('📝 Generating digest with OpenAI...');

        // Call OpenAI API with error handling
        let completion;
        try {
            completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 200,
            });
            console.log('✅ OpenAI API call successful');
        } catch (openaiApiError) {
            console.error('❌ OpenAI API call failed:', openaiApiError);
            
            // Provide fallback digest with correct date
            const bangladeshHour = new Date(now.toLocaleString("en-US", options)).getHours();
            const fallbackDigest = `Good ${bangladeshHour < 12 ? 'morning' : bangladeshHour < 17 ? 'afternoon' : 'evening'}, ${userDetails.full_name || 'there'}! Happy ${currentDateTime.dayOfWeek}! Today is ${currentDateTime.fullDate}. Let's make it a productive day filled with achievements and positive impact. Focus on your priorities and celebrate small wins along the way.`;
            
            console.log('⚠️ Using fallback digest with correct date');
            
            return new Response(JSON.stringify({ 
                digest: fallbackDigest,
                fallback: true,
                error: "OpenAI API unavailable, using fallback message",
                currentDate: currentDateTime
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Extract and clean the digest
        let digest = completion.choices[0]?.message?.content?.trim();
        
        if (!digest) {
            console.error('❌ Empty digest received from OpenAI');
            throw new Error("Empty response from OpenAI");
        }

        // Remove any markdown formatting
        digest = digest.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s?/g, '');

        console.log('✅ Digest generated successfully');

        return new Response(JSON.stringify({ 
            digest,
            generated_at: new Date().toISOString(),
            currentDate: currentDateTime
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('💥 Critical error in generateDailyDigest:', error);
        console.error('Error stack:', error.stack);
        
        // Return a structured error response
        return new Response(JSON.stringify({ 
            error: "Failed to generate digest",
            details: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
