const BASE = '/api'

const j = async (res) => {
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || JSON.stringify(data) || `HTTP ${res.status}`)
  return data
}

const h = { 'Content-Type': 'application/json' }

export default {
  getAgents:    ()           => fetch(`${BASE}/agents/`).then(j),
  createAgent:  (body)       => fetch(`${BASE}/agents/`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(j),
  updateAgent:  (slug, body) => fetch(`${BASE}/agents/${slug}/`, { method: 'PUT', headers: h, body: JSON.stringify(body) }).then(j),
  deleteAgent:  (slug)       => fetch(`${BASE}/agents/${slug}/`, { method: 'DELETE' }).then(j),
  getTools:     ()           => fetch(`${BASE}/tools/`).then(j),
  syncTools:    ()           => fetch(`${BASE}/tools/sync/`, { method: 'POST' }).then(j),
  chat:         (slug, body) => fetch(`${BASE}/agents/${slug}/chat/`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(j),
  getSessions:  (slug)       => fetch(`${BASE}/agents/${slug}/sessions/`).then(j),
  getSession:   (id)         => fetch(`${BASE}/sessions/${id}/`).then(j),
  getUsage:     (slug = '')  => fetch(`${BASE}/usage/${slug ? `?agent=${slug}` : ''}`).then(j),
}
