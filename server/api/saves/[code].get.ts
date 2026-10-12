export default defineEventHandler(async (event) => {
  const code = saveCode(getRouterParam(event, 'code'))
  const data = await useStorage('saves').getItem(code)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'No save with that code' })
  return data
})
