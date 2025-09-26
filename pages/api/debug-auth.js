import { validateJWTToken } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[DEBUG] 开始认证调试')
    
    // 详细的请求头和Cookie分析
    const cookies = req.headers.cookie || 'no cookies'
    const authorization = req.headers.authorization || 'no authorization'
    
    console.log('[DEBUG] Cookies:', cookies)
    console.log('[DEBUG] Authorization:', authorization)
    
    // 提取token的详细过程
    let token = null
    let tokenSource = 'none'
    
    if (req.headers.cookie) {
      const cookiePairs = req.headers.cookie.split(';')
      for (const pair of cookiePairs) {
        const [name, value] = pair.split('=').map(c => c.trim())
        if (name === 'auth_token' || name === 'auth') {
          token = value
          tokenSource = `cookie:${name}`
          break
        }
      }
    }
    
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '')
      tokenSource = 'authorization_header'
    }
    
    console.log(`[DEBUG] Token source: ${tokenSource}`)
    console.log(`[DEBUG] Token found: ${!!token}`)
    console.log(`[DEBUG] Token preview: ${token ? token.substring(0, 20) + '...' : 'null'}`)
    
    // 尝试验证用户
    const user = await validateJWTToken(req)
    
    console.log(`[DEBUG] User validation result:`, user ? `User ID: ${user.id}` : 'null')
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      hasToken: !!token,
      tokenSource,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length-10)}` : null,
      userValidated: !!user,
      userId: user ? user.id : null,
      userName: user ? user.name : null,
      cookieHeader: !!req.headers.cookie,
      authHeader: !!req.headers.authorization,
      jwtSecretAvailable: !!process.env.JWT_SECRET
    }
    
    return res.json({
      status: user ? 'Authentication Success' : 'Authentication Failed',
      authenticated: !!user,
      debug: debugInfo
    })
    
  } catch (error) {
    console.error('[DEBUG] Authentication error:', error)
    
    return res.json({
      status: 'Authentication Error',
      authenticated: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        jwtSecretAvailable: !!process.env.JWT_SECRET
      }
    })
  }
}