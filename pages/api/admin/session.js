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
      const { password } = req.body || {}
      const expected = process.env.ADMIN_PORTAL_PASSWORD
      if (!expected) return res.status(500).json({ error: 'Admin password not configured' })
      if (!password || password !== expected) return res.status(401).json({ error: 'Invalid password' })
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

