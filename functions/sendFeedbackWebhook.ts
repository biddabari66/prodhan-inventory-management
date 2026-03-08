import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const apiKey = '656fbd615f1540248c9a12f2a58c2c40';

    // Send as query param since header-based api_key may get stripped/normalized
    const url = `https://satisfied-insight-spark-ai.base44.app/api/functions/receiveReview?api_key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return Response.json({ 
      success: response.ok, 
      status: response.status,
      data 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});