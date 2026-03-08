import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    const url = 'https://satisfied-insight-spark-ai.base44.app/api/functions/receiveReview';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': '656fbd615f1540248c9a12f2a58c2c40'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return Response.json({ 
      success: response.ok, 
      status: response.status,
      data: responseData 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});