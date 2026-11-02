export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function request(
  path,
  { user, method = 'GET', body, signal } = {}
) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers: {
      ...(user ? { 'X-Demo-User': String(user) } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json()
      message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || message
    } catch {
      /* response may not be JSON */
    }
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}
export function videoPage(
  path,
  { q = '', channelId = '', cursor = '', limit = 20 } = {},
  options
) {
  const query = new URLSearchParams({ limit: String(limit) })
  if (q) query.set('q', q)
  if (channelId) query.set('channelId', channelId)
  if (cursor) query.set('cursor', cursor)
  return request(`${path}?${query}`, options)
}
export const statusLabel = {
  published: 'Опубликовано',
  draft: 'Черновик',
  hidden: 'Скрыто'
}
export const bytes = (value = '0') =>
  `${BigInt(value).toLocaleString('ru-RU')} Б`
