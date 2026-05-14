import { z } from 'zod'

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export const CLIENT_TYPES = ['Government', 'Private', 'PSU', 'PPP'] as const
export const ClientTypeSchema = z.enum(CLIENT_TYPES)
export type ClientType = z.infer<typeof ClientTypeSchema>

export const ClientContactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required').max(80),
  role: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email()]).optional(),
})
export type ClientContact = z.infer<typeof ClientContactSchema>

export const ClientCreateSchema = z.object({
  name: z.string().trim().min(2, 'Client name must be at least 2 characters').max(120),
  type: ClientTypeSchema,
  gstNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  panNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
})
export type ClientCreateInput = z.infer<typeof ClientCreateSchema>

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES = [
  'AWARDED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES)
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

export const VARIATION_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const
export const VariationStatusSchema = z.enum(VARIATION_STATUSES)
export type VariationStatus = z.infer<typeof VariationStatusSchema>

export const ProjectVariationSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().min(1, 'Variation description is required').max(400),
  value: z.number().finite(),
  status: VariationStatusSchema,
  date: z.string().min(1), // ISO YYYY-MM-DD
})
export type ProjectVariation = z.infer<typeof ProjectVariationSchema>

export const ProjectCreateSchema = z
  .object({
    clientId: z.string().uuid('Pick a client'),
    name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(160),
    code: z.string().trim().min(1, 'Project code is required').max(40),
    contractValue: z
      .number({ invalid_type_error: 'Contract value must be a number' })
      .nonnegative()
      .max(9_999_999_999_999.99),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    status: ProjectStatusSchema.default('IN_PROGRESS'),
    siteAddress: z.string().trim().max(500).optional(),
    description: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>

// ─── BILLS ───────────────────────────────────────────────────────────────────

export const BILL_STATUSES = ['DRAFT', 'SUBMITTED', 'CERTIFIED', 'PAID', 'DISPUTED'] as const
export const BillStatusSchema = z.enum(BILL_STATUSES)
export type BillStatus = z.infer<typeof BillStatusSchema>

export const BillCreateSchema = z.object({
  projectId: z.string().uuid('Pick a project'),
  billNumber: z.string().trim().min(1, 'Bill number is required').max(40),
  billDate: z.string().min(1, 'Bill date is required'),
  grossAmount: z
    .number({ invalid_type_error: 'Gross must be a number' })
    .nonnegative()
    .max(9_999_999_999_999.99),
  gstRate: z.number().min(0).max(50),
  tdsRate: z.number().min(0).max(50),
  retentionRate: z.number().min(0).max(50),
  mobAdvanceRecovery: z.number().nonnegative().default(0),
  otherDeductions: z.number().nonnegative().default(0),
  attachmentUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(2000).optional(),
})
export type BillCreateInput = z.infer<typeof BillCreateSchema>

// ─── TENDERS ─────────────────────────────────────────────────────────────────

export const TENDER_STATUSES = [
  'EOI',
  'BIDDING',
  'SUBMITTED',
  'EVALUATION',
  'WON',
  'LOST',
] as const
export const TenderStatusSchema = z.enum(TENDER_STATUSES)
export type TenderStatus = z.infer<typeof TenderStatusSchema>

/** The "forward" status path. LOST is a side-branch from any non-terminal state. */
export const TENDER_FORWARD_PATH: Record<TenderStatus, TenderStatus | null> = {
  EOI: 'BIDDING',
  BIDDING: 'SUBMITTED',
  SUBMITTED: 'EVALUATION',
  EVALUATION: 'WON',
  WON: null,
  LOST: null,
}

export const TenderCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Tender name must be at least 2 characters').max(160),
    type: ClientTypeSchema,
    clientId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    estimatedValue: z
      .number({ invalid_type_error: 'Estimated value must be a number' })
      .nonnegative()
      .max(9_999_999_999_999.99)
      .optional(),
    bidValue: z
      .number({ invalid_type_error: 'Bid value must be a number' })
      .nonnegative()
      .max(9_999_999_999_999.99)
      .optional(),
    status: TenderStatusSchema.default('EOI'),
    submissionDate: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    referenceNumber: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !(v.bidValue && v.estimatedValue && v.bidValue < 0), {
    message: 'Bid value cannot be negative',
    path: ['bidValue'],
  })
export type TenderCreateInput = z.infer<typeof TenderCreateSchema>

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const LoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof LoginInputSchema>

export const RegisterInputSchema = z.object({
  firmName: z
    .string()
    .trim()
    .min(2, 'Firm name must be at least 2 characters')
    .max(80, 'Firm name is too long'),
  ownerName: z
    .string()
    .trim()
    .min(2, 'Your name must be at least 2 characters')
    .max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  gstNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  panNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
})

export type RegisterInput = z.infer<typeof RegisterInputSchema>
