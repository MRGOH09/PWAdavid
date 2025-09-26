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
    // 使用Supabase验证用户身份
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing token' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' })
    }

    console.log(`[Complete Registration] 用户 ${user.id} 开始完成注册`)

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

    console.log(`[Complete Registration] 验证通过，开始更新用户资料`)

    // 首先获取用户完整信息（通过email查询）
    const { data: userProfile, error: getUserError } = await supabase
      .from('user_profile')
      .select(`
        user_id,
        email,
        users!inner (
          id,
          name,
          branch_code
        )
      `)
      .eq('email', user.email)
      .single()

    if (getUserError) {
      console.error('[Complete Registration] 获取用户信息失败:', getUserError)
      throw getUserError
    }

    const userId = userProfile.user_id

    // 更新用户基本信息（分行）
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        branch_code: branchCode
      })
      .eq('id', userId)

    if (userUpdateError) {
      console.error('[Complete Registration] 更新用户基本信息失败:', userUpdateError)
      throw userUpdateError
    }

    // 更新用户详细资料
    const { error: profileUpdateError } = await supabase
      .from('user_profile')
      .update({
        display_name: displayName.trim(),
        monthly_income: monthlyIncome,
        a_pct: expensePercentage
      })
      .eq('user_id', userId)

    if (profileUpdateError) {
      console.error('[Complete Registration] 更新用户资料失败:', profileUpdateError)
      throw profileUpdateError
    }

    console.log(`[Complete Registration] 用户 ${userId} 注册完成成功`)

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '注册完成',
      user: {
        id: userId,
        email: userProfile.email,
        name: userProfile.users.name,
        branch_code: branchCode,
        display_name: displayName,
        monthly_income: monthlyIncome,
        expense_percentage: expensePercentage
      }
    })

  } catch (error) {
    console.error('[Complete Registration] 注册完成失败:', error)
    return res.status(500).json({
      error: 'Registration completion failed',
      message: error.message
    })
  }
}