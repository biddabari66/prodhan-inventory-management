import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || '587'),
      secure: parseInt(env.SMTP_PORT || '587') === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

const FROM = () => env.SMTP_FROM || env.SMTP_USER || 'noreply@prodhan.com';

export const emailService = {
  async send(to: string, subject: string, html: string): Promise<boolean> {
    const t = getTransporter();
    if (!t) {
      logger.warn('Email not configured — SMTP_HOST missing');
      return false;
    }
    try {
      await t.sendMail({ from: `Prodhan <${FROM()}>`, to, subject, html });
      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err: any) {
      logger.error('Email send error:', err.message);
      return false;
    }
  },

  async sendWelcome(to: string, name: string, tempPassword: string): Promise<void> {
    await this.send(
      to,
      'Welcome to Prodhan ERP — Your Account Details',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Prodhan ERP, ${name}!</h2>
          <p>Your account has been created. Please use the credentials below to log in:</p>
          <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
          </div>
          <p>Please change your password immediately after logging in.</p>
          <a href="${env.FRONTEND_URL}/auth" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Login Now</a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">— Prodhan Team</p>
        </div>
      `
    );
  },

  async sendOrderConfirmation(to: string, orderNumber: string, items: any[], total: number): Promise<void> {
    const itemRows = items.map((i: any) =>
      `<tr><td>${i.itemName}</td><td>${i.quantity}</td><td>৳${i.unitPrice}</td><td>৳${i.subtotal}</td></tr>`
    ).join('');

    await this.send(
      to,
      `Order Confirmed — ${orderNumber}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmed! 🎉</h2>
          <p>Thank you for your order. Here are the details:</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <thead><tr style="background:#f4f4f4"><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="font-size: 18px;"><strong>Total: ৳${total}</strong></p>
          <p>We'll notify you when your order ships!</p>
          <p style="color: #666; font-size: 14px;">— Prodhan</p>
        </div>
      `
    );
  },

  async sendDailySalesDigest(to: string, date: string, stats: {
    totalOrders: number; totalRevenue: number; pending: number; delivered: number;
  }): Promise<void> {
    await this.send(
      to,
      `Daily Sales Report — ${date}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📊 Daily Sales Report — ${date}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
            <div style="background:#6366f1; color:white; padding:16px; border-radius:8px; text-align:center;">
              <div style="font-size:32px; font-weight:bold;">${stats.totalOrders}</div>
              <div>Total Orders</div>
            </div>
            <div style="background:#10b981; color:white; padding:16px; border-radius:8px; text-align:center;">
              <div style="font-size:32px; font-weight:bold;">৳${stats.totalRevenue.toLocaleString()}</div>
              <div>Revenue</div>
            </div>
          </div>
          <p>Pending: ${stats.pending} | Delivered: ${stats.delivered}</p>
          <a href="${env.FRONTEND_URL}/home" style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Dashboard</a>
          <p style="color: #666; font-size: 14px;">— Prodhan ERP Auto Report</p>
        </div>
      `
    );
  },

  async sendLowStockAlert(to: string, items: Array<{ name: string; sku: string; stock: number; minStockLevel: number }>): Promise<void> {
    const rows = items.map(i =>
      `<tr><td>${i.name}</td><td>${i.sku}</td><td style="color:red">${i.stock}</td><td>${i.minStockLevel}</td></tr>`
    ).join('');

    await this.send(
      to,
      `⚠️ Low Stock Alert — ${items.length} item(s)`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>⚠️ Low Stock Alert</h2>
          <p>${items.length} product(s) are below minimum stock level:</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <thead><tr style="background:#fef3c7"><th>Product</th><th>SKU</th><th>Current Stock</th><th>Min Level</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${env.FRONTEND_URL}/inventory" style="background:#f59e0b; color:white; padding:10px 20px; border-radius:6px; text-decoration:none;">View Inventory</a>
          <p style="color:#666; font-size:14px;">— Prodhan Inventory System</p>
        </div>
      `
    );
  },

  async testConnection(): Promise<boolean> {
    const t = getTransporter();
    if (!t) return false;
    try {
      await t.verify();
      return true;
    } catch {
      return false;
    }
  },
};
