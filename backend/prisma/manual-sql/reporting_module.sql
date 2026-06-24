-- ============================================================================
-- REPORTING & ACCOUNTABILITY MODULE — ADDITIVE, REVERSIBLE, ZERO-DOWNTIME
-- Run once in Supabase SQL editor. Creates NEW tables only. Does NOT alter or
-- drop any existing table/column/row. All columns nullable or defaulted.
-- Rollback: see the DROP block at the very bottom (commented out).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "KpiDefinition" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT,
  "roleKey" TEXT NOT NULL, "kpiKey" TEXT NOT NULL, "label" TEXT NOT NULL,
  "unit" TEXT, "target" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1, "direction" TEXT NOT NULL DEFAULT 'higher',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "KpiDefinition_tenantId_idx" ON "KpiDefinition"("tenantId");
CREATE INDEX IF NOT EXISTS "KpiDefinition_roleKey_idx" ON "KpiDefinition"("roleKey");

CREATE TABLE IF NOT EXISTS "DailyProgressReport" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT, "departmentId" TEXT,
  "employeeId" TEXT NOT NULL, "employeeName" TEXT, "date" DATE NOT NULL,
  "tasksPlanned" TEXT, "tasksCompleted" TEXT, "kpiValues" JSONB DEFAULT '{}',
  "blockers" TEXT, "helpNeeded" TEXT, "tomorrowPlan" TEXT,
  "productionProjectIds" JSONB DEFAULT '[]', "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "submitTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyProgressReport_uniq" ON "DailyProgressReport"("tenantId","employeeId","date");
CREATE INDEX IF NOT EXISTS "DailyProgressReport_tenantId_idx" ON "DailyProgressReport"("tenantId");
CREATE INDEX IF NOT EXISTS "DailyProgressReport_departmentId_idx" ON "DailyProgressReport"("departmentId");

CREATE TABLE IF NOT EXISTS "DailyTeamSummary" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT, "departmentId" TEXT NOT NULL,
  "teamLeaderId" TEXT, "date" DATE NOT NULL, "teamKpiTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "attendance" JSONB DEFAULT '{}', "topPerformer" TEXT, "bottomPerformer" TEXT,
  "membersNoDpr" JSONB DEFAULT '[]', "escalations" TEXT, "complaintsToday" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DailyTeamSummary_tenantId_idx" ON "DailyTeamSummary"("tenantId");
CREATE INDEX IF NOT EXISTS "DailyTeamSummary_departmentId_idx" ON "DailyTeamSummary"("departmentId");

CREATE TABLE IF NOT EXISTS "WeeklyTeamReport" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT, "departmentId" TEXT NOT NULL,
  "teamLeaderId" TEXT, "weekStart" DATE NOT NULL, "kpiTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "kpiActual" DOUBLE PRECISION NOT NULL DEFAULT 0, "kpiPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "best3" JSONB DEFAULT '[]', "worst3" JSONB DEFAULT '[]', "belowMinimum" JSONB DEFAULT '[]',
  "complaints" JSONB DEFAULT '[]', "improvementActions" TEXT, "hireOrCutRequest" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WeeklyTeamReport_tenantId_idx" ON "WeeklyTeamReport"("tenantId");
CREATE INDEX IF NOT EXISTS "WeeklyTeamReport_departmentId_idx" ON "WeeklyTeamReport"("departmentId");

CREATE TABLE IF NOT EXISTS "Complaint" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "customer" TEXT, "channel" TEXT,
  "description" TEXT, "sourceTeamId" TEXT, "sourceTeamName" TEXT, "handledById" TEXT, "handledByName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open', "resolutionTime" INTEGER, "isRepeat" BOOLEAN NOT NULL DEFAULT false,
  "reopenedCount" INTEGER NOT NULL DEFAULT 0, "rootCause" TEXT, "fix" TEXT, "csat" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Complaint_tenantId_idx" ON "Complaint"("tenantId");
CREATE INDEX IF NOT EXISTS "Complaint_sourceTeamId_idx" ON "Complaint"("sourceTeamId");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");

CREATE TABLE IF NOT EXISTS "Scorecard" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT, "subjectId" TEXT NOT NULL,
  "subjectName" TEXT, "subjectType" TEXT NOT NULL DEFAULT 'employee', "periodMonth" TEXT NOT NULL,
  "kpiScore" DOUBLE PRECISION NOT NULL DEFAULT 0, "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0, "behaviourScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0, "band" TEXT, "isCutCandidate" BOOLEAN NOT NULL DEFAULT false,
  "breakdown" JSONB DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Scorecard_uniq" ON "Scorecard"("tenantId","subjectId","periodMonth");
CREATE INDEX IF NOT EXISTS "Scorecard_tenantId_idx" ON "Scorecard"("tenantId");

CREATE TABLE IF NOT EXISTS "ScoringWeight" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "scope" TEXT NOT NULL DEFAULT 'employee',
  "weights" JSONB NOT NULL DEFAULT '{}', "bands" JSONB DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScoringWeight_uniq" ON "ScoringWeight"("tenantId","scope");

CREATE TABLE IF NOT EXISTS "SkipLevelPulse" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT, "departmentId" TEXT,
  "leaderId" TEXT, "periodMonth" TEXT NOT NULL, "fairnessScore" INTEGER, "answers" JSONB DEFAULT '{}',
  "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SkipLevelPulse_tenantId_idx" ON "SkipLevelPulse"("tenantId");
