import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// JWT Token验证 - 基于email
export async function validateJWTToken(req) {
  try {
    // 从Cookie或Authorization header获取token
    let token = null
    
    if (req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie)
      token = cookies.auth_token || cookies.auth
    }
    
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '')
    }
    
    if (!token) {
      return null
    }
    
    // 验证JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 获取用户信息 - 通过user_profile.email查询，保持向后兼容
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select(`
        user_id,
        email,
        display_name,
        users!inner (
          id,
          name,
          branch_code,
          status,
          created_at
        )
      `)
      .eq('email', decoded.email)
      .single()
      
    if (profileError) {
      console.error('Database error:', profileError)
      return null
    }
    
    // 重新构造用户对象
    const user = {
      id: userProfile.users.id,
      name: userProfile.users.name,
      branch_code: userProfile.users.branch_code,
      email: userProfile.email,
      display_name: userProfile.display_name
    }
      
    if (dbError) {
      console.error('Database error:', dbError)
      return null
    }
    
    return user
  } catch (error) {
    console.error('JWT validation error:', error)
    return null
  }
}

// Google OAuth用户验证 - 验证Google ID Token
export async function verifyGoogleToken(idToken) {
  // 在生产环境中，应该调用Google API验证token
  // 这里简化处理，在实际部署时需要完善
  try {
    // 开发环境跳过验证，生产环境需要验证
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    
    // 生产环境验证Google token
    // const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
    // const data = await response.json()
    // return data.aud === process.env.GOOGLE_CLIENT_ID
    
    return true // 临时返回true，需要后续完善
  } catch (error) {
    console.error('Google token verification error:', error)
    return false
  }
}

// 获取或创建用户 - 基于email
export async function getOrCreateUserByEmail(googleData) {
  const { email, name, picture, googleId } = googleData
  console.log(`[getOrCreateUserByEmail] 查询用户 email: ${email}`)
  
  // 查找现有用户 - 通过user_profile.email查询
  let { data: existingProfile, error: profileError } = await supabase
    .from('user_profile')
    .select(`
      user_id,
      email,
      display_name,
      monthly_income,
      a_pct,
      users!inner (
        id,
        name,
        branch_code,
        status
      )
    `)
    .eq('email', email)
    .maybeSingle()
    
  console.log(`[getOrCreateUserByEmail] 现有用户查询结果:`, existingProfile)
  
  let userId = null
  let existingUser = null
  
  if (!existingProfile) {
    console.log(`[getOrCreateUserByEmail] 用户不存在，创建新用户`)
    // 创建新用户 - 不添加email字段到users表，保持兼容性
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name: name || 'User',
        branch_code: 'MAIN', // 默认分行
        status: 'active'
      })
      .select('id, name, branch_code')
      .single()
    
    if (createError) throw createError
    userId = newUser.id
    existingUser = newUser
    
    console.log(`[getOrCreateUserByEmail] 新用户创建成功: ${userId}`)
  } else {
    userId = existingProfile.user_id
    existingUser = existingProfile.users
    console.log(`[getOrCreateUserByEmail] 用户已存在，当前分行: ${existingUser.branch_code}`)
    
    // 更新用户基本信息（如果需要）
    await supabase
      .from('users')
      .update({ 
        name: name || existingUser.name
      })
      .eq('id', userId)
      
    console.log(`[getOrCreateUserByEmail] 用户信息更新成功`)
  }
  
  // 确保用户profile存在并包含email
  let finalProfile = existingProfile
  
  if (!existingProfile) {
    // 新用户创建基础profile
    const { data: newProfile, error: profileInsertError } = await supabase
      .from('user_profile')
      .insert({
        user_id: userId,
        display_name: name || 'User',
        email: email,
        language: 'zh'
      })
      .select('display_name, monthly_income, a_pct')
      .single()
      
    if (profileInsertError) throw profileInsertError
    finalProfile = {
      ...newProfile,
      users: existingUser
    }
  } else {
    // 更新已有profile的email（如果需要）
    if (existingProfile.email !== email) {
      await supabase
        .from('user_profile')
        .update({ email: email })
        .eq('user_id', userId)
    }
    finalProfile = existingProfile
  }
  
  console.log(`[getOrCreateUserByEmail] profile处理完成`)
  
  // 检查是否需要完成注册
  const isFullyRegistered = finalProfile && 
    finalProfile.display_name && 
    finalProfile.monthly_income && 
    (finalProfile.a_pct !== null && finalProfile.a_pct !== undefined)
    
  console.log(`[getOrCreateUserByEmail] 用户注册状态: ${isFullyRegistered ? '完整' : '需要完成注册'}`)
  
  // 返回统一格式的用户信息
  return {
    id: userId,
    name: existingUser.name,
    branch_code: existingUser.branch_code,
    status: existingUser.status,
    email: email,
    needsRegistration: !isFullyRegistered
  }
}

// Cookie解析工具
function parseCookies(cookieString) {
  return cookieString
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, value] = cookie.split('=').map(c => c.trim())
      cookies[name] = value
      return cookies
    }, {})
}

// 日期工具函数
export function formatYMD(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getYYYYMM(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function getEndOfMonth(yyyymm) {
  const year = parseInt(yyyymm.slice(0, 4))
  const month = parseInt(yyyymm.slice(5, 7))
  const lastDay = new Date(year, month, 0).getDate()
  return `${yyyymm}-${lastDay.toString().padStart(2, '0')}`
}