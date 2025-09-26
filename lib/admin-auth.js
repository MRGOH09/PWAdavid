import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'admin_session'

export function signAdminToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'change_me'
  const payload = { role: 'admin', iat: Math.floor(Date.now() / 1000) }
  return jwt.sign(payload, secret, { expiresIn: '6h' })
}

export function verifyAdminToken(token) {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'change_me'
    const decoded = jwt.verify(token, secret)
    return decoded && decoded.role === 'admin'
  } catch {
    return false
  }
}

export function setAdminCookie(res) {
  const token = signAdminToken()
  const isProd = process.env.NODE_ENV === 'production'
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${6 * 60 * 60}${isProd ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

export function clearAdminCookie(res) {
  const isProd = process.env.NODE_ENV === 'production'
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

export function hasValidAdminSession(req) {
  try {
    const cookies = req.headers.cookie || ''
    const cookie = cookies.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`))
    if (!cookie) return false
    const token = cookie.split('=')[1]
    return verifyAdminToken(token)
  } catch {
    return false
  }
}

