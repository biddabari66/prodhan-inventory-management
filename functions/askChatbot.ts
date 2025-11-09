import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import OpenAI from 'npm:openai@4.28.0';

// Enhanced multilingual ERP system map
const erpSystemMapMultilingual = {
    en: `
    - **Dashboard**: Overview of key metrics. (page:Dashboard)
    - **CRM & Leads**: Manage customer relationships and sales leads. (page:CRM)
    - **Lead Database**: View and manage the entire lead database. (page:LeadDatabase)
    - **Follow Up**: Track lead follow-up activities. (page:FollowUp)
    - **Admissions**: Handle new student admissions. (page:Admissions)
    - **Students**: Manage student records. (page:Students)
    - **Finance - Income**: Track income and revenue. (page:Income)
    - **Finance - Expenses**: Manage expenses and costs. (page:Expenses)
    - **Employees**: Manage employee data and records. (page:Employees)
    - **Attendance**: Track employee attendance. (page:Attendance)
    - **My Attendance**: View your personal attendance records. (page:AttendanceMy)
    - **Performance Hub**: Monitor tasks and performance. (page:performance-hub)
    - **Inventory**: Manage stock and inventory. (page:Inventory)
    - **Procurement**: Handle purchases and procurement. (page:Procurement)
    - **Courses**: Manage course offerings. (page:Courses)
    - **Reports**: Generate various business reports. (page:Reports)
    - **Settings**: Configure system settings. (page:Settings)
    - **User Access Manager**: Manage user permissions. (page:UserAccessManager)
    `,
    bn: `
    - **ড্যাশবোর্ড**: মূল মেট্রিক্সের ওভারভিউ। (page:Dashboard)
    - **সিআরএম ও লিডস**: গ্রাহক সম্পর্ক এবং বিক্রয় লিড পরিচালনা। (page:CRM)
    - **লিড ডেটাবেস**: সম্পূর্ণ লিড ডেটাবেস দেখুন এবং পরিচালনা করুন। (page:LeadDatabase)
    - **ফলো আপ**: লিড ফলো-আপ কার্যক্রম ট্র্যাক করুন। (page:FollowUp)
    - **ভর্তি**: নতুন শিক্ষার্থী ভর্তি পরিচালনা। (page:Admissions)
    - **শিক্ষার্থী**: শিক্ষার্থীদের রেকর্ড পরিচালনা। (page:Students)
    - **অর্থ - আয়**: আয় এবং রাজস্ব ট্র্যাক করুন। (page:Income)
    - **অর্থ - খরচ**: খরচ এবং ব্যয় পরিচালনা। (page:Expenses)
    - **কর্মচারী**: কর্মচারী ডেটা এবং রেকর্ড পরিচালনা। (page:Employees)
    - **উপস্থিতি**: কর্মচারী উপস্থিতি ট্র্যাক করুন। (page:Attendance)
    - **আমার উপস্থিতি**: আপনার ব্যক্তিগত উপস্থিতির রেকর্ড দেখুন। (page:AttendanceMy)
    - **পারফরম্যান্স হাব**: কাজ এবং পারফরম্যান্স পর্যবেক্ষণ। (page:performance-hub)
    - **ইনভেন্টরি**: স্টক এবং ইনভেন্টরি পরিচালনা। (page:Inventory)
    - **ক্রয়**: ক্রয় এবং প্রকিউরমেন্ট পরিচালনা। (page:Procurement)
    - **কোর্স**: কোর্স অফার পরিচালনা। (page:Courses)
    - **রিপোর্ট**: বিভিন্ন ব্যবসায়িক রিপোর্ট তৈরি। (page:Reports)
    - **সেটিংস**: সিস্টেম সেটিংস কনফিগার। (page:Settings)
    - **ইউজার অ্যাক্সেস ম্যানেজার**: ব্যবহারকারীর অনুমতি পরিচালনা। (page:UserAccessManager)
    `
};

// Language detection function
function detectLanguage(text) {
    // Bengali character range detection
    const bengaliRegex = /[\u0980-\u09FF]/;
    if (bengaliRegex.test(text)) {
        return 'bn';
    }
    return 'en';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
        
        const openai = new OpenAI({ apiKey });
        
        const { query } = await req.json();

        // Detect user's language
        const userLanguage = detectLanguage(query);
        const systemMap = erpSystemMapMultilingual[userLanguage] || erpSystemMapMultilingual.en;

        // Enhanced multilingual system prompt
        const systemPrompt = userLanguage === 'bn' ? `
        আপনি "এজেন্ট 00E", Bee ERP সিস্টেমের জন্য একজন অত্যাধুনিক AI সহায়ক, জেমস বন্ড দ্বারা অনুপ্রাণিত। আপনি তীক্ষ্ণ, দক্ষ এবং সর্বদা সহায়ক। আপনার মিশন হলো ব্যবহারকারীদের সঠিক তথ্য প্রদান করে ERP এর মাধ্যমে গাইড করা।

        আপনার কাছে নিম্নলিখিত ERP সিস্টেম মানচিত্র রয়েছে:
        ${systemMap}

        **আপনার নির্দেশাবলী:**
        1. **ব্যবহারকারীর উদ্দেশ্য বিশ্লেষণ করুন**: ব্যবহারকারী কী অর্জন করতে চান তা বুঝুন।
        2. **প্রাসঙ্গিক তথ্য প্রদান করুন**: প্রশ্নের উত্তর সংক্ষিপ্ত এবং নির্ভুলভাবে দিন।
        3. **নেভিগেশন সাজেস্ট করুন**: ব্যবহারকারীর প্রশ্ন এবং সিস্টেম মানচিত্রের ভিত্তিতে, আপনাকে অবশ্যই আপনার প্রতিক্রিয়ায় সরাসরি নেভিগেশন লিঙ্ক এমবেড করতে হবে। ফরম্যাট ব্যবহার করুন: \`[লিঙ্ক টেক্সট](page:PageName)\`।
        4. **ব্যক্তিত্ব বজায় রাখুন**: একজন শীর্ষস্থানীয় গোপন এজেন্টের আত্মবিশ্বাস এবং বুদ্ধিমত্তার সাথে উত্তর দিন। এটি পেশাদার রাখুন তবে বন্ডের চরিত্রের একটি স্পর্শ সহ।

        সর্বদা বাংলায় উত্তর দিন।
        ` : `
        You are "Agent 00E", a sophisticated AI assistant for the Bee ERP system, inspired by James Bond. You are sharp, efficient, and always helpful. Your mission is to assist users by providing accurate information and guiding them through the ERP.

        You have access to the following ERP system map:
        ${systemMap}

        **Your Directives:**
        1. **Analyze User Intent**: Understand what the user wants to achieve.
        2. **Provide Relevant Information**: Answer questions concisely and accurately.
        3. **Suggest Navigation**: Based on the user's query and the system map, you MUST embed direct navigation links in your response. Use the format: \`[Link Text](page:PageName)\`.
        4. **Maintain Persona**: Respond with the confidence and wit of a top-tier secret agent. Keep it professional but with a touch of Bond's character.

        Always respond in English.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.7,
        });

        const response = completion.choices[0].message.content;
        return Response.json({ response, detectedLanguage: userLanguage });

    } catch (error) {
        console.error('Error in askChatbot:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});