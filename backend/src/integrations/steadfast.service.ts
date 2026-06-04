import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

const BASE_URL = 'https://portal.steadfast.com.bd/api/v1';

function getHeaders() {
  return {
    'Api-Key': env.STEADFAST_API_KEY || '',
    'Secret-Key': env.STEADFAST_SECRET_KEY || '',
    'Content-Type': 'application/json',
  };
}

export interface SteadfastOrder {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  item_weight?: number;
}

export const steadfastService = {
  async createOrder(orderData: SteadfastOrder) {
    try {
      const res = await axios.post(`${BASE_URL}/create_order`, orderData, { headers: getHeaders() });
      return res.data;
    } catch (err: any) {
      logger.error('Steadfast createOrder error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'Steadfast API error');
    }
  },

  async trackByConsignment(consignmentId: string) {
    try {
      const res = await axios.get(`${BASE_URL}/status_by_cid/${consignmentId}`, { headers: getHeaders() });
      return res.data;
    } catch (err: any) {
      logger.error('Steadfast trackByConsignment error:', err.message);
      throw new Error('Failed to track consignment');
    }
  },

  async trackByInvoice(invoice: string) {
    try {
      const res = await axios.get(`${BASE_URL}/status_by_invoice/${invoice}`, { headers: getHeaders() });
      return res.data;
    } catch (err: any) {
      logger.error('Steadfast trackByInvoice error:', err.message);
      throw new Error('Failed to track invoice');
    }
  },

  async bulkTrack(consignmentIds: string[]) {
    try {
      const res = await axios.post(
        `${BASE_URL}/status_by_cids`,
        { cids: consignmentIds },
        { headers: getHeaders() }
      );
      return res.data;
    } catch (err: any) {
      logger.error('Steadfast bulkTrack error:', err.message);
      throw new Error('Bulk track failed');
    }
  },

  async checkBalance() {
    try {
      const res = await axios.get(`${BASE_URL}/get_balance`, { headers: getHeaders() });
      return res.data;
    } catch (err: any) {
      logger.error('Steadfast checkBalance error:', err.message);
      throw new Error('Failed to get balance');
    }
  },
};
