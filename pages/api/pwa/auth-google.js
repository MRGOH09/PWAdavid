import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// 复用现有的getOrCreateUserByTelegram逻辑，但适配Google用户
async function getOrCreateUserByGoogle(googleData) {
  const { googleId, email, name, picture } = googleData
  console.log(`[getOrCreateUserByGoogle] 查询用户 google_id: ${googleId}, email: ${email}`)
  
  // 查找现有用户（根据现有数据库结构，可能没有google_id字段）
  let { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('id, name, branch_code, telegram_id')
    .eq('name', name) // 先尝试用name查找
    .maybeSingle()
    
  console.log(`[getOrCreateUserByGoogle] 现有用户查询结果:`, existingUser)
  
  let userId = null
  
  if (!existingUser) {
    console.log(`[getOrCreateUserByGoogle] 用户不存在，创建新用户`)
    // 创建新用户 - 使用与Telegram相同的字段结构
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name: name || email.split('@')[0],
        branch_code: null, // 新用户默认无分行，等待设置
        status: 'active'
      })
      .select('id, name, branch_code')
      .single()
    
    if (createError) throw createError
    userId = newUser.id
    
    console.log(`[getOrCreateUserByGoogle] 新用户创建成功: ${userId}`)
  } else {
    userId = existingUser.id
    console.log(`[getOrCreateUserByGoogle] 用户已存在，当前分行: ${existingUser.branch_code}`)
    
    // 更新用户名（如果需要）
    if (name && name !== existingUser.name) {
      await supabase
        .from('users')
        .update({ name: name })
        .eq('id', userId)
        
      console.log(`[getOrCreateUserByGoogle] 用户名更新成功`)
    }
  }
  
  // 确保用户profile存在 - 使用与Telegram相同的profile结构
  const { data: existingProfile } = await supabase
    .from('user_profile')
    .select('display_name, email, avatar_url')
    .eq('user_id', userId)
    .maybeSingle()
    
  console.log(`[getOrCreateUserByGoogle] 现有profile:`, existingProfile)
  
  if (!existingProfile) {
    // 创建新profile
    await supabase
      .from('user_profile')
      .insert({
        user_id: userId,
        display_name: name || email.split('@')[0],
        email: email,
        avatar_url: picture,
        language: 'zh'
      })
  } else {
    // 更新profile（只更新空的字段）
    const updateData = {}
    if (email && !existingProfile.email) updateData.email = email
    if (picture && !existingProfile.avatar_url) updateData.avatar_url = picture
    if (name && !existingProfile.display_name) updateData.display_name = name
    
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('user_profile')
        .update(updateData)
        .eq('user_id', userId)
    }
  }
  
  console.log(`[getOrCreateUserByGoogle] profile upsert完成`)
  
  // 返回最终用户信息 - 与Telegram格式保持一致
  const { data: finalUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
    
  console.log(`[getOrCreateUserByGoogle] 最终用户分行: ${finalUser.branch_code}`)
  
  return finalUser
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { googleId, email, name, picture, email_verified } = req.body

    console.log(`[PWA Google Auth] 收到认证请求: email=${email}, name=${name}`)

    if (!googleId || !email) {
      return res.status(400).json({ error: '缺少必要的认证信息' })
    }

    // 使用类似Telegram的用户创建逻辑
    const user = await getOrCreateUserByGoogle({
      googleId,
      email, 
      name,
      picture
    })
    
    console.log(`[PWA Google Auth] 用户获取成功: ${user.id}`)
    
    // 生成JWT Token - 与Telegram认证相同的格式
    const token = jwt.sign(
      { 
        user_id: user.id,
        name: user.name,
        email: email,
        provider: 'google'
        // 注意：不设置telegram_id，保持与Google用户的区别
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    console.log(`[PWA Google Auth] JWT Token生成成功`)
    
    // 设置HttpOnly Cookie - 与Telegram认证相同
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = isProduction 
      ? 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'
      : 'Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'
      
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; ${cookieOptions}`,
      `user_name=${encodeURIComponent(user.name)}; Path=/; SameSite=Lax; Max-Age=2592000`
    ])
    
    console.log(`[PWA Google Auth] Cookie设置成功`)

    // 返回成功响应
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: email,
        name: user.name,
        picture: picture,
        branch_code: user.branch_code
      }
    })

  } catch (error) {
    console.error('[PWA Google Auth] 认证错误:', error)
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    })
  }
}