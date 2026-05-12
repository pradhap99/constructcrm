import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  numeric,
  date,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── ENUMS ──────────────────────────────────────────────────────────────────
export const userRole = pgEnum('user_role', ['OWNER', 'MANAGER', 'VIEWER'])

export const clientType = pgEnum('client_type', [
  'Government',
  'Private',
  'PSU',
  'PPP',
])

export const projectStatus = pgEnum('project_status', [
  'AWARDED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
])

export const tenderStatus = pgEnum('tender_status', [
  'EOI',
  'BIDDING',
  'SUBMITTED',
  'EVALUATION',
  'WON',
  'LOST',
])

export const billStatus = pgEnum('bill_status', [
  'DRAFT',
  'SUBMITTED',
  'CERTIFIED',
  'PAID',
  'DISPUTED',
])

export const planTier = pgEnum('plan_tier', ['TRIAL', 'STARTER', 'PRO'])

// ─── TENANTS ────────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  // Tax defaults — power the bill form. Editable in /settings.
  defaultGstRate: numeric('default_gst_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('18.00'),
  defaultTdsRate: numeric('default_tds_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('2.00'),
  defaultRetentionRate: numeric('default_retention_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('5.00'),
  gstNumber: text('gst_number'),
  panNumber: text('pan_number'),
  planTier: planTier('plan_tier').notNull().default('TRIAL'),
  trialEndsAt: timestamp('trial_ends_at')
    .notNull()
    .default(sql`now() + interval '14 days'`),
  razorpaySubscriptionId: text('razorpay_subscription_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── USERS ──────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('MANAGER'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    tenantEmailUq: uniqueIndex('users_tenant_email_uq').on(t.tenantId, t.email),
    tenantIdx: index('users_tenant_idx').on(t.tenantId),
  }),
)

// ─── CLIENTS ────────────────────────────────────────────────────────────────
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: clientType('type').notNull(),
    contacts: jsonb('contacts')
      .$type<Array<{ name: string; role?: string; phone?: string; email?: string }>>()
      .notNull()
      .default([]),
    gstNumber: text('gst_number'),
    panNumber: text('pan_number'),
    address: text('address'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ tenantIdx: index('clients_tenant_idx').on(t.tenantId) }),
)

// ─── PROJECTS ───────────────────────────────────────────────────────────────
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    contractValue: numeric('contract_value', { precision: 18, scale: 2 }).notNull(),
    status: projectStatus('status').notNull().default('IN_PROGRESS'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    siteAddress: text('site_address'),
    description: text('description'),
    variations: jsonb('variations')
      .$type<
        Array<{
          id: string
          description: string
          value: number
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
          date: string
        }>
      >()
      .notNull()
      .default([]),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('projects_tenant_idx').on(t.tenantId),
    clientIdx: index('projects_client_idx').on(t.clientId),
    tenantCodeUq: uniqueIndex('projects_tenant_code_uq').on(t.tenantId, t.code),
  }),
)

// ─── TENDERS ────────────────────────────────────────────────────────────────
export const tenders = pgTable(
  'tenders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    type: clientType('type').notNull(),
    estimatedValue: numeric('estimated_value', { precision: 18, scale: 2 }),
    bidValue: numeric('bid_value', { precision: 18, scale: 2 }),
    status: tenderStatus('status').notNull().default('EOI'),
    submissionDate: date('submission_date'),
    referenceNumber: text('reference_number'),
    notes: text('notes'),
    convertedProjectId: uuid('converted_project_id').references(() => projects.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('tenders_tenant_idx').on(t.tenantId),
    tenantStatusIdx: index('tenders_tenant_status_idx').on(t.tenantId, t.status),
  }),
)

// ─── BILLS (the moat) ───────────────────────────────────────────────────────
export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    billNumber: text('bill_number').notNull(),
    billDate: date('bill_date').notNull(),
    status: billStatus('status').notNull().default('DRAFT'),
    // Tax math — all stored, never recomputed from rates
    grossAmount: numeric('gross_amount', { precision: 18, scale: 2 }).notNull(),
    gstRate: numeric('gst_rate', { precision: 5, scale: 2 }).notNull(),
    gstAmount: numeric('gst_amount', { precision: 18, scale: 2 }).notNull(),
    tdsRate: numeric('tds_rate', { precision: 5, scale: 2 }).notNull(),
    tdsAmount: numeric('tds_amount', { precision: 18, scale: 2 }).notNull(),
    retentionRate: numeric('retention_rate', { precision: 5, scale: 2 }).notNull(),
    retentionAmount: numeric('retention_amount', { precision: 18, scale: 2 }).notNull(),
    mobAdvanceRecovery: numeric('mob_advance_recovery', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    otherDeductions: numeric('other_deductions', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    netAmount: numeric('net_amount', { precision: 18, scale: 2 }).notNull(),
    certifiedAmount: numeric('certified_amount', { precision: 18, scale: 2 }),
    paidAmount: numeric('paid_amount', { precision: 18, scale: 2 }),
    submittedDate: date('submitted_date'),
    certifiedDate: date('certified_date'),
    paidDate: date('paid_date'),
    attachmentUrl: text('attachment_url'),
    notes: text('notes'),
    // AI-roadmap hook — leave null in v1, used in Phase 2 (BOQ extraction)
    embeddingPending: boolean('embedding_pending').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('bills_tenant_idx').on(t.tenantId),
    projectIdx: index('bills_project_idx').on(t.projectId),
    statusIdx: index('bills_tenant_status_idx').on(t.tenantId, t.status),
    tenantNumberUq: uniqueIndex('bills_tenant_number_uq').on(t.tenantId, t.billNumber),
  }),
)

// ─── VOICE NOTES (Phase 2 placeholder) ──────────────────────────────────────
export const voiceNotes = pgTable(
  'voice_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    audioUrl: text('audio_url').notNull(),
    transcript: text('transcript'),
    extractedJson: jsonb('extracted_json'),
    status: text('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({ tenantIdx: index('voice_notes_tenant_idx').on(t.tenantId) }),
)

export type Tenant = typeof tenants.$inferSelect
export type User = typeof users.$inferSelect
export type Client = typeof clients.$inferSelect
export type Project = typeof projects.$inferSelect
export type Tender = typeof tenders.$inferSelect
export type Bill = typeof bills.$inferSelect
