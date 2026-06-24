# Reporting & Accountability Module — What was added & how to roll back

**Additive only. Nothing existing was removed, renamed, or altered destructively.**
All previously existing reports, forms, routes, fields, permissions, and data are untouched.

## New database tables (run `reporting_module.sql` once in Supabase SQL editor)
All columns are nullable or have safe defaults → existing rows need zero backfill.
1. `KpiDefinition` — role-based KPI config (admins edit targets, no code change). Seeded for all roles in section G.
2. `DailyProgressReport` — one per employee per day (B); `submitTimestamp` doubles as attendance proof; editable until `isLocked`.
3. `DailyTeamSummary` — per Team Leader (C).
4. `WeeklyTeamReport` — per Team Leader (D).
5. `Complaint` — closed-loop, `sourceTeamId` tagging, repeat detection (F).
6. `Scorecard` — monthly A/B/C/D ranking + cut-list flag (H).
7. `ScoringWeight` — configurable weights (employee + leader scopes), seeded with defaults.
8. `SkipLevelPulse` — anonymous monthly fairness survey.

Seeds (idempotent): role KPI definitions (section G) and scoring weights/bands.

## New backend endpoints (`/api/v1/...`)
- `POST /reporting/dpr`, `GET /reporting/dpr` — daily progress report (upsert/list, role-scoped).
- `POST/GET /reporting/complaints`, `PATCH /reporting/complaints/:id`, `GET /reporting/complaints-by-source` — closed-loop complaints + by-source-team report.
- `GET /reporting/summary` — dashboard accountability summary (team scoreboard RAG, red flags, complaint-factory, cut-list).
- `GET /reporting/scorecards`, `POST /reporting/scorecards/compute` — monthly scorecards.
- Generic CRUD: `/kpi-definitions`, `/daily-team-summaries`, `/weekly-team-reports`, `/scoring-weights`, `/skip-level-pulses` (tenant + sub-company scoped).

## New frontend pages
- **Daily Report (DPR)** — role-specific KPI fields, Bangla/English toggle, one-per-day with lock.
- **Complaints** — source-team tagging, status workflow, "by source team" chart + repeat rate.
- **Team Accountability** — scoreboard, red flags, cut-list, monthly scorecards (A/B/C/D).
- **Dashboard** — embeds the accountability summary (the MD one-page view lives on the main ERP Dashboard).

## Roles / scope
Hierarchy tops at **Reporting Head**. `HEAD_ROLES` (SUPER_ADMIN, ADMIN, DEPARTMENT_HEAD, MANAGER, HR_MANAGER, FINANCE_HEAD) see across teams; employees see only their own DPR/scorecard. Production-team KPIs reuse the existing `ProductionProject` module.

## Rollback
Drop only the new tables (destroys reporting data only; nothing else):
```sql
DROP TABLE IF EXISTS "SkipLevelPulse","ScoringWeight","Scorecard","Complaint",
  "WeeklyTeamReport","DailyTeamSummary","DailyProgressReport","KpiDefinition";
```
(Also commented at the bottom of `reporting_module.sql`.)

## New permissions
No new permission modules required — endpoints use existing `authenticate` + role tiers. (Optional: add `reporting` modules to the permission grid later if you want per-module gating.)
