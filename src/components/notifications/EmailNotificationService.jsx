
import { SendEmail } from '@/integrations/Core';

class EmailNotificationService {
  constructor() {
    this.fromName = 'Biddabari ERP System';
  }

  async sendWelcomeEmail({ employeeName, employeeId, email, department }) {
    const subject = 'Welcome to Biddabari ERP System';
    const body = this.generateWelcomeEmailTemplate({ employeeName, employeeId, department, email });
    
    return this.sendEmail({ to: email, subject, body });
  }

  async sendTaskAssignmentEmail({ assigneeName, assigneeEmail, taskTitle, taskDescription, deadline, assignedBy }) {
    const subject = `New Task Assigned: ${taskTitle}`;
    const body = this.generateTaskAssignmentTemplate({ 
      assigneeName, taskTitle, taskDescription, deadline, assignedBy 
    });
    
    return this.sendEmail({ to: assigneeEmail, subject, body });
  }

  async sendExpenseApprovalEmail({ employeeName, employeeEmail, expenseTitle, amount, approvedBy }) {
    const subject = `Expense Approved: ${expenseTitle}`;
    const body = this.generateExpenseApprovalTemplate({ 
      employeeName, expenseTitle, amount, approvedBy 
    });
    
    return this.sendEmail({ to: employeeEmail, subject, body });
  }

  async sendExpenseRejectionEmail({ employeeName, employeeEmail, expenseTitle, amount, rejectionReason, rejectedBy }) {
    const subject = `Expense Rejected: ${expenseTitle}`;
    const body = this.generateExpenseRejectionTemplate({ 
      employeeName, expenseTitle, amount, rejectionReason, rejectedBy 
    });
    
    return this.sendEmail({ to: employeeEmail, subject, body });
  }

  async sendLeadAssignmentEmail({ assigneeName, assigneeEmail, leadName, leadPhone, courseInterest, assignedBy }) {
    const subject = `New Lead Assigned: ${leadName}`;
    const body = this.generateLeadAssignmentTemplate({ 
      assigneeName, leadName, leadPhone, courseInterest, assignedBy 
    });
    
    return this.sendEmail({ to: assigneeEmail, subject, body });
  }

  async sendAttendanceAlertEmail({ managerName, managerEmail, employeeName, alertType, date }) {
    const subject = `Attendance Alert: ${employeeName}`;
    const body = this.generateAttendanceAlertTemplate({ 
      managerName, employeeName, alertType, date 
    });
    
    return this.sendEmail({ to: managerEmail, subject, body });
  }

  async sendIncentiveNotificationEmail({ employeeName, employeeEmail, month, incentiveAmount, rank }) {
    const subject = `Monthly Incentive Report - ${month}`;
    const body = this.generateIncentiveNotificationTemplate({ 
      employeeName, month, incentiveAmount, rank 
    });
    
    return this.sendEmail({ to: employeeEmail, subject, body });
  }

  async sendSystemMaintenanceEmail({ recipientEmail, maintenanceDate, duration, affectedSystems }) {
    const subject = 'Scheduled System Maintenance - Biddabari ERP';
    const body = this.generateMaintenanceNotificationTemplate({ 
      maintenanceDate, duration, affectedSystems 
    });
    
    return this.sendEmail({ to: recipientEmail, subject, body });
  }

  async sendAdmissionNotificationEmail({ employeeName, employeeEmail, studentName, courseName, admissionFee }) {
    const subject = `New Admission Processed: ${studentName}`;
    const body = this.generateAdmissionNotificationTemplate({ 
      employeeName, studentName, courseName, admissionFee 
    });
    
    return this.sendEmail({ to: employeeEmail, subject, body });
  }

