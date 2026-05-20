// FastAPI returns 422 validation errors as { detail: [{ type, loc, msg, input, url }, ...] }.
// Rendering that array (or any object) as a React child throws React error #31, so any error
// shown to the user must be coerced to a plain string here.
type PydanticErrorItem = { msg?: unknown; loc?: unknown }

const isPydanticItem = (v: unknown): v is PydanticErrorItem =>
  typeof v === 'object' && v !== null && 'msg' in v

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message) return err.message

  const response = (err as { response?: { data?: unknown } } | undefined)?.response
  const data = response?.data

  let detail: unknown = data
  if (data && typeof data === 'object' && 'detail' in data) {
    detail = (data as { detail: unknown }).detail
  }

  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (isPydanticItem(item) && typeof item.msg === 'string') {
          const loc = Array.isArray(item.loc) ? item.loc.filter((p) => p !== 'body').join('.') : ''
          return loc ? `${loc}: ${item.msg}` : item.msg
        }
        return ''
      })
      .filter(Boolean)
    if (messages.length) return messages.join('; ')
  }

  return fallback
}
