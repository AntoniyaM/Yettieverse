export default defineEventHandler(async (event) => {
  const code = saveCode(getRouterParam(event, 'code'))
  const data = validateSave(await readBody(event), code)
  const stored = { ...data, serverUpdatedAt: Date.now() }
  await useStorage('saves').setItem(code, stored)
  return { ok: true, code, serverUpdatedAt: stored.serverUpdatedAt }
})
