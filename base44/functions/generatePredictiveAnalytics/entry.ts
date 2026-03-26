import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

/**
 * PRODUCTION-READY PREDICTIVE ANALYTICS with STRUCTURED JSON OUTPUT
 */

async function generatePredictionWithAI(prompt, analysisType) {
    // Try Gemini first with structured output
    if (GEMINI_API_KEY) {
        try {
            console.log('🤖 Attempting Gemini AI with structured JSON output...');
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            const structuredPrompt = `${prompt}

**CRITICAL: Your response MUST be a valid JSON object matching this exact structure:**
{
  "predicted_value": <number>,
  "confidence_level": <number 0-100>,
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "trend_direction": "up" or "down" or "stable"
}

Return ONLY the JSON object, no markdown, no explanations.`;

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: structuredPrompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        topK: 20,
                        topP: 0.8,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', response.status, errorText);
                throw new Error(`Gemini API failed: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!aiText) throw new Error('No content from Gemini');

            console.log('✅ Gemini response received, parsing JSON...');
            
            // Extract JSON from response
            let cleaned = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            
            // Find JSON object
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }
            
            const parsed = JSON.parse(cleaned);
            
            if (parsed.predicted_value !== undefined && parsed.confidence_level !== undefined) {
                console.log('✅ Gemini AI prediction successful');
                return parsed;
            }
            
            throw new Error('Gemini response missing required fields');

        } catch (geminiError) {
            console.error('⚠️ Gemini failed, trying OpenAI:', geminiError.message);
        }
    }

    // Fallback to OpenAI with JSON mode
    if (OPENAI_API_KEY) {
        try {
            console.log('🤖 Attempting OpenAI with JSON mode...');
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a business analyst. You ONLY output valid JSON objects matching the requested schema.'
                        },
                        {
                            role: 'user',
                            content: `${prompt}

Output format (JSON only):
{
  "predicted_value": <number>,
  "confidence_level": <number 0-100>,
  "key_factors": ["factor1", "factor2", "factor3"],
  "recommendations": ["rec1", "rec2"],
  "trend_direction": "up|down|stable"
}`
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 1024,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API failed: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.choices?.[0]?.message?.content;
            
            if (!aiText) throw new Error('No content from OpenAI');

            console.log('✅ OpenAI response received, parsing JSON...');
            const parsed = JSON.parse(aiText);
            
            if (parsed.predicted_value !== undefined && parsed.confidence_level !== undefined) {
                console.log('✅ OpenAI AI prediction successful');
                return parsed;
            }
            
            throw new Error('OpenAI response missing required fields');

        } catch (openaiError) {
            console.error('⚠️ OpenAI failed:', openaiError.message);
            throw openaiError;
        }
    }

    throw new Error('All AI providers failed');
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        console.log('📥 Request body:', JSON.stringify(body, null, 2));
        
        const { analysisType, historicalData } = body;
        
        if (!analysisType || !historicalData) {
            console.error('❌ Missing required parameters:', { analysisType, historicalData });
            throw new Error('Missing required parameters: analysisType and historicalData are required');
        }

        console.log(`📊 Generating ${analysisType} prediction...`);

        let prompt, staticFallback, fieldName;

        switch(analysisType) {
            case 'admissions':
                fieldName = 'predicted_admissions';
                prompt = `Analyze admission trends: Last 30 days: ${historicalData.last30Days} admissions, Last 7 days: ${historicalData.last7Days} admissions, Current leads: ${historicalData.currentLeads}, Active leads: ${historicalData.activeLeads}.

Predict next month's admissions. Be realistic based on trends.`;

                staticFallback = {
                    predicted_value: Math.round(historicalData.last30Days * 1.1),
                    confidence_level: 75,
                    key_factors: ["Historical admission patterns", "Current lead pipeline strength", "Seasonal enrollment trends"],
                    recommendations: ["Focus on converting qualified leads", "Prepare admission materials for peak season"],
                    trend_direction: "up"
                };
                break;
                
            case 'revenue':
                fieldName = 'predicted_revenue';
                prompt = `Analyze revenue trends: Total revenue (30d): ৳${historicalData.totalRevenue}, Daily average: ৳${historicalData.dailyAverage}, Transactions: ${historicalData.transactions}.

Forecast next month's revenue with realistic growth estimate.`;

                staticFallback = {
                    predicted_value: Math.round(historicalData.totalRevenue * 1.08),
                    confidence_level: 70,
                    key_factors: ["Historical revenue trends", "Current admission pipeline", "Course pricing strategy"],
                    recommendations: ["Maintain current pricing strategy", "Focus on high-value course packages"],
                    trend_direction: "up"
                };
                break;
                
            case 'expenses':
                fieldName = 'predicted_expenses';
                prompt = `Analyze expense patterns: Total expenses (30d): ৳${historicalData.totalExpenses}, Daily average: ৳${historicalData.dailyAverage}, Transactions: ${historicalData.transactions}.

Project next month's expenses based on historical patterns.`;

                staticFallback = {
                    predicted_value: Math.round(historicalData.totalExpenses * 1.05),
                    confidence_level: 80,
                    key_factors: ["Historical spending patterns", "Seasonal operational needs", "Current budget allocations"],
                    recommendations: ["Monitor budget variances closely", "Optimize recurring expenses"],
                    trend_direction: "up"
                };
                break;
                
            case 'inventory':
                fieldName = 'predicted_restock_items';
                prompt = `Analyze inventory: Total items: ${historicalData.totalItems}, Low stock items: ${historicalData.lowStockItems}, Out of stock: ${historicalData.outOfStock}.

Predict how many items will need restocking next month.`;

                staticFallback = {
                    predicted_value: historicalData.lowStockItems + 3,
                    confidence_level: 85,
                    key_factors: ["Current stock levels", "Historical consumption patterns", "Seasonal demand fluctuations"],
                    recommendations: ["Schedule restocking for low inventory items", "Review minimum stock thresholds"],
                    trend_direction: "stable"
                };
                break;
                
            default:
                throw new Error(`Invalid analysis type: ${analysisType}`);
        }

        // Try AI prediction
        try {
            const aiResult = await generatePredictionWithAI(prompt, analysisType);
            
            // Map the generic predicted_value to the specific field name
            const prediction = {
                [fieldName]: Math.round(aiResult.predicted_value),
                confidence_level: Math.min(100, Math.max(0, Math.round(aiResult.confidence_level))),
                key_factors: aiResult.key_factors.slice(0, 3),
                recommendations: aiResult.recommendations.slice(0, 3),
                trend_direction: aiResult.trend_direction
            };

            console.log('✅ Returning AI-generated prediction:', prediction);
            
            return Response.json({ 
                success: true, 
                prediction,
                source: 'ai'
            });

        } catch (aiError) {
            console.warn('⚠️ AI failed, using statistical fallback:', aiError.message);
            
            // Return static fallback with correct field name
            const fallbackPrediction = {
                [fieldName]: staticFallback.predicted_value,
                confidence_level: staticFallback.confidence_level,
                key_factors: staticFallback.key_factors,
                recommendations: staticFallback.recommendations,
                trend_direction: staticFallback.trend_direction
            };

            return Response.json({ 
                success: true, 
                prediction: fallbackPrediction,
                source: 'statistical'
            });
        }

    } catch (error) {
        console.error('❌ Predictive analytics error:', error);
        
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});