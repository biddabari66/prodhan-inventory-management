import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import puppeteer from 'npm:puppeteer@23.11.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verify authentication
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { html } = await req.json();

        if (!html) {
            return new Response(JSON.stringify({ error: 'HTML content is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('🎨 Generating PDF from HTML...');

        // Launch headless browser
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set content with proper encoding
        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        // Generate PDF with optimized settings
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        console.log('✅ PDF generated successfully');

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=report.pdf'
            }
        });

    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate PDF',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});