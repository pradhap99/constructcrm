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
