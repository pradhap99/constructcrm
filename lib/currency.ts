/**
 * Indian currency formatting.
 *
 * formatINR    — full ₹ with en-IN grouping. ₹12,34,567
 * formatINRShort — lakhs/crores shortcut for KPI tiles. ₹12.35 L, ₹1.23 Cr
 * paiseToRupees / rupeesToPaise — for any future paise-level math
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const INR_FRACTIONAL_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatINR(amount: number, opts: { fractional?: boolean } = {}): string {
  if (!Number.isFinite(amount)) return '₹0'
  return opts.fractional
    ? INR_FRACTIONAL_FORMATTER.format(amount)
    : INR_FORMATTER.format(amount)
}

export function formatINRShort(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0'
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`
  return `${sign}₹${abs.toFixed(0)}`
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
