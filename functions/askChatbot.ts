import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🕵️ FELUDA - INTELLIGENT ERP DETECTIVE
 * Context-aware AI assistant using Base44's InvokeLLM
 * Named after the famous Bengali detective character
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

    console.log(`🕵️ [Feluda] User: ${user.full_name} | Question: ${message.substring(0, 100)}...`);

    // Use Base44's built-in InvokeLLM with internet context for intelligent responses
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: message,
      add_context_from_internet: false, // We provide our own ERP context
      response_json_schema: null // Free-form text response
    });

    if (!response) {
      throw new Error('No response from AI service');
    }

    console.log(`✅ [Feluda] Response generated successfully`);

    return Response.json({
      success: true,
      response: response
    });

  } catch (error) {
    console.error('❌ [Feluda] Error:', error);
    
    // Friendly fallback response
    const fallbackResponse = error.message?.includes('rate limit')
      ? 'I apologize, I\'m receiving too many questions at once. Please give me a moment and try again. 🙏'
      : 'I apologize for the inconvenience. I\'m having trouble processing your request right now. Please try again in a moment or rephrase your question. 🔍';
    
    return Response.json({
      success: false,
      response: fallbackResponse,
      error: error.message
    }, { status: 500 });
  }
});