import { createClient } from '@supabase/supabase-js'

// 使用Vercel-Supabase集成的环境变量
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing token' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' })
    }

    console.log(`[Register Google User] 开始注册新用户: ${user.email}`)

    const { displayName, branchCode, monthlyIncome, expensePercentage } = req.body

    // 验证输入数据
    if (!displayName || displayName.trim().length < 2) {
      return res.status(400).json({ error: '昵称至少需要2个字符' })
    }

    if (!branchCode) {
      return res.status(400).json({ error: '请选择分行' })
    }

    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ error: '请输入有效的月收入' })
    }

    if (expensePercentage === undefined || expensePercentage < 0 || expensePercentage > 100) {
      return res.status(400).json({ error: '开销占比应该在0-100%之间' })
    }

    // 检查用户是否已存在
    const { data: existingProfile } = await supabase
      .from('user_profile')
      .select('user_id')
      .eq('email', user.email)
      .single()

    if (existingProfile) {
      console.log(`[Register Google User] 用户已存在: ${existingProfile.user_id}`)
      return res.status(400).json({ error: '用户已存在', userId: existingProfile.user_id })
    }
    
    // 检查是否有同email的users记录（可能之前创建了但没有profile）
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('name', user.email)
      .single()
      
    if (existingUserByEmail) {
      console.log(`[Register Google User] 发现孤立的users记录: ${existingUserByEmail.id}`)
      // 如果有孤立的users记录，使用它而不是创建新的
      const { error: profileError } = await supabase
        .from('user_profile')
        .insert({
          user_id: existingUserByEmail.id,
          display_name: displayName.trim(),
          monthly_income: monthlyIncome,
          a_pct: expensePercentage,
          email: user.email,
          google_id: user.id
        })
        
      if (profileError) {
        console.error('[Register Google User] 为孤立用户创建profile失败:', profileError)
        throw profileError
      }
      
      // 更新users记录
      await supabase
        .from('users')
        .update({
          branch_code: branchCode,
          status: 'active',
          source: 'google_oauth'
        })
        .eq('id', existingUserByEmail.id)
      
      return res.status(200).json({
        success: true,
        message: '注册成功（使用现有用户记录）',
        user: {
          id: existingUserByEmail.id,
          email: user.email,
          name: user.email,
          branch_code: branchCode,
          display_name: displayName,
          monthly_income: monthlyIncome,
          expense_percentage: expensePercentage
        }
      })
    }

    console.log(`[Register Google User] 创建新用户记录`)

    // 从Google OAuth用户元数据获取名称
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || displayName

    // 1. 在users表创建基本用户记录
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: googleName,
        branch_code: branchCode,
        status: 'active',
        source: 'google_oauth'  // 标记来源
      })
      .select()
      .single()

    if (userError) {
      console.error('[Register Google User] 创建users记录失败:', userError)
      throw userError
    }

    console.log(`[Register Google User] 创建users记录成功，ID: ${newUser.id}`)

    // 2. 在user_profile表创建详细资料
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        user_id: newUser.id,
        display_name: displayName.trim(),
        monthly_income: monthlyIncome,
        a_pct: expensePercentage,
        email: user.email,
        google_id: user.id  // 保存Google Auth UID
      })

    if (profileError) {
      console.error('[Register Google User] 创建user_profile记录失败:', profileError)
      
      // 如果profile创建失败，删除已创建的user记录
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id)
      
      throw profileError
    }

    console.log(`[Register Google User] 用户注册成功: ${newUser.id}`)

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        email: user.email,
        name: googleName,
        branch_code: branchCode,
        display_name: displayName,
        monthly_income: monthlyIncome,
        expense_percentage: expensePercentage
      }
    })

  } catch (error) {
    console.error('[Register Google User] 注册失败:', error)
    return res.status(500).json({
      error: 'Registration failed',
      message: error.message
    })
  }
}