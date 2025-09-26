import jwt from 'jsonwebtoken'
import { verifyTelegramAuth, getOrCreateUserByTelegram } from '../../../lib/auth'

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
    
    const { id, first_name, username, photo_url, auth_date, hash, returnTo } = req.query
    
    console.log(`[PWA Auth] 收到认证请求: telegram_id=${id}, name=${first_name}`)
    console.log(`[PWA Auth] 环境变量检查:`, {
      hasJWT: !!process.env.JWT_SECRET,
      hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      nodeEnv: process.env.NODE_ENV
    })
    
    // 如果没有hash，说明是从Bot直接跳转的，跳过hash验证
    if (hash) {
      console.log(`[PWA Auth] 开始hash验证，hash=${hash}`)
      // 验证Telegram认证数据
      if (!verifyTelegramAuth(req.query, process.env.TELEGRAM_BOT_TOKEN)) {
        console.error(`[PWA Auth] Telegram认证验证失败`)
        return res.status(401).json({ error: 'Invalid Telegram authentication' })
      }
      console.log(`[PWA Auth] Telegram认证验证成功`)
    } else {
      console.log(`[PWA Auth] Bot直接跳转，跳过hash验证`)
    }
    
    // 获取或创建用户
    const user = await getOrCreateUserByTelegram({
      id: parseInt(id),
      first_name: first_name || username || 'User',
      username: username
    })
    
    console.log(`[PWA Auth] 用户获取成功: ${user.id}`)
    
    // 生成JWT Token
    const token = jwt.sign(
      { 
        telegram_id: parseInt(id),
        user_id: user.id,
        name: user.name
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    console.log(`[PWA Auth] JWT Token生成成功`)
    
    // 设置HttpOnly Cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = isProduction 
      ? 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'
      : 'Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'
      
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; ${cookieOptions}`,
      `user_name=${encodeURIComponent(user.name)}; Path=/; SameSite=Lax; Max-Age=2592000`
    ])
    
    console.log(`[PWA Auth] Cookie options: ${cookieOptions}`)
    
    // 重定向到callback页面，传递token和returnTo
    const callbackUrl = `/auth-callback?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo || '/')}`
    console.log(`[PWA Auth] Cookie设置成功，重定向到callback页面`)
    
    // 重定向到callback页面处理token保存
    return res.redirect(callbackUrl)
    
  } catch (error) {
    console.error('[PWA Auth] 认证错误:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}