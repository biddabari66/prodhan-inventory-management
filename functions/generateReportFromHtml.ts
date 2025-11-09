
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Determines if a value is numeric
 */
function isNumeric(value) {
    if (value === null || value === undefined || value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

/**
 * Formats a cell value - returns as-is for text, or formats as number
 */
function formatCellValue(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    
    if (isNumeric(value)) {
        return parseFloat(value).toFixed(2);
    }
    
    // Return text as-is
    return String(value);
}

/**
 * Generates a beautiful, print-optimized HTML report with Bengali font support
 * This HTML is designed to be printed directly to PDF by the browser
 */
function generatePrintableReportHTML(reports, templatesMap, userMap, department = null) {
    // Generate individual report sections
    const reportSections = reports.map((report, index) => {
        const template = templatesMap.get(report.template_id);
        if (!template) return '';

        const submitter = userMap.get(report.submitted_by_id);
        const reportDate = new Date(report.report_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Calculate table data - handle both text and numbers
        const tableRows = template.rows.map((row, rowIndex) => {
            let rowTotal = 0;
            let hasNumericValues = false;
            
            const cellData = template.columns.map((col, colIndex) => {
                const rawValue = report.data?.[`${rowIndex}_${colIndex}`];
                
                if (isNumeric(rawValue)) {
                    const value = parseFloat(rawValue);
                    rowTotal += value;
                    hasNumericValues = true;
                    return { value: rawValue, isNumeric: true };
                }
                
                return { value: rawValue, isNumeric: false };
            });
            
            return { row, cellData, rowTotal, hasNumericValues };
        });

        // Calculate column totals - only for numeric columns
        const columnInfo = template.columns.map((_, colIndex) => {
            let total = 0;
            let isNumericColumn = false;
            
            tableRows.forEach(row => {
                const cell = row.cellData[colIndex];
                if (cell && cell.isNumeric) {
                    total += parseFloat(cell.value || 0);
                    isNumericColumn = true;
                }
            });
            
            return { total, isNumeric: isNumericColumn };
        });

        const grandTotal = columnInfo.reduce((sum, col) => sum + (col.isNumeric ? col.total : 0), 0);

        const pageBreak = index < reports.length - 1 ? '<div class="page-break"></div>' : '';

        return `
        <div class="report-page">
            <div class="report-header">
                <div class="logo-section">
                    <h1 class="company-name">🐝 Bee ERP</h1>
                    <p class="company-tagline">Business Management System</p>
                </div>
                <div class="report-info">
                    <h2 class="report-title">${template.template_name}</h2>
                    <div class="report-meta">
                        <div class="meta-row">
                            <span class="meta-label">Submitted by:</span>
                            <span class="meta-value">${submitter?.display_name || submitter?.full_name || report.submitted_by_name}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Report Date:</span>
                            <span class="meta-value">${reportDate}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Department:</span>
                            <span class="meta-value">${report.department ? report.department.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value status-badge">${report.status ? report.status.replace(/_/g, ' ').toUpperCase() : 'SUBMITTED'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="report-content">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="col-index">#</th>
                            <th class="col-item">Items</th>
                            ${template.columns.map(col => `<th class="col-data">${col}</th>`).join('')}
                            <th class="col-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows.map((rowData, idx) => `
                            <tr>
                                <td class="col-index">${idx + 1}</td>
                                <td class="col-item">${rowData.row}</td>
                                ${rowData.cellData.map(cell => {
                                    const displayValue = formatCellValue(cell.value);
                                    const textAlign = cell.isNumeric ? 'center' : 'left';
                                    return `<td class="col-data" style="text-align: ${textAlign}; ${!cell.isNumeric ? 'white-space: pre-wrap; max-width: 200px;' : ''}">${displayValue}</td>`;
                                }).join('')}
                                <td class="col-total">${rowData.hasNumericValues ? rowData.rowTotal.toFixed(2) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td class="col-index">∑</td>
                            <td class="col-item">GRAND TOTAL</td>
                            ${columnInfo.map(col => 
                                `<td class="col-data">${col.isNumeric ? col.total.toFixed(2) : '-'}</td>`
                            ).join('')}
                            <td class="col-total">${grandTotal.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                ${report.notes ? `
                <div class="report-notes">
                    <h3 class="notes-title">📝 Report Notes</h3>
                    <p class="notes-content">${report.notes}</p>
                </div>
                ` : ''}
            </div>

            <div class="report-footer">
                <div class="footer-line"></div>
                <p class="footer-text">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p class="footer-subtext">This is a computer-generated report from Bee ERP System</p>
            </div>
        </div>
        ${pageBreak}
        `;
    }).join('');

    const title = department 
        ? `${department.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Department Reports`
        : reports.length === 1 
            ? templatesMap.get(reports[0].template_id)?.template_name || 'Report'
            : 'Multiple Reports';

    return `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${new Date().toLocaleDateString()}</title>
    
    <!-- Bengali Font from Google Fonts - Optimized for Print -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    
    <style>
        /* ========================================
           RESET & BASE STYLES
           ======================================== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            height: 100%;
        }
        
        body {
            font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: #ffffff;
            font-size: 10pt;
        }

        /* ========================================
           PAGE LAYOUT
           ======================================== */
        .report-page {
            width: 100%;
            max-width: 210mm; /* A4 width */
            margin: 0 auto;
            padding: 15mm;
            background: white;
            page-break-after: always;
        }

        .report-page:last-child {
            page-break-after: auto;
        }

        .page-break {
            page-break-after: always;
            height: 0;
            margin: 0;
            padding: 0;
        }

        /* ========================================
           HEADER STYLES
           ======================================== */
        .report-header {
            margin-bottom: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }

        .logo-section {
            text-align: center;
            margin-bottom: 15px;
        }

        .company-name {
            font-size: 24pt;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 2px;
        }

        .company-tagline {
            font-size: 9pt;
            color: #64748b;
            font-weight: 400;
        }

        .report-info {
            margin-top: 15px;
        }

        .report-title {
            font-size: 16pt;
            font-weight: 700;
            color: #1e293b;
            text-align: center;
            margin-bottom: 12px;
        }

        .report-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
        }

        .meta-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 9pt;
        }

        .meta-label {
            font-weight: 600;
            color: #475569;
            min-width: 100px;
        }

        .meta-value {
            color: #1e293b;
            font-weight: 400;
        }

        .status-badge {
            background: #dcfce7;
            color: #166534;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 8pt;
        }

        /* ========================================
           TABLE STYLES
           ======================================== */
        .report-content {
            margin: 20px 0;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .data-table thead {
            background: linear-gradient(135deg, #4c51bf 0%, #667eea 100%);
            color: white;
        }

        .data-table th {
            padding: 10px 8px;
            text-align: center;
            font-weight: 600;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 9pt;
        }

        .data-table th:last-child {
            border-right: none;
        }

        .data-table tbody tr {
            border-bottom: 1px solid #e2e8f0;
        }

        .data-table tbody tr:nth-child(even) {
            background: #f8fafc;
        }

        .data-table td {
            padding: 8px;
            border-right: 1px solid #e2e8f0;
            font-size: 9pt;
            vertical-align: top;
        }

        .data-table td:last-child {
            border-right: none;
        }

        .col-index {
            width: 40px;
            background: #f1f5f9 !important;
            font-weight: 600;
            text-align: center;
        }

        .col-item {
            text-align: left !important;
            font-weight: 500;
            background: #f8fafc !important;
            min-width: 120px;
        }

        .col-data {
            min-width: 80px;
            padding: 8px 12px;
        }

        .col-total {
            background: #fef3c7 !important;
            font-weight: 700;
            color: #92400e;
            border-left: 2px solid #f59e0b !important;
            text-align: center;
        }

        .data-table tfoot {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            font-weight: 700;
        }

        .data-table tfoot td {
            padding: 10px 8px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 10pt;
            text-align: center;
        }

        .data-table tfoot td:last-child {
            background: #065f46 !important;
            border-left: 2px solid #d97706 !important;
            border-right: none;
        }

        /* ========================================
           NOTES SECTION
           ======================================== */
        .report-notes {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
        }

        .notes-title {
            color: #1e40af;
            font-size: 11pt;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .notes-content {
            color: #1e3a8a;
            font-size: 9pt;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        /* ========================================
           FOOTER STYLES
           ======================================== */
        .report-footer {
            margin-top: 30px;
            padding-top: 15px;
        }

        .footer-line {
            height: 2px;
            background: linear-gradient(90deg, #667eea 0%, transparent 100%);
            margin-bottom: 10px;
        }

        .footer-text {
            font-size: 8pt;
            color: #64748b;
            text-align: center;
            margin-bottom: 4px;
        }

        .footer-subtext {
            font-size: 7pt;
            color: #94a3b8;
            text-align: center;
            font-style: italic;
        }

        /* ========================================
           PRINT-SPECIFIC STYLES
           ======================================== */
        @media print {
            body {
                margin: 0;
                padding: 0;
                background: white;
            }

            .report-page {
                margin: 0;
                padding: 15mm;
                page-break-after: always;
                max-width: 100%;
            }

            .report-page:last-child {
                page-break-after: auto;
            }

            .page-break {
                page-break-after: always;
                display: block;
                height: 0;
            }

            /* Prevent table rows from breaking across pages */
            .data-table tr {
                page-break-inside: avoid;
            }

            .data-table thead {
                display: table-header-group;
            }

            .data-table tfoot {
                display: table-footer-group;
            }

            /* Ensure report header doesn't break */
            .report-header {
                page-break-inside: avoid;
            }

            /* Ensure notes don't break */
            .report-notes {
                page-break-inside: avoid;
            }

            /* Remove box shadows for print */
            .data-table {
                box-shadow: none;
            }

            /* Enhance print colors */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }

        /* ========================================
           SCREEN-ONLY STYLES (Loading & Instructions)
           ======================================== */
        @media screen {
            .print-instructions {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #667eea;
                color: white;
                padding: 15px;
                text-align: center;
                font-size: 14px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }

            .print-instructions .instruction-text {
                margin-bottom: 10px;
                font-weight: 600;
            }

            .print-instructions .instruction-keys {
                font-family: 'Courier New', monospace;
                background: rgba(255,255,255,0.2);
                padding: 5px 10px;
                border-radius: 4px;
                display: inline-block;
                margin: 0 5px;
            }

            body {
                padding-top: 80px;
            }
        }

        @media screen and (max-width: 768px) {
            .report-page {
                padding: 10mm;
            }

            .report-meta {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Screen-only print instructions -->
    <div class="print-instructions">
        <div class="instruction-text">
            📄 Your report is ready! The print dialog will open automatically.
        </div>
        <div>
            If it doesn't open, press <span class="instruction-keys">Ctrl + P</span> (Windows/Linux) or <span class="instruction-keys">⌘ + P</span> (Mac)
        </div>
    </div>

    ${reportSections}

    <script>
        // Auto-trigger print dialog after fonts are loaded
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
                setTimeout(function() {
                    window.print();
                }, 1000); // Wait 1 second for fonts to fully render
            });
        } else {
            // Fallback for browsers without Font Loading API
            setTimeout(function() {
                window.print();
            }, 2000);
        }

        // Close window after printing is complete or cancelled
        window.onafterprint = function() {
            setTimeout(function() {
                window.close();
            }, 500);
        };
    </script>
</body>
</html>`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { department, singleReportId } = await req.json();

        // ===== PRODUCTION-READY PERMISSION CHECKS =====
        const userRole = user.job_role || 'employee';
        const userDepartment = user.department;

        console.log(`🔒 Export request from: ${user.full_name} (${userRole}, ${userDepartment})`);

        // Fetch reports based on request
        let reports;
        if (singleReportId) {
            const report = await base44.asServiceRole.entities.ManualReport.get(singleReportId);
            if (!report) {
                return Response.json({ error: 'Report not found' }, { status: 404 });
            }

            // Permission check for single report
            const canAccessReport = checkReportAccess(user, userRole, userDepartment, report);
            if (!canAccessReport) {
                console.error(`❌ Access denied: ${user.full_name} cannot access report ${singleReportId}`);
                return Response.json({ 
                    error: 'Access denied', 
                    details: 'You do not have permission to export this report' 
                }, { status: 403 });
            }

            reports = [report];
        } else if (department) {
            // Permission check for department export
            const canExportDepartment = checkDepartmentExportAccess(user, userRole, userDepartment, department);
            if (!canExportDepartment) {
                console.error(`❌ Access denied: ${user.full_name} cannot export ${department} department reports`);
                return Response.json({ 
                    error: 'Access denied', 
                    details: `You do not have permission to export reports from ${department} department` 
                }, { status: 403 });
            }

            reports = await base44.asServiceRole.entities.ManualReport.filter({ department });
        } else {
            return Response.json({ 
                error: 'Invalid request', 
                details: 'Either singleReportId or department must be provided' 
            }, { status: 400 });
        }

        if (reports.length === 0) {
            return Response.json({ 
                success: false,
                message: 'No reports found to export' 
            }, { status: 200 });
        }

        console.log(`✅ Access granted: Exporting ${reports.length} report(s)`);

        // Fetch templates and users
        const [templates, users] = await Promise.all([
            base44.asServiceRole.entities.ReportTemplate.list(),
            base44.asServiceRole.entities.User.list()
        ]);

        const templatesMap = new Map(templates.map(t => [t.id, t]));
        const userMap = new Map(users.map(u => [u.id, u]));

        // Generate complete printable HTML
        const html = generatePrintableReportHTML(reports, templatesMap, userMap, department);

        // Return HTML for browser-based printing
        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Report generation error:', error);
        return Response.json({ 
            error: 'Report generation failed', 
            details: error.message 
        }, { status: 500 });
    }
});

/**
 * Check if user has access to a specific report
 */
function checkReportAccess(user, userRole, userDepartment, report) {
    switch (userRole) {
        case 'admin':
        case 'manager':
            // Full access to all reports
            return true;

        case 'department_head':
            // Access only to reports in their department
            return report.department === userDepartment;

        case 'employee':
        default:
            // Access only to their own reports
            return report.submitted_by_id === user.id;
    }
}

/**
 * Check if user can export all reports from a department
 */
function checkDepartmentExportAccess(user, userRole, userDepartment, targetDepartment) {
    switch (userRole) {
        case 'admin':
        case 'manager':
            // Can export any department
            return true;

        case 'department_head':
            // Can only export their own department
            return targetDepartment === userDepartment;

        case 'employee':
        default:
            // Employees cannot export department reports
            return false;
    }
}
