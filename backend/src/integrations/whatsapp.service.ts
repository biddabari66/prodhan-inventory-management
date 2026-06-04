import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const whatsappService = {
  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!env.ULTRAMSG_TOKEN || !env.ULTRAMSG_INSTANCE_ID) {
      logger.warn('WhatsApp not configured');
      return false;
    }

    // Normalize phone: must start with country code
    const normalizedPhone = phone.startsWith('+') ? phone : `+88${phone.replace(/^0/, '')}`;

    try {
      const res = await axios.post(
        `https://api.ultramsg.com/${env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
        new URLSearchParams({
          token: env.ULTRAMSG_TOKEN,
          to: normalizedPhone,
          body: message,
          priority: '10',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      logger.info(`WhatsApp sent to ${normalizedPhone}: ${res.data.sent}`);
      return res.data.sent === 'true';
    } catch (err: any) {
      logger.error('WhatsApp sendMessage error:', err.response?.data || err.message);
      return false;
    }
  },

  async sendOrderConfirmation(phone: string, orderNumber: string, total: number) {
    const message = `🛍️ আপনার অর্ডার কনফার্ম হয়েছে!\n\nঅর্ডার নং: ${orderNumber}\nমোট: ৳${total}\n\nআমরা শীঘ্রই আপনার পণ্য পাঠাবো। ধন্যবাদ! 🙏\n\n— Prodhan`;
    return this.sendMessage(phone, message);
  },

  async sendWelcomeMessage(phone: string, name: string) {
    const message = `🌟 স্বাগতম ${name}!\n\nProdhane আপনাকে স্বাগতম। আমরা সেরা সেবা দিতে প্রতিশ্রুতিবদ্ধ।\n\nযেকোনো সাহায্যের জন্য যোগাযোগ করুন।\n\n— Prodhan Team`;
    return this.sendMessage(phone, message);
  },

  async sendLowStockAlert(phone: string, productName: string, currentStock: number) {
    const message = `⚠️ লো স্টক অ্যালার্ট!\n\nপণ্য: ${productName}\nবর্তমান স্টক: ${currentStock} টি\n\nদ্রুত রিস্টক করুন।\n\n— Prodhan Inventory`;
    return this.sendMessage(phone, message);
  },

  async sendAttendanceAlert(phone: string, name: string, date: string, status: string) {
    const message = `📅 অ্যাটেনডেন্স নোটিশ\n\nকর্মী: ${name}\nতারিখ: ${date}\nস্ট্যাটাস: ${status}\n\n— Prodhan HR`;
    return this.sendMessage(phone, message);
  },
};
