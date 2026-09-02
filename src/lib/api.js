export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const requestHeaders = new Headers(headers)
  const options = { method, headers: requestHeaders, credentials: 'include' }

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, options)
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }

  return payload
}

export function createRoom(room) {
  return request('/rooms', { method: 'POST', body: room })
}

export function getAuthConfig() {
  return request('/auth/config')
}

export function getCurrentUser() {
  return request('/auth/me')
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export function getRoom(id) {
  return request(`/rooms/${encodeURIComponent(id)}`)
}

export function deleteRoom(id, ownerToken) {
  return request(`/rooms/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: ownerToken ? { 'x-owner-token': ownerToken } : {},
  })
}

export function claimRoom(id, ownerToken) {
  return request(`/rooms/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    headers: ownerToken ? { 'x-owner-token': ownerToken } : {},
  })
}

export function upsertAvailability(entry) {
  return request(`/rooms/${encodeURIComponent(entry.room_id)}/availability`, {
    method: 'PUT',
    body: { name: entry.name, slots: entry.slots },
  })
}

export function getAvailabilities(roomId) {
  return request(`/rooms/${encodeURIComponent(roomId)}/availability`)
}
