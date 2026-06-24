-- ============================================================================
-- Wholesale & Production tables  (ADDITIVE — safe, does not alter existing tables)
-- Run this in the Supabase SQL editor.
-- Column names are camelCase (quoted) to match Prisma's mapping for this DB.
-- ============================================================================

-- ── WholesaleEntry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WholesaleEntry" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "companyId"     TEXT,
  "departmentId"  TEXT,
  "date"          TIMESTAMP(3) NOT NULL,
  "buyerType"     TEXT NOT NULL DEFAULT 'library',
  "buyerName"     TEXT NOT NULL,
  "items"         JSONB DEFAULT '[]',
  "totalQuantity" INTEGER NOT NULL DEFAULT 0,
  "totalAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'due',
  "notes"         TEXT,
  "createdById"   TEXT,
  "createdByName" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WholesaleEntry_tenantId_idx"  ON "WholesaleEntry" ("tenantId");
CREATE INDEX IF NOT EXISTS "WholesaleEntry_companyId_idx" ON "WholesaleEntry" ("companyId");
CREATE INDEX IF NOT EXISTS "WholesaleEntry_date_idx"      ON "WholesaleEntry" ("date");

-- ── ProductionProject ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductionProject" (
  "id"             TEXT PRIMARY KEY,
  "tenantId"       TEXT NOT NULL,
  "companyId"      TEXT,
  "departmentId"   TEXT,
  "title"          TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'graphic',
  "assigneeId"     TEXT,
  "assigneeName"   TEXT,
  "status"         TEXT NOT NULL DEFAULT 'submitted',
  "progress"       INTEGER NOT NULL DEFAULT 0,
  "workDate"       TIMESTAMP(3),
  "dueDate"        TIMESTAMP(3),
  "deliverableUrl" TEXT,
  "description"    TEXT,
  "revisionNotes"  TEXT,
  "createdById"    TEXT,
  "createdByName"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProductionProject_tenantId_idx"   ON "ProductionProject" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductionProject_companyId_idx"  ON "ProductionProject" ("companyId");
CREATE INDEX IF NOT EXISTS "ProductionProject_assigneeId_idx" ON "ProductionProject" ("assigneeId");
CREATE INDEX IF NOT EXISTS "ProductionProject_status_idx"     ON "ProductionProject" ("status");
