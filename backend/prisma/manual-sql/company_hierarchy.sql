-- Zypra ERP — Company (sub-company) hierarchy
-- Run this in the Supabase SQL editor (or any psql) against your database.

-- 1) Sub-company table
CREATE TABLE IF NOT EXISTS "Company" (
  "id"        TEXT PRIMARY KEY,
  "tenantId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "branding"  JSONB,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Company_tenantId_idx" ON "Company"("tenantId");

-- 2) Link departments to a sub-company
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Department_companyId_fkey'
  ) THEN
    ALTER TABLE "Department"
      ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId")
      REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
