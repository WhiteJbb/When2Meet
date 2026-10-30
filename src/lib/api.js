const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const requestHeaders = new Headers(headers)
  const options = { method, headers: requestHeaders }

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

export function getRoom(id) {
  return request(`/rooms/${encodeURIComponent(id)}`)
}

export function deleteRoom(id, ownerToken) {
  return request(`/rooms/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: ownerToken ? { 'x-owner-token': ownerToken } : {},
  })
}

export function upsertAvailability(entry) {
  return request(`/rooms/${encodeURIComponent(entry.room_id)}/availability`, {
    method: 'PUT',
    body: { name: entry.name, slots: entry.slots },
    headers: { 'x-response-token': entry.responseToken },
  })
}

export function getAvailabilities(roomId, responseToken) {
  return request(`/rooms/${encodeURIComponent(roomId)}/availability`, {
    headers: responseToken ? { 'x-response-token': responseToken } : {},
  })
}

export function getResponseToken(roomId) {
  const key = `w2w-response-token-${roomId}`
  let token = localStorage.getItem(key)
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(key, token)
  }
  return token
}
