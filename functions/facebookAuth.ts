import { createClient } from 'npm:@base44/sdk@0.1.0';

const APP_ID = Deno.env.get("FACEBOOK_APP_ID");
const APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET");
const API_VERSION = 'v20.0';

// Centralized error response helper
const errorResponse = (message, status = 500) => {
  console.error("Facebook Function Error:", message);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

Deno.serve(async (req) => {
  // All requests to a function should be POST
  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed', 405);
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (!action) {
      return errorResponse('No action specified in the request.', 400);
    }
    
    // Public action to get App ID for SDK initialization
    if (action === 'get_app_id') {
      if (!APP_ID) {
        return errorResponse("Facebook App ID is not configured on the server.", 500);
      }
      return new Response(JSON.stringify({ appId: APP_ID }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Authenticated actions below this point
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized: Missing Authorization header.', 401);
    
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    const user = await base44.auth.me();
    if (!user) return errorResponse('Unauthorized: Invalid token.', 401);

    // Main action dispatcher
    switch (action) {
      case 'exchange_token':
        const { accessToken } = body;
        if (!accessToken) return errorResponse('Access token is required for exchange.', 400);

        if (!APP_ID || !APP_SECRET) {
          return errorResponse("Facebook App Secret or ID is not configured on the server.", 500);
        }

        const tokenUrl = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${accessToken}`;
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) throw new Error(tokenData.error.message);

        return new Response(JSON.stringify(tokenData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      // Add other authenticated actions here in the future
      
      default:
        return errorResponse(`Invalid action: ${action}`, 400);
    }

  } catch (err) {
    return errorResponse(err.message || 'An internal server error occurred.');
  }
});