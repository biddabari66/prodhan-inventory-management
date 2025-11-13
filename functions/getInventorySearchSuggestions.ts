import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { search_term, limit = 5 } = await req.json();

    const suggestions = [];

    // 1. Get user's recent searches and interactions
    const recentInteractions = await base44.entities.UserInventoryInteraction.filter(
      { user_id: user.id },
      '-timestamp',
      10
    );

    const recentItems = recentInteractions
      .filter(i => i.item_id && i.item_name)
      .slice(0, 3)
      .map(i => ({
        type: 'recent',
        label: i.item_name,
        item_id: i.item_id,
        subtitle: 'Recently viewed'
      }));

    suggestions.push(...recentItems);

    // 2. Get popular items in user's department
    if (user.department) {
      const departmentInteractions = await base44.entities.UserInventoryInteraction.filter(
        { department: user.department },
        '-timestamp',
        50
      );

      const itemCounts = {};
      departmentInteractions.forEach(i => {
        if (i.item_id && i.item_name) {
          itemCounts[i.item_id] = itemCounts[i.item_id] || { name: i.item_name, count: 0 };
          itemCounts[i.item_id].count++;
        }
      });

      const popularItems = Object.entries(itemCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 2)
        .map(([id, data]) => ({
          type: 'popular',
          label: data.name,
          item_id: id,
          subtitle: `Popular in ${user.department}`
        }));

      suggestions.push(...popularItems);
    }

    // 3. If there's a search term, get AI-powered related suggestions
    if (search_term && search_term.trim()) {
      try {
        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `Given the inventory search term "${search_term}", suggest 3-5 closely related product names, categories, or search terms that would be relevant in a book publishing and e-commerce inventory system. Be concise and specific.
          
Return ONLY a JSON array of strings, like: ["Book A", "Category B", "Item C"]`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        if (aiResponse.suggestions && Array.isArray(aiResponse.suggestions)) {
          const aiSuggestions = aiResponse.suggestions.slice(0, 3).map(s => ({
            type: 'ai_related',
            label: s,
            subtitle: 'AI suggestion'
          }));
          suggestions.push(...aiSuggestions);
        }
      } catch (aiError) {
        console.error('AI suggestion error:', aiError);
      }
    }

    // 4. Get low stock items in user's department
    const lowStockItems = await base44.entities.Inventory.filter(
      {
        department: user.department,
        status: 'low_stock'
      },
      '-current_stock',
      3
    );

    const lowStockSuggestions = lowStockItems.map(item => ({
      type: 'low_stock',
      label: item.item_name,
      item_id: item.id,
      subtitle: '⚠️ Low stock alert',
      stock: item.current_stock
    }));

    suggestions.push(...lowStockSuggestions);

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.reduce((acc, curr) => {
      if (!acc.find(s => s.label === curr.label)) {
        acc.push(curr);
      }
      return acc;
    }, []).slice(0, limit);

    return Response.json({
      success: true,
      suggestions: uniqueSuggestions
    });

  } catch (error) {
    console.error('Error in getInventorySearchSuggestions:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});