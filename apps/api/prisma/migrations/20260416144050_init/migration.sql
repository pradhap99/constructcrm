-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'PROJECT_MANAGER', 'QUANTITY_SURVEYOR', 'SITE_ENGINEER', 'PROCUREMENT_HEAD', 'FINANCE_CONTROLLER', 'SUBCONTRACTOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('TENDER', 'AWARDED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('PLANNING', 'MOBILISATION', 'EXECUTION', 'TESTING_COMMISSIONING', 'DEFECTS_LIABILITY', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'EXTRACTED', 'MAPPED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOQ', 'MEASUREMENT_BOOK', 'RATE_ANALYSIS', 'MATERIAL_COMPARISON', 'RFI', 'SUBMITTAL', 'VARIATION_ORDER', 'RUNNING_ACCOUNT_BILL', 'SITE_MEMO', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('NOT_ORDERED', 'PO_RAISED', 'DELIVERED', 'INSTALLED', 'ON_HOLD', 'MISMATCH');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('INTAKE', 'RECONCILIATION', 'CHASE', 'RISK', 'CLIENT_INTELLIGENCE', 'HANDOFF');

-- CreateEnum
CREATE TYPE "AgentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('EXPRESSION_OF_INTEREST', 'BIDDING', 'SUBMITTED', 'UNDER_EVALUATION', 'NEGOTIATION', 'WON', 'LOST', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_CERTIFICATION', 'CERTIFIED', 'PAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "logoUrl" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "languagePreference" TEXT NOT NULL DEFAULT 'en',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "relationshipScore" INTEGER NOT NULL DEFAULT 100,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "phase" "ProjectPhase" NOT NULL DEFAULT 'EXECUTION',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "siteAddress" TEXT,
    "siteLatitude" DOUBLE PRECISION,
    "siteLongitude" DOUBLE PRECISION,
    "siteRadiusMeters" INTEGER,
    "ifcFileUrl" TEXT,
    "planFileUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_packages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "completedQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "zone" TEXT,
    "level" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_schemas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "sampleFileUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "templateSchemaId" UUID,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalFileUrl" TEXT NOT NULL,
    "canonicalPdfUrl" TEXT,
    "parsedJson" JSONB,
    "extractedEntities" JSONB,
    "mappedTemplate" JSONB,
    "deviationReport" JSONB,
    "confidenceScores" JSONB,
    "excelOutputUrl" TEXT,
    "errorMessage" TEXT,
    "processingMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_embeddings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workPackageId" UUID,
    "subcontractorId" UUID,
    "name" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'NOT_ORDERED',
    "modelElementId" UUID,
    "quantityOrdered" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "quantityDelivered" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "quantityBilled" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "quantityInstalled" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "ratePerUnit" DECIMAL(18,2),
    "supplierName" TEXT,
    "poNumber" TEXT,
    "poDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "grnNumber" TEXT,
    "deliveredSpec" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_elements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "ifcGlobalId" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "name" TEXT,
    "zone" TEXT,
    "level" TEXT,
    "colorStatus" TEXT NOT NULL DEFAULT 'NOT_ORDERED',

    CONSTRAINT "model_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_books" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workPackageId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "remarks" TEXT,
    "photoUrls" TEXT[],
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "syncedFromMobile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "running_account_bills" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "deductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "certifiedAmount" DECIMAL(18,2),
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "submittedDate" TIMESTAMP(3),
    "certifiedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "running_account_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "clientId" UUID,
    "name" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "status" "TenderStatus" NOT NULL DEFAULT 'EXPRESSION_OF_INTEREST',
    "estimatedValue" DECIMAL(18,2),
    "bidValue" DECIMAL(18,2),
    "winProbability" INTEGER,
    "submissionDate" TIMESTAMP(3),
    "resultDate" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "specialisation" TEXT[],
    "performanceScore" INTEGER NOT NULL DEFAULT 100,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID,
    "createdById" UUID,
    "agentType" "AgentType" NOT NULL,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "projectId" UUID,
    "userId" UUID,
    "eventType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "clients_tenantId_idx" ON "clients"("tenantId");

-- CreateIndex
CREATE INDEX "projects_tenantId_idx" ON "projects"("tenantId");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "work_packages_tenantId_idx" ON "work_packages"("tenantId");

-- CreateIndex
CREATE INDEX "work_packages_projectId_idx" ON "work_packages"("projectId");

-- CreateIndex
CREATE INDEX "template_schemas_tenantId_idx" ON "template_schemas"("tenantId");

-- CreateIndex
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");

-- CreateIndex
CREATE INDEX "documents_projectId_idx" ON "documents"("projectId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "document_embeddings_tenantId_idx" ON "document_embeddings"("tenantId");

-- CreateIndex
CREATE INDEX "document_embeddings_documentId_idx" ON "document_embeddings"("documentId");

-- CreateIndex
CREATE INDEX "materials_tenantId_idx" ON "materials"("tenantId");

-- CreateIndex
CREATE INDEX "materials_projectId_idx" ON "materials"("projectId");

-- CreateIndex
CREATE INDEX "materials_status_idx" ON "materials"("status");

-- CreateIndex
CREATE INDEX "model_elements_tenantId_idx" ON "model_elements"("tenantId");

-- CreateIndex
CREATE INDEX "model_elements_projectId_idx" ON "model_elements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "model_elements_projectId_ifcGlobalId_key" ON "model_elements"("projectId", "ifcGlobalId");

-- CreateIndex
CREATE INDEX "measurement_books_tenantId_idx" ON "measurement_books"("tenantId");

-- CreateIndex
CREATE INDEX "measurement_books_projectId_idx" ON "measurement_books"("projectId");

-- CreateIndex
CREATE INDEX "running_account_bills_tenantId_idx" ON "running_account_bills"("tenantId");

-- CreateIndex
CREATE INDEX "running_account_bills_projectId_idx" ON "running_account_bills"("projectId");

-- CreateIndex
CREATE INDEX "tenders_tenantId_idx" ON "tenders"("tenantId");

-- CreateIndex
CREATE INDEX "subcontractors_tenantId_idx" ON "subcontractors"("tenantId");

-- CreateIndex
CREATE INDEX "agent_jobs_tenantId_idx" ON "agent_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "agent_jobs_projectId_idx" ON "agent_jobs"("projectId");

-- CreateIndex
CREATE INDEX "agent_jobs_agentType_status_idx" ON "agent_jobs"("agentType", "status");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_seen_idx" ON "notifications"("userId", "seen");

-- CreateIndex
CREATE INDEX "notifications_projectId_createdAt_idx" ON "notifications"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_schemas" ADD CONSTRAINT "template_schemas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_templateSchemaId_fkey" FOREIGN KEY ("templateSchemaId") REFERENCES "template_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "work_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_modelElementId_fkey" FOREIGN KEY ("modelElementId") REFERENCES "model_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_elements" ADD CONSTRAINT "model_elements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "work_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_books" ADD CONSTRAINT "measurement_books_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "running_account_bills" ADD CONSTRAINT "running_account_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "running_account_bills" ADD CONSTRAINT "running_account_bills_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
