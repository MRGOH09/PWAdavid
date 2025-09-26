import { createClient } from '@supabase/supabase-js'

// 使用Vercel-Supabase集成的环境变量
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // POST请求：检查email是否存在用户
    if (req.method === 'POST') {
      const { email } = req.body
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' })
      }
      
      console.log(`[Auth Check] 检查email是否存在: ${email}`)
      
      // 查询用户是否存在
      const { data: profileData, error } = await supabase
        .from('user_profile')
        .select('email, user_id')
        .eq('email', email)
        .single()
      
      const userExists = !error && !!profileData  // KISS: 转换为boolean值
      
      console.log(`[Auth Check] Email ${email} 存在: ${userExists}`)
      console.log(`[Auth Check] Profile data:`, profileData)
      
      return res.status(200).json({
        userExists  // 现在已经是boolean了
      })
    }
    
    // GET请求：使用Supabase原生认证检查
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ 
        authenticated: false 
      })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // 使用Supabase验证token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(200).json({ 
        authenticated: false 
      })
    }

    console.log(`[Auth Check] 验证用户: ${user.id} (${user.email})`)

    // 通过user_profile.email获取完整用户信息
    const { data: profileData, error: profileError } = await supabase
      .from('user_profile')
      .select(`
        user_id,
        display_name,
        monthly_income,
        a_pct,
        email,
        users!inner (
          id,
          name,
          branch_code,
          status
        )
      `)
      .eq('email', user.email)
      .single()

    if (profileError) {
      console.error('[Auth Check] Profile查询失败:', profileError)
      return res.status(200).json({ authenticated: false })
    }

    const profile = {
      display_name: profileData.display_name,
      monthly_income: profileData.monthly_income,
      a_pct: profileData.a_pct
    }
    
    const userData = profileData.users

    // 判断是否需要完成注册
    const needsRegistration = !profile || 
      !profile.display_name || 
      !profile.monthly_income || 
      profile.a_pct === null || 
      profile.a_pct === undefined

    console.log(`[Auth Check] 用户注册状态:`, {
      hasProfile: !!profile,
      hasDisplayName: !!profile?.display_name,
      hasMonthlyIncome: !!profile?.monthly_income,
      hasExpensePercentage: profile?.a_pct !== null && profile?.a_pct !== undefined,
      needsRegistration
    })

    return res.status(200).json({
      authenticated: true,
      needsRegistration,
      user: {
        id: userData.id,
        email: profileData.email,
        name: userData.name,
        branch_code: userData.branch_code,
        profile: profile ? {
          display_name: profile.display_name,
          monthly_income: profile.monthly_income,
          expense_percentage: profile.a_pct
        } : null
      }
    })

  } catch (error) {
    console.error('[Auth Check] 认证检查失败:', error)
    return res.status(500).json({
      authenticated: false,
      error: 'Auth check failed'
    })
  }
}