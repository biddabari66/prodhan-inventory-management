import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

/**
 * PRODUCTION-READY AI COURSE PROCESSOR with Biddabari JSON Structure Support
 */

// Helper to extract JSON from AI response with multiple strategies
function extractJSON(text) {
    // Strategy 1: Look for JSON array pattern
    const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
        try {
            return JSON.parse(jsonArrayMatch[0]);
        } catch (e) {
            console.warn('Strategy 1 failed:', e.message);
        }
    }

    // Strategy 2: Remove markdown code fences and try parsing
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn('Strategy 2 failed:', e.message);
    }

    // Strategy 3: Find first [ and last ]
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
            const extracted = text.substring(firstBracket, lastBracket + 1);
            return JSON.parse(extracted);
        } catch (e) {
            console.warn('Strategy 3 failed:', e.message);
        }
    }

    throw new Error('Could not extract valid JSON from AI response');
}

// Get raw course data from webhook
async function getRawCourseData(base44) {
    try {
        console.log('📡 Invoking getBiddabariCourses function...');
        
        // CRITICAL FIX: Properly handle the SDK response structure
        const { data, error } = await base44.functions.invoke('getBiddabariCourses', {});
        
        if (error) {
            console.error('SDK error from getBiddabariCourses:', error);
            throw new Error(`SDK error: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data) {
            throw new Error('No data returned from getBiddabariCourses');
        }
        
        console.log('✅ getBiddabariCourses response received:', {
            success: data.success,
            bytes_received: data.bytes_received || 0
        });
        
        if (!data.success) {
            throw new Error(data.error || 'getBiddabariCourses returned success=false');
        }
        
        if (!data.raw_response) {
            throw new Error('No raw_response in getBiddabariCourses data');
        }
        
        return data.raw_response;
        
    } catch (error) {
        console.error('❌ Error in getRawCourseData:', error);
        throw error;
    }
}

// Process with AI - Updated for Biddabari JSON structure
async function processWithAI(rawData) {
    const prompt = `You are a data extraction expert for Biddabari ERP. Extract course data from this JSON response.

**INPUT STRUCTURE:**
The data is a JSON array with one object containing a "data" property. Inside "data" is an array of course objects.

**FIELD MAPPING:**
- "title" → "course_name" (keep Bengali text as-is)
- "pricing.current" → "price" (convert string to number, remove any non-numeric characters)
- Determine "category" based on title content:
  * If title contains "প্রাইমারি" or "Primary" → "Primary Education"
  * If title contains "BCS" or "বিসিএস" → "BCS Preparation"
  * If title contains "ব্যাংক" or "Bank" → "Banking"
  * If title contains "NTRCA" or "এনটিআরসিএ" → "NTRCA"
  * Otherwise → "General Course"
- "description" → use first 150 characters as description

**CRITICAL OUTPUT FORMAT:**
Return ONLY a JSON array like this (no markdown, no explanations):
[{"course_name":"প্রাইমারি প্রধান শিক্ষক Success লাইভ ব্যাচ-৫","category":"Primary Education","price":2925,"description":"প্রাইমারি প্রধান শিক্ষক নিয়োগ পরীক্ষা অনুষ্ঠিত হওয়ার সম্ভাবনা রয়েছে"}]

**RAW DATA TO PROCESS:**
${rawData.substring(0, 20000)}`;

    // Try Gemini first
    if (GEMINI_API_KEY) {
        try {
            console.log('🤖 Attempting Gemini AI processing...');
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 1,
                        topP: 0.8,
                        maxOutputTokens: 8192,
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
            
            if (!aiText) {
                throw new Error('No content from Gemini');
            }

            console.log('✅ Gemini response received, extracting JSON...');
            const courses = extractJSON(aiText);
            
            if (Array.isArray(courses) && courses.length > 0) {
                console.log(`✅ Successfully extracted ${courses.length} courses from Gemini`);
                return courses;
            }
            
            throw new Error('Gemini returned invalid course array');

        } catch (geminiError) {
            console.error('⚠️ Gemini failed, trying OpenAI:', geminiError.message);
        }
    }

    // Fallback to OpenAI
    if (OPENAI_API_KEY) {
        try {
            console.log('🤖 Attempting OpenAI processing...');
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a data extraction expert. You ONLY output valid JSON arrays, nothing else. Preserve Bengali/Bangla text exactly as provided.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 8000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API failed: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.choices?.[0]?.message?.content;
            
            if (!aiText) {
                throw new Error('No content from OpenAI');
            }

            console.log('✅ OpenAI response received, extracting JSON...');
            const courses = extractJSON(aiText);
            
            if (Array.isArray(courses) && courses.length > 0) {
                console.log(`✅ Successfully extracted ${courses.length} courses from OpenAI`);
                return courses;
            }
            
            throw new Error('OpenAI returned invalid course array');

        } catch (openaiError) {
            console.error('⚠️ OpenAI failed:', openaiError.message);
            throw openaiError;
        }
    }

    throw new Error('All AI providers failed or not configured');
}

// Direct JSON parsing without AI (fallback strategy)
function directParseCoursesFromBiddabari(rawData) {
    try {
        console.log('🔧 Attempting direct JSON parsing from Biddabari structure...');
        console.log('Raw data length:', rawData?.length || 0);
        console.log('Raw data preview:', rawData?.substring(0, 200));
        
        const parsed = JSON.parse(rawData);
        
        // Handle structure: [{ data: [...courses] }]
        let coursesArray = [];
        
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
            coursesArray = parsed[0].data;
            console.log('✅ Found courses in parsed[0].data structure');
        } else if (Array.isArray(parsed)) {
            coursesArray = parsed;
            console.log('✅ Found courses in direct array structure');
        } else if (parsed.data && Array.isArray(parsed.data)) {
            coursesArray = parsed.data;
            console.log('✅ Found courses in parsed.data structure');
        }

        if (!Array.isArray(coursesArray) || coursesArray.length === 0) {
            throw new Error('No courses array found in JSON structure');
        }

        console.log(`✅ Found ${coursesArray.length} courses in JSON`);

        // Map to our schema
        const mappedCourses = coursesArray.map((course, index) => {
            try {
                // Determine category from title
                let category = 'General Course';
                const title = course.title || '';
                
                if (/প্রাইমারি|Primary/i.test(title)) category = 'Primary Education';
                else if (/BCS|বিসিএস/i.test(title)) category = 'BCS Preparation';
                else if (/ব্যাংক|Bank/i.test(title)) category = 'Banking';
                else if (/NTRCA|এনটিআরসিএ/i.test(title)) category = 'NTRCA';
                else if (/প্রকৌশল|Engineering/i.test(title)) category = 'Engineering';

                // Extract price from pricing.current string
                let price = 0;
                if (course.pricing && course.pricing.current) {
                    const priceStr = String(course.pricing.current).replace(/[^0-9]/g, '');
                    price = parseInt(priceStr) || 0;
                }

                // Create description from available data
                let description = course.description || '';
                if (description.length > 200) {
                    description = description.substring(0, 197) + '...';
                }

                return {
                    course_name: title.trim(),
                    category: category,
                    price: price,
                    description: description.trim() || 'No description available'
                };
            } catch (mappingError) {
                console.error(`Error mapping course at index ${index}:`, mappingError);
                return null;
            }
        }).filter(c => c !== null && c.course_name && c.price > 0); // Only valid courses

        console.log(`✅ Mapped ${mappedCourses.length} valid courses`);
        return mappedCourses;

    } catch (error) {
        console.error('Direct parsing failed:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        console.log('🚀 Starting course sync process...');
        
        const user = await base44.auth.me();
        console.log('✅ User authenticated:', user.email);

        if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
            console.warn('⚠️ No AI keys configured, will use direct JSON parsing only');
        }

        console.log('📡 Step 1/3: Fetching raw course data from webhook...');
        const rawData = await getRawCourseData(base44);

        if (!rawData || rawData.length < 50) {
            throw new Error(`Webhook returned insufficient data (length: ${rawData?.length || 0})`);
        }

        console.log(`✅ Received ${rawData.length} characters of raw data`);
        
        let cleanedCourses = [];

        // STRATEGY 1: Try direct JSON parsing first (fastest and most reliable)
        try {
            console.log('🔧 Step 2/3: Attempting direct JSON parsing...');
            cleanedCourses = directParseCoursesFromBiddabari(rawData);
            console.log(`✅ Direct parsing successful: ${cleanedCourses.length} courses extracted`);
        } catch (directError) {
            console.warn('⚠️ Direct parsing failed, falling back to AI processing:', directError.message);
            
            // STRATEGY 2: Fall back to AI if direct parsing fails
            if (GEMINI_API_KEY || OPENAI_API_KEY) {
                console.log('🤖 Step 2/3 (Fallback): Processing with AI...');
                cleanedCourses = await processWithAI(rawData);
                console.log(`✅ AI extracted ${cleanedCourses.length} courses`);
            } else {
                throw new Error(`Direct parsing failed and no AI keys configured. Error: ${directError.message}`);
            }
        }

        console.log('💾 Step 3/3: Saving courses to database...');

        // Validate each course before saving
        const validCourses = cleanedCourses.filter(course => {
            return course.course_name && 
                   typeof course.price === 'number' &&
                   course.price > 0 &&
                   course.category;
        }).map(course => ({
            course_name: course.course_name.trim(),
            category: course.category.trim(),
            price: Math.round(course.price),
            description: course.description?.trim() || 'No description available',
            status: 'Active',
            mode: 'Online'
        }));

        if (validCourses.length === 0) {
            throw new Error('No valid courses found after validation');
        }

        console.log(`💾 Attempting to save ${validCourses.length} courses...`);

        // Bulk create courses
        await base44.asServiceRole.entities.Course.bulkCreate(validCourses);

        console.log(`✅ Successfully saved ${validCourses.length} courses to database`);

        return Response.json({
            success: true,
            message: `Successfully synced ${validCourses.length} courses!`,
            data: {
                total_processed: cleanedCourses.length,
                total_saved: validCourses.length,
                sample: validCourses.slice(0, 3)
            }
        });

    } catch (error) {
        console.error('❌ CRITICAL AI COURSE SYNC ERROR:', error);
        console.error('Error stack:', error.stack);
        
        return Response.json({ 
            success: false, 
            error: 'Course sync failed', 
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});