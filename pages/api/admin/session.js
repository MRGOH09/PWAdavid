import { hasValidAdminSession, setAdminCookie, clearAdminCookie } from '../../../lib/admin-auth'

export default async function handler(req, res) {
  const { action } = req.method === 'POST' ? req.body || {} : req.query || {}

  if (req.method === 'GET') {
    if ((action || 'status') === 'status') {
      return res.status(200).json({ ok: true, authenticated: hasValidAdminSession(req) })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (action === 'login') {
      const { username, password } = req.body || {}
      const expectedUser = process.env.ADMIN_USERNAME || 'DAVID'
      const expectedPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_PORTAL_PASSWORD || 'Abcd1234'
      if (!username || !password) return res.status(400).json({ error: 'username and password required' })
      if (username !== expectedUser || password !== expectedPass) return res.status(401).json({ error: 'Invalid credentials' })
      setAdminCookie(res)
      return res.status(200).json({ ok: true })
    }
    if (action === 'logout') {
      clearAdminCookie(res)
      return res.status(200).json({ ok: true })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Admin session error' })
  }
}
