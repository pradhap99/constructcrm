import { z } from 'zod'

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
