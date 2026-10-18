export default defineEventHandler(async (event) => {
  const code = saveCode(getRouterParam(event, 'code'))
  const snap = await saveDoc(code).get()
  if (!snap.exists) throw createError({ statusCode: 404, statusMessage: 'No save with that code.' })
  return snap.data()
})