CREATE INDEX IF NOT EXISTS "SkipLevelPulse_leaderId_idx" ON "SkipLevelPulse"("leaderId");

-- ── SEED: scoring weights (per tenant, idempotent) ──────────────────────────
INSERT INTO "ScoringWeight" ("id","tenantId","scope","weights","bands","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t.id, 'employee',
  '{"kpi":60,"quality":20,"reliability":10,"behaviour":10}'::jsonb,
  '{"A":[85,100],"B":[70,84],"C":[50,69],"D":[0,49]}'::jsonb, now(), now()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "ScoringWeight" s WHERE s."tenantId"=t.id AND s."scope"='employee');

INSERT INTO "ScoringWeight" ("id","tenantId","scope","weights","bands","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t.id, 'leader',
  '{"team_output":40,"complaints_caused":20,"attrition":15,"skip_level_fairness":15,"report_accuracy":10}'::jsonb,
  '{"A":[85,100],"B":[70,84],"C":[50,69],"D":[0,49]}'::jsonb, now(), now()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "ScoringWeight" s WHERE s."tenantId"=t.id AND s."scope"='leader');

-- ── SEED: role KPI definitions (per tenant, idempotent) ─────────────────────
INSERT INTO "KpiDefinition" ("id","tenantId","roleKey","kpiKey","label","unit","direction","createdAt","updatedAt")
SELECT gen_random_uuid()::text, t.id, v.rolekey, v.kpikey, v.label, v.unit, v.direction, now(), now()
FROM "Tenant" t
CROSS JOIN (VALUES
  ('admission_sales','leads_handled','Leads Handled','count','higher'),
  ('admission_sales','calls','Calls','count','higher'),
  ('admission_sales','admissions_closed','Admissions Closed','count','higher'),
  ('admission_sales','revenue','Revenue','currency','higher'),
  ('admission_sales','followups_pending','Follow-ups Pending','count','lower'),
  ('admission_sales','conversion_pct','Conversion %','pct','higher'),
  ('marketing_production','tasks_assigned','Tasks Assigned','count','higher'),
  ('marketing_production','tasks_delivered','Tasks Delivered','count','higher'),
  ('marketing_production','on_time_pct','On-time %','pct','higher'),
  ('marketing_production','revisions','Revisions','count','lower'),
  ('marketing_production','outputs','Outputs','count','higher'),
  ('organic_marketing','posts_published','Posts Published','count','higher'),
  ('organic_marketing','reach','Reach','count','higher'),
  ('organic_marketing','engagement','Engagement','count','higher'),
  ('organic_marketing','leads_generated','Leads Generated','count','higher'),
  ('organic_marketing','pages_covered','Pages Covered','count','higher'),
  ('service','class_ontime_pct','Class On-time %','pct','higher'),
  ('service','technical_failures','Technical Failures','count','lower'),
  ('service','routine_accuracy','Routine Accuracy','pct','higher'),
  ('service','comment_response_time','Comment Response Time','hours','lower'),
  ('service','unresolved_comments','Unresolved Comments','count','lower'),
  ('rnd','items_produced','Items Produced','count','higher'),
  ('rnd','deadlines_met_pct','Deadlines Met %','pct','higher'),
  ('rnd','accuracy_pct','Accuracy %','pct','higher'),
  ('rnd','items_reviewed','Items Reviewed','count','higher'),
  ('one_stop','complaints_received','Complaints Received','count','lower'),
  ('one_stop','resolved_pct','Resolved %','pct','higher'),
  ('one_stop','avg_resolution_time','Avg Resolution Time','hours','lower'),
  ('one_stop','repeat_complaints','Repeat Complaints','count','lower'),
  ('one_stop','csat','CSAT','count','higher'),
  ('one_stop','escalations','Escalations','count','lower'),
  ('boibari','ontime_delivery_pct','On-time Delivery %','pct','higher'),
  ('boibari','returns','Returns','count','lower'),
  ('boibari','tickets_resolved','Tickets Resolved','count','higher'),
  ('boibari','response_time','Response Time','hours','lower'),
  ('boibari','roas','ROAS','count','higher'),
  ('boibari','data_entry_accuracy','Data Entry Accuracy','pct','higher'),
  ('prodhan','orders','Orders','count','higher'),
  ('prodhan','sourcing_cost_pct','Sourcing Cost %','pct','lower'),
  ('prodhan','content_outputs','Content Outputs','count','higher'),
  ('prodhan','support_csat','Support CSAT','count','higher'),
  ('prodhan','roas','ROAS','count','higher'),
  ('prodhan','stockouts','Stockouts','count','lower')
) AS v(rolekey,kpikey,label,unit,direction)
WHERE NOT EXISTS (
  SELECT 1 FROM "KpiDefinition" k WHERE k."tenantId"=t.id AND k."roleKey"=v.rolekey AND k."kpiKey"=v.kpikey
);

-- ============================================================================
-- ROLLBACK (only if you must fully remove this module — destroys its data):
-- DROP TABLE IF EXISTS "SkipLevelPulse","ScoringWeight","Scorecard","Complaint",
--   "WeeklyTeamReport","DailyTeamSummary","DailyProgressReport","KpiDefinition";
-- ============================================================================
