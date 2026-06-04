import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 chars'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Steadfast
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: z.string().optional(),
  // Facebook
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_VERIFY_TOKEN: z.string().optional(),
  FACEBOOK_ACCESS_TOKEN: z.string().optional(),
  // WhatsApp (UltraMsg)
  ULTRAMSG_TOKEN: z.string().optional(),
  ULTRAMSG_INSTANCE_ID: z.string().optional(),
  // WooCommerce
  WC_WEBHOOK_SECRET: z.string().optional(),
  // Adprofit
  ADPROFIT_WEBHOOK_URL: z.string().optional(),
  // Prodhan.com
  PRODHAN_COM_SECRET: z.string().optional(),
  // Google
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().optional(),
  // AI
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
