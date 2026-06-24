-- ============================================================================
-- HRM: Tasks & KPI tables  (ADDITIVE — safe, does not alter existing tables)
-- Run this in the Supabase SQL editor.
-- Column names are camelCase (quoted) to match Prisma's mapping for this DB.
-- ============================================================================

-- ── Task ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Task" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "status"        TEXT NOT NULL DEFAULT 'TODO',
  "priority"      TEXT NOT NULL DEFAULT 'MEDIUM',
  "assigneeId"    TEXT,
  "assigneeName"  TEXT,
  "createdById"   TEXT,
  "createdByName" TEXT,
  "departmentId"  TEXT,
  "progress"      INTEGER NOT NULL DEFAULT 0,
  "dueDate"       TIMESTAMP(3),
  "completedAt"   TIMESTAMP(3),
  "tags"          JSONB DEFAULT '[]',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Task_tenantId_idx"   ON "Task" ("tenantId");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task" ("assigneeId");
CREATE INDEX IF NOT EXISTS "Task_status_idx"     ON "Task" ("status");

-- ── Kpi ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Kpi" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT,
  "employeeId"    TEXT,
  "employeeName"  TEXT,
  "departmentId"  TEXT,
  "metric"        TEXT,
  "target"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actual"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weight"        DOUBLE PRECISION NOT NULL DEFAULT 1,
  "period"        TEXT NOT NULL DEFAULT 'MONTHLY',
  "periodStart"   TIMESTAMP(3),
  "periodEnd"     TIMESTAMP(3),
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Kpi_tenantId_idx"   ON "Kpi" ("tenantId");
CREATE INDEX IF NOT EXISTS "Kpi_employeeId_idx" ON "Kpi" ("employeeId");
