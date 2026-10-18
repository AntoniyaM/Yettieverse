export const SAVE_CODE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/
const MAX_BYTES = 64 * 1024

export const saveCode = (raw: string | undefined) => {
  const code = (raw ?? '').toUpperCase()
  if (!SAVE_CODE.test(code)) throw createError({ statusCode: 400, statusMessage: 'Invalid save code' })
  return code
}

// Light shape check: enough to keep junk out of storage, not a full schema.
export const validateSave = (body: unknown, code: string) => {
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Missing save body' })
  const s = body as Record<string, unknown>
  if (s.version !== 1 || s.code !== code) throw createError({ statusCode: 400, statusMessage: 'Save does not match code' })
  if (JSON.stringify(s).length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Save too large' })
  for (const k of ['quests', 'inventory', 'abilities', 'flags'] as const)
    if (typeof s[k] !== 'object' || s[k] === null) throw createError({ statusCode: 400, statusMessage: `Bad field: ${k}` })
  return s
}
