export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  const { id } = req.query
  // 后端基础域名：优先 x-backend-base 头、其后 ?base=，最后使用环境变量
  const headerBase = req.headers['x-backend-base']
  const queryBase = req.query.base
  const envBase = process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.BACKEND_BASE
  const base = String(headerBase || queryBase || envBase || '').replace(/\/$/, '')

  if (!base) {
    return res.status(501).json({
      error: 'Backend base is not configured. Provide header x-backend-base, query ?base=, or set NEXT_PUBLIC_BACKEND_BASE/BACKEND_BASE.',
    })
  }
  const url = `${base}/api/admin/papers/${encodeURIComponent(id)}/gemini/build-phase1-prompt`
  try {
    const upstream = await fetch(url)
    const text = await upstream.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { prompt: text }
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error || text || `HTTP ${upstream.status}` })
    }
    return res.status(200).json(data)
  } catch (err) {
    return res.status(502).json({ error: `Upstream request failed: ${err.message}` })
  }
}

