-- Webhooks belong to a sub-company (ADDITIVE — safe). Run once in Supabase.
ALTER TABLE "Webhook" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Webhook" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
CREATE INDEX IF NOT EXISTS "Webhook_companyId_idx" ON "Webhook" ("companyId");
