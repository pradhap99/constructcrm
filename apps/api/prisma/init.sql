-- ─────────────────────────────────────────────────────────────────────────────
-- CivilIQ — PostgreSQL Initialization Script
-- Run once by Docker on first startup.
-- Enables extensions and sets up RLS helper function.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── RLS Helper Function ──────────────────────────────────────────────────────
-- Called at the start of every DB session to set the tenant context.
-- NestJS Prisma middleware calls: SET app.current_tenant_id = '{tenantId}'
-- RLS policies read this setting to filter rows.

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT current_setting('app.current_tenant_id', true)::uuid;
$$ LANGUAGE SQL STABLE;

-- ─── NOTE ─────────────────────────────────────────────────────────────────────
-- RLS policies are applied AFTER Prisma runs migrations.
-- See: prisma/rls-policies.sql for the full policy definitions.
-- Run manually after first migration: psql $DATABASE_URL -f prisma/rls-policies.sql
-- ─────────────────────────────────────────────────────────────────────────────