  async sendBulkEmail({ recipients, subject, body }) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        await this.sendEmail({ to: recipient.email, subject, body: body.replace('{{name}}', recipient.name) });
        results.push({ email: recipient.email, status: 'sent' });
      } catch (error) {
        results.push({ email: recipient.email, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }

  async sendEmail({ to, subject, body }) {
    try {
      await SendEmail({
        from_name: this.fromName,
        to: to,
        subject: subject,
        body: body
      });
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  generateWelcomeEmailTemplate({ employeeName, employeeId, department, email }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Biddabari!</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your journey with us begins now</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${employeeName},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We're thrilled to welcome you to the Biddabari team! Your employee account has been successfully created in our ERP system.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #7C3AED;">
            <h3 style="color: #7C3AED; margin-top: 0;">Your Account Details:</h3>
            <p style="margin: 8px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
            <p style="margin: 8px 0;"><strong>Department:</strong> ${department.charAt(0).toUpperCase() + department.slice(1)}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Please contact your department head or IT support for login instructions and system access details.
          </p>
          <div style="text-align: center; margin-top: 40px;">
            <div style="background: #7C3AED; color: white; padding: 20px; border-radius: 12px; display: inline-block;">
              <strong style="font-size: 18px;">Biddabari ERP System</strong>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Empowering Education Excellence</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  generateTaskAssignmentTemplate({ assigneeName, taskTitle, taskDescription, deadline, assignedBy }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Task Assigned</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${assigneeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            You have been assigned a new task by ${assignedBy}.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3B82F6;">
            <h3 style="color: #3B82F6; margin-top: 0;">${taskTitle}</h3>
            <p style="color: #666; line-height: 1.6;">${taskDescription}</p>
            <p style="margin: 15px 0 0 0;"><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
          </div>
          <p style="color: #666;">
            Please log into the ERP system to view complete task details and submit your work.
          </p>
        </div>
      </div>
    `;
  }

  generateExpenseApprovalTemplate({ employeeName, expenseTitle, amount, approvedBy }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Expense Approved ✅</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${employeeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            Great news! Your expense has been approved by ${approvedBy}.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10B981;">
            <h3 style="color: #10B981; margin-top: 0;">${expenseTitle}</h3>
            <p style="font-size: 24px; color: #333; margin: 10px 0;"><strong>৳${amount.toLocaleString()}</strong></p>
          </div>
          <p style="color: #666;">
            You can now download the approved expense voucher from the ERP system.
          </p>
        </div>
      </div>
    `;
  }

  generateExpenseRejectionTemplate({ employeeName, expenseTitle, amount, rejectionReason, rejectedBy }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Expense Requires Revision</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${employeeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            Your expense submission requires some changes before approval.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #EF4444;">
            <h3 style="color: #EF4444; margin-top: 0;">${expenseTitle}</h3>
            <p style="font-size: 18px; color: #333; margin: 10px 0;"><strong>৳${amount.toLocaleString()}</strong></p>
            <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="color: #DC2626; margin: 0;"><strong>Feedback from ${rejectedBy}:</strong></p>
              <p style="color: #7F1D1D; margin: 10px 0 0 0;">${rejectionReason}</p>
            </div>
          </div>
          <p style="color: #666;">
            Please review the feedback and resubmit your expense with the necessary corrections.
          </p>
        </div>
      </div>
    `;
  }

  generateLeadAssignmentTemplate({ assigneeName, leadName, leadPhone, courseInterest, assignedBy }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #EC4899, #BE185D); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Lead Assigned 🎯</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${assigneeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            A new lead has been assigned to you by ${assignedBy}. Time to work your magic!
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #EC4899;">
            <h3 style="color: #EC4899; margin-top: 0;">Lead Details</h3>
            <p style="margin: 8px 0;"><strong>Name:</strong> ${leadName}</p>
            <p style="margin: 8px 0;"><strong>Phone:</strong> ${leadPhone}</p>
            <p style="margin: 8px 0;"><strong>Course Interest:</strong> ${courseInterest}</p>
          </div>
          <p style="color: #666;">
            Please follow up with this lead promptly and update the CRM system with your progress.
          </p>
        </div>
      </div>
    `;
  }

  generateAttendanceAlertTemplate({ managerName, employeeName, alertType, date }) {
    const alertMessages = {
      'late': 'was late to work',
      'absent': 'was absent',
      'early_leave': 'left early'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Attendance Alert ⚠️</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${managerName},</h2>
          <p style="color: #666; line-height: 1.6;">
            This is an automated attendance alert for your team member.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #F59E0B; margin-top: 0;">Alert Details</h3>
            <p style="margin: 8px 0;"><strong>Employee:</strong> ${employeeName}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Issue:</strong> ${alertMessages[alertType] || alertType}</p>
          </div>
          <p style="color: #666;">
            Please review this attendance issue and take appropriate action if necessary.
          </p>
        </div>
      </div>
    `;
  }

  generateIncentiveNotificationTemplate({ employeeName, month, incentiveAmount, rank }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Monthly Incentive Report 🏆</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${employeeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            Congratulations on your performance for ${month}!
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #8B5CF6;">
            <h3 style="color: #8B5CF6; margin-top: 0;">Your Results</h3>
            <p style="font-size: 24px; color: #333; margin: 15px 0;"><strong>Incentive: ৳${incentiveAmount.toLocaleString()}</strong></p>
            <p style="margin: 8px 0;"><strong>Team Rank:</strong> #${rank}</p>
          </div>
          <p style="color: #666;">
            Keep up the excellent work! Your dedication is truly appreciated.
          </p>
        </div>
      </div>
    `;
  }

  generateMaintenanceNotificationTemplate({ maintenanceDate, duration, affectedSystems }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #6B7280, #4B5563); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Scheduled Maintenance 🔧</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">System Maintenance Notice</h2>
          <p style="color: #666; line-height: 1.6;">
            We will be performing scheduled maintenance on the Biddabari ERP system.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #6B7280;">
            <h3 style="color: #6B7280; margin-top: 0;">Maintenance Details</h3>
            <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${new Date(maintenanceDate).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Duration:</strong> ${duration}</p>
            <p style="margin: 8px 0;"><strong>Affected Systems:</strong> ${affectedSystems.join(', ')}</p>
          </div>
          <p style="color: #666;">
            Please plan accordingly and save your work before the maintenance window.
          </p>
        </div>
      </div>
    `;
  }

  generateAdmissionNotificationTemplate({ employeeName, studentName, courseName, admissionFee }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #06B6D4, #0891B2); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Admission Success! 🎓</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${employeeName},</h2>
          <p style="color: #666; line-height: 1.6;">
            Congratulations! You've successfully processed a new admission.
          </p>
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #06B6D4;">
            <h3 style="color: #06B6D4; margin-top: 0;">Admission Details</h3>
            <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
            <p style="margin: 8px 0;"><strong>Course:</strong> ${courseName}</p>
            <p style="font-size: 20px; color: #333; margin: 15px 0 0 0;"><strong>Fee: ৳${admissionFee.toLocaleString()}</strong></p>
          </div>
          <p style="color: #666;">
            Great job on adding another student to our growing community!
          </p>
        </div>
      </div>
    `;
  }
}

export default new EmailNotificationService();
