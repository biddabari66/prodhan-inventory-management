import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // 1. Fetch all inventory products
    const inventory = await base44.asServiceRole.entities.Inventory.filter({
      department: 'prodhan_com_e_commerce'
    });

    console.log(`📦 Fetched ${inventory.length} inventory items`);

    // 2. Get spreadsheet ID from env or payload, or create a new one
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    let spreadsheetId = Deno.env.get('GOOGLE_SHEET_INVENTORY_ID') || body.spreadsheet_id || null;

    // Extract ID from full URL if user pasted a URL instead of just the ID
    if (spreadsheetId && spreadsheetId.includes('docs.google.com')) {
      const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (match) spreadsheetId = match[1];
    }
    
    // Trim any whitespace
    if (spreadsheetId) spreadsheetId = spreadsheetId.trim();

    if (!spreadsheetId) {
      // Create a new spreadsheet
      console.log('📝 Creating new Google Sheet...');
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'Prodhan.com - AI Chatbot Product Database'
          },
          sheets: [{
            properties: {
              title: 'Products',
              gridProperties: { frozenRowCount: 1 }
            }
          }]
        })
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('Failed to create sheet:', err);
        return Response.json({ error: 'Failed to create Google Sheet', details: err }, { status: 500 });
      }

      const sheetData = await createRes.json();
      spreadsheetId = sheetData.spreadsheetId;
      console.log(`✅ Created NEW spreadsheet: ${spreadsheetId}`);
      console.log(`⚠️ IMPORTANT: Set GOOGLE_SHEET_INVENTORY_ID secret to "${spreadsheetId}" for future runs`);
    } else {
      console.log(`📄 Using existing spreadsheet: ${spreadsheetId}`);
    }

    // 2b. Get or create the "Products" sheet tab
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    let sheetTabName = 'Sheet1';
    let sheetTabId = 0;
    
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheets = meta.sheets || [];
      const productsSheet = sheets.find(s => s.properties?.title === 'Products');
      if (productsSheet) {
        sheetTabName = 'Products';
        sheetTabId = productsSheet.properties.sheetId;
      } else if (sheets.length > 0) {
        // Rename first sheet to "Products"
        sheetTabId = sheets[0].properties.sheetId;
        const oldName = sheets[0].properties.title;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              updateSheetProperties: {
                properties: { sheetId: sheetTabId, title: 'Products' },
                fields: 'title'
              }
            }]
          })
        });
        sheetTabName = 'Products';
        console.log(`📋 Renamed tab "${oldName}" → "Products"`);
      }
    }

    // 3. Prepare headers and data rows
    const headers = [
      'Product ID',
      'Product Name',
      'Product Name (English)',
      'Category',
      'Subject',
      'Current Stock',
      'Stock Status',
      'Selling Price (BDT)',
      'Purchase Price (BDT)',
      'Author',
      'Publisher',
      'Edition',
      'Format',
      'Total Pages',
      'ISBN',
      'Weight (kg)',
      'Description',
      'Tags',
      'Is Bundle',
      'Bundle Items Count',
      'Color Variants',
      'Product Variants',
      'Academic Relevance',
      'Featured',
      'Web Visible',
      'SEO Keywords',
      'Last Updated'
    ];

    const now = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });

    const rows = inventory.map(item => {
      const stockStatus = (item.current_stock || 0) === 0 ? 'Out of Stock' :
        (item.current_stock || 0) <= (item.minimum_stock || 0) ? 'Low Stock' : 'In Stock';

      const colorVariants = (item.color_variants || []).map(v => v.color).filter(Boolean).join(', ');
      const productVariants = (item.product_variants || []).map(v => v.variant_name).filter(Boolean).join(', ');
      const tags = (item.tags || []).join(', ');
      const seoKeywords = (item.seo_keywords || []).join(', ');
      const bundleCount = item.is_bundle ? (item.bundle_items || []).length : 0;

      return [
        item.id || '',
        item.item_name || '',
        item.english_item_name || '',
        item.category || '',
        item.subject || '',
        item.current_stock || 0,
        stockStatus,
        item.selling_price || 0,
        item.purchase_price || 0,
        item.author_name || '',
        item.publications_name || '',
        item.edition || '',
        item.format || '',
        item.total_page || '',
        item.isbn || item.isbn_13 || '',
        item.weight_kg || '',
        (item.description || '').substring(0, 500),
        tags,
        item.is_bundle ? 'Yes' : 'No',
        bundleCount,
        colorVariants,
        productVariants,
        item.academic_relevance || '',
        item.featured ? 'Yes' : 'No',
        item.web_visibility !== false ? 'Yes' : 'No',
        seoKeywords,
        now
      ];
    });

    // 4. Clear existing data and write fresh data
    console.log('🧹 Clearing existing sheet data...');
    
    // Clear the sheet
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A1:AA10000:clear`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!clearRes.ok) {
      const err = await clearRes.text();
      console.error('Failed to clear sheet:', err);
    }

    // Write headers + data
    const allRows = [headers, ...rows];
    
    console.log(`📝 Writing ${allRows.length} rows (1 header + ${rows.length} products)...`);

    // Google Sheets API has a limit, batch in chunks of 1000
    const BATCH_SIZE = 1000;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const startRow = i + 1;
      const endRow = startRow + batch.length - 1;
      const range = `Products!A${startRow}:AA${endRow}`;

      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: range,
            majorDimension: 'ROWS',
            values: batch
          })
        }
      );

      if (!writeRes.ok) {
        const err = await writeRes.text();
        console.error(`Failed to write batch at row ${startRow}:`, err);
        return Response.json({ error: 'Failed to write data to sheet', details: err }, { status: 500 });
      }

      console.log(`✅ Wrote rows ${startRow}-${endRow}`);
    }

    // 5. Format the header row (bold, freeze, color)
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.86, green: 0.15, blue: 0.15 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 27 }
            }
          }
        ]
      })
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    console.log(`✅ Sync complete! ${rows.length} products updated. Sheet: ${sheetUrl}`);

    return Response.json({
      success: true,
      products_synced: rows.length,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: sheetUrl,
      synced_at: now
    });

  } catch (error) {
    console.error('❌ Error syncing inventory to Google Sheets:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});