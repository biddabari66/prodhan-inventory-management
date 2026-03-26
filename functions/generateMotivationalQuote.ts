import OpenAI from 'npm:openai@4.28.0';

Deno.serve(async (req) => {
    try {
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not set.");
        }

        const openai = new OpenAI({ apiKey });

        const systemPrompt = `You are an AI that provides fresh, insightful, and inspiring motivational quotes. 
        You must respond with only a valid JSON object containing two keys: "quote" and "author".
        Do not provide common or cliche quotes. Focus on themes of innovation, growth, strategy, and perseverance.`;
        
        const userPrompt = `Provide a new motivational quote for an employee at an Ed-Tech company. The company values are innovation and strategic thinking.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 100,
            response_format: { type: "json_object" },
        });

        const quoteData = JSON.parse(completion.choices[0].message.content);

        return new Response(JSON.stringify(quoteData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error generating motivational quote:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});