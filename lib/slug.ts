/**
 * URL-safe slug from arbitrary firm/project text. ASCII-only, lowercase,
 * hyphen-separated, max 64 chars (matches tenants.slug varchar length).
 *
 * Examples:
 *   "Patel & Co Constructions"   → "patel-co-constructions"
 *   "RK Builders (Pvt) Ltd."     → "rk-builders-pvt-ltd"
 *   "श्री राम कन्स्ट्रक्शन"            → "shree-ram-construction" (best-effort; falls back to a random suffix when stripped clean)
 */
export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return normalized || `firm-${randomSuffix(6)}`
}

/** 4-char URL-safe random suffix used to disambiguate slug collisions. */
export function randomSuffix(length = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}
