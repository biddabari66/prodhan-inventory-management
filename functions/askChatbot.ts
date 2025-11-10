import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🤖 ENHANCED AI CHATBOT BACKEND
 * Context-aware AI assistant with Gemini integration
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message) {
      return Response.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    console.log(`🤖 [Chatbot] User: ${user.full_name} | Message: ${message.substring(0, 100)}...`);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('❌ GEMINI_API_KEY not set');
      return Response.json({
        success: false,
        error: 'AI service not configured'
      }, { status: 500 });
    }

    // Call Gemini API directly
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API Error:', geminiResponse.status, errorText);
      
      return Response.json({
        success: false,
        response: 'I apologize, but I encountered an issue processing your request. Please try rephrasing your question or try again in a moment.',
        error: 'AI service error'
      });
    }

    const geminiData = await geminiResponse.json();
    console.log('✅ Gemini Response:', JSON.stringify(geminiData).substring(0, 200));

    // Extract response
    let aiResponse = 'I apologize, but I couldn\'t generate a response. Please try again.';
    
    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const candidate = geminiData.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        aiResponse = candidate.content.parts[0].text;
      }
    }

    console.log(`✅ [Chatbot] Response generated successfully`);

    return Response.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('❌ [Chatbot] Error:', error);
    
    return Response.json({
      success: false,
      response: 'I apologize for the inconvenience. I\'m having trouble processing your request right now. Please try again in a moment.',
      error: error.message
    }, { status: 500 });
  }
});