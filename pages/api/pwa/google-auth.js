import jwt from 'jsonwebtoken'
import { getOrCreateUserByEmail, verifyGoogleToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { googleId, email, name, picture, idToken } = req.body

    console.log(`[Google Auth] 收到认证请求: email=${email}, name=${name}`)

    // 验证Google ID Token
    const isValidToken = await verifyGoogleToken(idToken)
    if (!isValidToken) {
      console.error('[Google Auth] Google token验证失败')
      return res.status(401).json({ error: 'Invalid Google token' })
    }
    
    console.log('[Google Auth] Google token验证成功')

    // 获取或创建用户
    const user = await getOrCreateUserByEmail({
      email,
      name,
      picture,
      googleId
    })
    
    console.log(`[Google Auth] 用户处理完成: ${user.id}, 需要注册: ${user.needsRegistration}`)

    // 生成JWT Token - 基于email
    const token = jwt.sign(
      {
        email: user.email,
        user_id: user.id,
        name: user.name,
        google_id: user.google_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log(`[Google Auth] JWT Token生成成功`)

    // 设置HttpOnly Cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = isProduction
      ? 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'
      : 'Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'

    res.setHeader('Set-Cookie', [
      `auth_token=${token}; ${cookieOptions}`,
      `user_name=${encodeURIComponent(user.name)}; Path=/; SameSite=Lax; Max-Age=2592000`
    ])

    // 返回成功响应，包含注册状态
    return res.status(200).json({
      success: true,
      token,
      needsRegistration: user.needsRegistration,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        branch_code: user.branch_code,
        google_id: user.google_id
      }
    })

  } catch (error) {
    console.error('[Google Auth] 认证错误:', error)
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    })
  }
}