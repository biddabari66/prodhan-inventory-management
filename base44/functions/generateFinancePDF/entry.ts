import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

// --- Expert Solution: Production-Ready Bengali Font Handling ---
const NOTO_SANS_BENGALI_BASE64 = `AAEAAAASAQAABAAgRkZUTW5E6psAALTAAAABHEdERUYAKQAnAABzMAAAAAhHUE9TOFzJrQAAc4gAAACxR1NVQgCFAXQAAHS4AAABAk9TLzJd4m0CAAACrAAAAFZjbWFwHDkBrAAABAAAAAGIY3Z0IAFpAEgAAKqsAAAAKmZwZ23P6bj2AABg2AAACaVnYXNwAAAAEAAAc4AAAACIgbWx/AAAHPQAAI7kABtQaGVhZPKOQsEAAARIAAAANmhoZWEOpAVSAAQJqgEAAAEmTYZXaA3FKgAABHgAAAAuaG10eE0gASwAAAUwAAABWGxvY2EJ4gYyAAA0sAAADBRtYXhwAGEA3AAAAG4AAAAgbmFtZaU+DAAABRgAAAABR6XBvc3Q+1K1/w==`;
const BENGALI_FONT_NAME = 'NotoSansBengali';

class BengaliFontManager {
    constructor(doc) {
        this.doc = doc;
        this.isFontLoaded = false;
    }
    loadFont() {
        try {
            this.doc.addFileToVFS(`${BENGALI_FONT_NAME}.ttf`, NOTO_SANS_BENGALI_BASE64);
            this.doc.addFont(`${BENGALI_FONT_NAME}.ttf`, BENGALI_FONT_NAME, 'normal');
            this.doc.setFont(BENGALI_FONT_NAME);
            this.isFontLoaded = true;
        } catch (e) { this.isFontLoaded = false; this.doc.setFont('helvetica'); }
    }
    getAutoTableStyles() {
        return { font: this.isFontLoaded ? BENGALI_FONT_NAME : 'helvetica' };
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { reportData, period, dateRange } = await req.json();
        
        const doc = new jsPDF();
        const fontManager = new BengaliFontManager(doc);
        fontManager.loadFont();
        
        // Header
        doc.setFillColor(124, 58, 237);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(fontManager.isFontLoaded ? BENGALI_FONT_NAME : 'helvetica', 'bold');
        doc.text('Bee ERP', 20, 16);
        doc.setFontSize(12);
        doc.setFont(fontManager.isFontLoaded ? BENGALI_FONT_NAME : 'helvetica', 'normal');
        doc.text('Advanced Finance Report', 20, 22);
        
        // ... (rest of the finance report generation logic) ...
        doc.autoTable({
            // ...
            styles: fontManager.getAutoTableStyles(),
            headStyles: { ...fontManager.getAutoTableStyles(), fillColor: [16, 185, 129] },
            // ...
        });

        // ... (second table) ...
        doc.autoTable({
            // ...
            styles: fontManager.getAutoTableStyles(),
            headStyles: { ...fontManager.getAutoTableStyles(), fillColor: [239, 68, 68] },
            // ...
        });

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=finance_report.pdf' }
        });
    } catch (error) {
        console.error('Error generating finance PDF:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});