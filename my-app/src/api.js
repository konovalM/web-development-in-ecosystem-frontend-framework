export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const USER_ID = 'me'

async function handle(res) {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
      }
    } catch {
      void 0
    }
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

const json = { 'Content-Type': 'application/json' }

export function getVideos(title) {
  const qs = title ? `?title=${encodeURIComponent(title)}` : ''
  return fetch(`${API_URL}/video${qs}`).then(handle)
}

export function getVideo(id) {
  return fetch(`${API_URL}/video/${id}`).then(handle)
}

export function createVideo(data) {
  return fetch(`${API_URL}/video`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(data),
  }).then(handle)
}

export function getFavorites() {
  return fetch(`${API_URL}/favorites?userId=${USER_ID}`).then(handle)
}

export function addFavorite(videoId) {
  return fetch(`${API_URL}/favorites`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ videoId, userId: USER_ID }),
  }).then(handle)
}

export function removeFavorite(videoId) {
  return fetch(`${API_URL}/favorites/${videoId}?userId=${USER_ID}`, {
    method: 'DELETE',
  }).then(handle)
}
