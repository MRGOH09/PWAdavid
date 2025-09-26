// KISS原则：最简单的注册API
export default async function handler(req, res) {
  console.log('=== 简单注册API开始 ===')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { displayName, branchCode, monthlyIncome, expensePercentage, userEmail } = req.body
  
  console.log('收到数据:', { displayName, branchCode, monthlyIncome, expensePercentage, userEmail })
  
  // 基础验证 - KISS
  if (!displayName || !branchCode || !monthlyIncome || !userEmail) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  try {
    // KISS: 直接使用环境变量，不复杂判断
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('数据库连接创建')

    // Step 1: 创建users
    console.log('第1步：创建users记录')
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ 
        name: displayName, 
        branch_code: branchCode, 
        status: 'active' 
      })
      .select()
      .single()

    if (userError) {
      console.error('创建users失败:', userError)
      throw userError
    }
    
    console.log('users创建成功, ID:', user.id)

    // Step 2: 创建user_profile  
    console.log('第2步：创建user_profile记录')
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        user_id: user.id,
        display_name: displayName,
        monthly_income: parseInt(monthlyIncome),
        a_pct: parseInt(expensePercentage),
        email: userEmail
      })

    if (profileError) {
      console.error('创建profile失败:', profileError)
      // 回滚：删除已创建的user
      await supabase.from('users').delete().eq('id', user.id)
      throw profileError
    }
    
    console.log('user_profile创建成功')
    console.log('=== 注册完成 ===')

    return res.status(200).json({ 
      success: true, 
      userId: user.id,
      message: '注册成功' 
    })

  } catch (error) {
    console.error('注册失败:', error)
    return res.status(500).json({ 
      error: error.message || '注册失败' 
    })
  }
}