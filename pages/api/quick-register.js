// 快速简单的注册API
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // 立即返回响应状态
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('快速注册API开始')
    
    const { displayName, branchCode, monthlyIncome, expensePercentage, userEmail } = req.body
    
    // 基本验证
    if (!displayName || !branchCode || !monthlyIncome || expensePercentage === undefined) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    
    if (!userEmail) {
      return res.status(400).json({ error: '缺少用户邮箱' })
    }

    console.log('验证通过，开始数据库操作')

    // 创建Supabase客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 1. 先创建users记录
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: displayName,
        branch_code: branchCode,
        status: 'active'
      })
      .select()
      .single()

    if (userError) {
      console.error('创建用户失败:', userError)
      return res.status(500).json({ error: '创建用户失败: ' + userError.message })
    }

    console.log('用户创建成功:', newUser.id)

    // 2. 创建user_profile记录
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        user_id: newUser.id,
        display_name: displayName,
        monthly_income: parseInt(monthlyIncome),
        a_pct: parseInt(expensePercentage),
        email: userEmail
      })

    if (profileError) {
      console.error('创建profile失败:', profileError)
      // 删除已创建的用户记录
      await supabase.from('users').delete().eq('id', newUser.id)
      return res.status(500).json({ error: '创建用户档案失败: ' + profileError.message })
    }

    console.log('注册完成')

    return res.status(200).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        name: displayName,
        email: userEmail
      }
    })

  } catch (error) {
    console.error('注册API错误:', error)
    return res.status(500).json({
      error: '注册失败: ' + error.message
    })
  }
}