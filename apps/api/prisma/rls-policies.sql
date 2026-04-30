-- ─────────────────────────────────────────────────────────────────────────────
-- CivilIQ — Row-Level Security Policies
-- Run after: prisma migrate deploy
-- See ADR-004 for rationale.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_schemas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_elements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_account_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_packages     ENABLE ROW LEVEL SECURITY;

-- ─── Policy: SELECT — only show rows for the current tenant ──────────────────

CREATE POLICY tenant_isolation_users ON users
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_projects ON projects
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_clients ON clients
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_template_schemas ON template_schemas
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_documents ON documents
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_document_embeddings ON document_embeddings
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_materials ON materials
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_model_elements ON model_elements
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_measurement_books ON measurement_books
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_running_account_bills ON running_account_bills
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_tenders ON tenders
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_subcontractors ON subcontractors
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_agent_jobs ON agent_jobs
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_notifications ON notifications
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_work_packages ON work_packages
  FOR ALL USING (tenant_id = current_tenant_id());

-- ─── Service role bypass ─────────────────────────────────────────────────────
-- The civiliq_service role bypasses RLS for background jobs and migrations.
-- Grant this role to the Prisma connection used by BullMQ workers.

CREATE ROLE civiliq_service;
ALTER ROLE civiliq_service BYPASSRLS;
-- GRANT civiliq_service TO civiliq;  -- Uncomment and run with superuser
