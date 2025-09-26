import { getOrCreateUserByEmail } from '../../../lib/auth'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, name } = req.body

    console.log(`[Test Login] 测试登录: email=${email}, name=${name}`)

    // 创建或获取用户
    const user = await getOrCreateUserByEmail({
      email: email || 'test@example.com',
      name: name || '测试用户',
      picture: '',
      googleId: 'test_google_id'
    })

    console.log(`[Test Login] 用户处理完成:`, user)

    // 生成JWT Token
    const token = jwt.sign(
      {
        email: user.email,
        user_id: user.id,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log(`[Test Login] JWT Token生成成功`)

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
        branch_code: user.branch_code
      }
    })

  } catch (error) {
    console.error('[Test Login] 测试登录失败:', error)
    return res.status(500).json({
      error: 'Test login failed',
      message: error.message
    })
  }
}