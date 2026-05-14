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
