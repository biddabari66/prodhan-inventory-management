import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Ensure the user has the right permissions (admin/manager)
        const user = await base44.auth.me();
        if (!user || !['admin', 'manager', 'department_head'].includes(user.job_role)) {
            return new Response(JSON.stringify({ error: 'Unauthorized. You do not have permission to run payroll.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { start_date, end_date } = await req.json();
        
        if (!start_date || !end_date) {
            throw new Error("Both start_date and end_date (YYYY-MM-DD format) are required parameters.");
        }

        // Parse dates using native JavaScript Date
        const startDate = new Date(start_date + 'T00:00:00.000Z');
        const endDate = new Date(end_date + 'T23:59:59.999Z');
        
        if (startDate > endDate) {
            throw new Error("start_date must be before or equal to end_date.");
        }

        // Calculate total days in period
        const totalDaysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        console.log(`Generating payroll for period: ${start_date} to ${end_date} (${totalDaysInPeriod} days)`);

        // Fetch employees and attendance data
        let employees, allAttendance;
        
        try {
            [employees, allAttendance] = await Promise.all([
                base44.asServiceRole.entities.User.filter({ is_active: true }),
                base44.asServiceRole.entities.Attendance.filter({
                    date: {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }, '-date', 5000)
            ]);
        } catch (dbError) {
            console.error('Database query failed:', dbError);
            throw new Error('Failed to fetch employee or attendance data');
        }

        console.log(`Found ${employees.length} active employees and ${allAttendance.length} attendance records`);

        const payrollResults = [];

        for (const employee of employees) {
            try {
                const employeeAttendance = allAttendance.filter(a => a.employee_id === employee.id);
                
                let presentDays = 0;
                let absentDays = 0;
                let lateDays = 0;

                // Count attendance statuses
                employeeAttendance.forEach(att => {
                    if (att.status?.includes('present')) presentDays++;
                    else if (att.status?.includes('absent')) absentDays++;
                    else if (att.status?.includes('late')) lateDays++;
                });

                // Handle employees with no salary or zero salary
                const baseSalary = employee.base_salary || 0;
                const hasSalaryData = baseSalary > 0;

                let salaryPerDay = 0;
                let totalDeductions = 0;
                let netSalary = 0;

                if (hasSalaryData) {
                    // Calculate daily salary rate based on the total period
                    salaryPerDay = baseSalary / totalDaysInPeriod;

                    // Calculate Absence Deductions
                    const maxAllowedAbsences = employee.max_allowed_absences || 3;
                    const punishableAbsences = Math.max(0, absentDays - maxAllowedAbsences);
                    const absenceDeductionRate = (employee.attendance_deduction_rate || 0) / 100;
                    const absenceDeduction = punishableAbsences * salaryPerDay * absenceDeductionRate;

                    // Calculate Late Deductions
                    const maxAllowedLates = employee.max_allowed_lates || 5;
                    const punishableLates = Math.max(0, lateDays - maxAllowedLates);
                    const lateDeductionRate = (employee.late_deduction_rate || 0) / 100;
                    const lateDeduction = punishableLates * salaryPerDay * lateDeductionRate;

                    totalDeductions = absenceDeduction + lateDeduction;
                    netSalary = baseSalary - totalDeductions;
                }

                payrollResults.push({
                    employee_id: employee.employee_id || 'N/A',
                    user_id: employee.id, // Include user ID for detail views
                    full_name: employee.full_name || 'Unknown',
                    department: employee.department || 'Unassigned',
                    designation: employee.designation || 'No designation',
                    base_salary: baseSalary,
                    has_salary_data: hasSalaryData,
                    present_days: presentDays,
                    absent_days: absentDays,
                    late_days: lateDays,
                    total_deductions: parseFloat(totalDeductions.toFixed(2)),
                    net_salary: parseFloat(netSalary.toFixed(2)),
                    total_days_in_period: totalDaysInPeriod,
                    salary_per_day: parseFloat(salaryPerDay.toFixed(2)),
                    max_allowed_absences: employee.max_allowed_absences || 3,
                    max_allowed_lates: employee.max_allowed_lates || 5,
                    absence_deduction_rate: employee.attendance_deduction_rate || 0,
                    late_deduction_rate: employee.late_deduction_rate || 0,
                });
            } catch (employeeError) {
                console.error(`Error processing employee ${employee.id}:`, employeeError);
                // Continue with next employee instead of failing entirely
                continue;
            }
        }

        // Sort by name for consistent display
        payrollResults.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        
        console.log(`Generated payroll for ${payrollResults.length} employees (${payrollResults.filter(e => e.has_salary_data).length} with salary data)`);
        
        return new Response(JSON.stringify(payrollResults), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Payroll calculation failed:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Internal server error',
            details: error.stack || 'No additional details available'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});