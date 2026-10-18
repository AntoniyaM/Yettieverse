export default defineEventHandler(async (event) => {
  const code = saveCode(getRouterParam(event, 'code'))
  const data = validateSave(await readBody(event), code)
  const stored = { ...data, code, serverUpdatedAt: Date.now() }
  await saveDoc(code).set(stored)
  return { ok: true, code, serverUpdatedAt: stored.serverUpdatedAt }
})
