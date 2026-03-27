import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// Environment variables
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate time-based slot (10 slots per day, changes every 2.4 hours)
function getTimeSlot() {
    const now = new Date();
    const bangladeshTime = new Date(now.toLocaleString("en-US", { timeZone: 'Asia/Dhaka' }));
    const hours = bangladeshTime.getHours();
    const slot = Math.floor(hours / 2.4); // 0-9 slots throughout the day
    return slot;
}

function getTimeOfDay() {
    const now = new Date();
    const bangladeshTime = new Date(now.toLocaleString("en-US", { timeZone: 'Asia/Dhaka' }));
    const hours = bangladeshTime.getHours();
    
    if (hours < 6) return 'early_morning';
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    if (hours < 21) return 'evening';
    return 'night';
}

function getMotivationalPrompt(dashboardData, timeSlot, timeOfDay, userName) {
    const { tasksDueToday = 0, newLeadsToday = 0, pendingExpenses = 0 } = dashboardData;
    
    const timeContext = {
        early_morning: "as you start this early morning",
        morning: "this productive morning",
        afternoon: "this focused afternoon", 
        evening: "this accomplished evening",
        night: "as you wrap up tonight"
    };

    const basePrompt = `You are an elite executive coach and motivational strategist. Generate a unique, inspiring, and highly motivational insight for ${userName || 'this professional'} ${timeContext[timeOfDay]}.

CURRENT SITUATION:
- Tasks due today: ${tasksDueToday}
- New leads today: ${newLeadsToday}
- Pending expense approvals: ${pendingExpenses}
- Time of day: ${timeOfDay.replace('_', ' ')}
- Insight variation: #${timeSlot + 1} of 10 daily insights

REQUIREMENTS:
1. **Be UNIQUELY motivational** - avoid generic corporate speak
2. **Reference their specific situation** (task load, leads, etc.)
3. **Include actionable wisdom** - not just encouragement
4. **Make it personal and energizing**
5. **Keep it under 180 characters** for card display
6. **Use powerful, confident language**

TONE EXAMPLES:
- "Your ${tasksDueToday} tasks today are stepping stones to greatness. Each completion builds unstoppable momentum!"
- "Fresh energy, fresh opportunities! Channel today's clarity into breakthrough results."
- "${newLeadsToday} new connections await your expertise. Every conversation is a door to success!"
- "Peak performance hour! Your focused energy now creates tomorrow's victories."

Generate ONE unique motivational insight that energizes and inspires action:`;

    return basePrompt;
}

async function generateWithGemini(prompt) {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured.");
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                response_mime_type: "application/json", 
                temperature: 0.9, // Higher creativity
                maxOutputTokens: 150
            },
        })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Invalid response from Gemini.");

    return JSON.parse(text);
}

async function generateWithOpenAI(prompt) {
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an elite motivational coach. Respond ONLY with valid JSON in this format: {\"insight\": \"Your motivational message here\"}" },
                { role: "user", content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 100,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Invalid response from OpenAI.");

    return JSON.parse(text);
}

async function generateWithBase44LLM(prompt, base44) {
    const response = await base44.integrations.invoke('Core.InvokeLLM', {
        prompt,
        response_json_schema: {
            type: "object",
            properties: { insight: { type: "string" } },
            required: ["insight"]
        }
    });

    if (!response || !response.insight) throw new Error("Invalid response from Base44 LLM.");
    return response;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    
    try {
        const base44 = createClientFromRequest(req);
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { dashboardData, userName } = await req.json();
        
        const timeSlot = getTimeSlot();
        const timeOfDay = getTimeOfDay();
        const prompt = getMotivationalPrompt(dashboardData, timeSlot, timeOfDay, userName);
        
        let aiResult;
        let methodUsed;

        // Try OpenAI first (fastest and most creative)
        try {
            aiResult = await generateWithOpenAI(prompt);
            methodUsed = 'OpenAI GPT-4o-mini';
        } catch (openaiError) {
            console.warn("OpenAI failed, trying Gemini...", openaiError.message);
            try {
                aiResult = await generateWithGemini(prompt);
                methodUsed = 'Google Gemini';
            } catch (geminiError) {
                console.warn("Gemini failed, trying Base44 LLM...", geminiError.message);
                try {
                    aiResult = await generateWithBase44LLM(prompt, base44);
                    methodUsed = 'Base44 LLM';
                } catch (base44Error) {
                    console.error("All LLM providers failed.", base44Error.message);
                    throw new Error("All AI insight providers are currently unavailable.");
                }
            }
        }
        
        console.log(`Motivational insight generated with: ${methodUsed} (Slot ${timeSlot + 1}/10)`);

        return new Response(JSON.stringify({ 
            success: true, 
            insight: aiResult.insight,
            metadata: {
                method: methodUsed,
                timeSlot: timeSlot + 1,
                timeOfDay,
                generatedAt: new Date().toISOString()
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('AI insights generation error:', error.message);
        
        // Enhanced fallback insights based on context
        const { dashboardData } = await req.json().catch(() => ({}));
        const timeOfDay = getTimeOfDay();
        
        const contextualFallbacks = {
            early_morning: "Early momentum creates lasting success. Start strong, finish stronger!",
            morning: "Fresh energy, fresh possibilities. Your morning focus shapes the entire day!",
            afternoon: "Peak performance time! Channel your midday clarity into breakthrough results.",
            evening: "Evening excellence! Your consistent effort is building something remarkable.",
            night: "Night owl power! Late-hour dedication often yields the biggest breakthroughs."
        };
        
        const fallbackInsight = contextualFallbacks[timeOfDay] || "Your dedication and focus are the keys to extraordinary achievements. Keep pushing forward!";
        
        return new Response(JSON.stringify({ 
            success: true, 
            insight: fallbackInsight,
            fallback: true,
            metadata: {
                method: 'Contextual Fallback',
                timeOfDay,
                generatedAt: new Date().toISOString()
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});