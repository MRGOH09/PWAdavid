// 增强版注册API - 收集完整的用户资料
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log('=== 增强版注册API开始 ===')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    displayName, 
    phone,
    branchCode, 
    monthlyIncome, 
    expensePercentage, 
    userEmail,
    travelBudget,
    medicalInsurance,
    carInsurance
  } = req.body
  
  console.log('收到增强版注册数据:', { 
    displayName, 
    phone,
    branchCode, 
    monthlyIncome, 
    expensePercentage, 
    userEmail,
    travelBudget,
    medicalInsurance,
    carInsurance
  })
  
  // 基础验证 - KISS
  if (!displayName || !branchCode || !monthlyIncome || !userEmail) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  if (expensePercentage === undefined || expensePercentage < 0 || expensePercentage > 100) {
    return res.status(400).json({ error: '开销占比应该在0-100%之间' })
  }

  try {
    // KISS: 直接使用环境变量，不复杂判断
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

    // Step 2: 创建增强版user_profile  
    console.log('第2步：创建增强版user_profile记录')
    const { error: profileError } = await supabase
      .from('user_profile')
      .insert({
        user_id: user.id,
        display_name: displayName,
        phone_e164: phone || null,
        monthly_income: parseInt(monthlyIncome),
        a_pct: parseInt(expensePercentage),
        email: userEmail,
        
        // 年度预算字段
        travel_budget_annual: parseFloat(travelBudget) || 0,
        annual_medical_insurance: parseFloat(medicalInsurance) || 0,
        annual_car_insurance: parseFloat(carInsurance) || 0
        
        // 注意：推送通知偏好设置需要单独存储，不在user_profile表中
      })

    if (profileError) {
      console.error('创建profile失败:', profileError)
      // 回滚：删除已创建的user
      await supabase.from('users').delete().eq('id', user.id)
      throw profileError
    }
    
    console.log('增强版user_profile创建成功')


    console.log('=== 增强版注册完成 ===')

    // 计算一些预览数据返回给前端
    const monthlyBudget = {
      livingExpenses: monthlyIncome * (expensePercentage / 100),
      epf: monthlyIncome * 0.24,
      travelMonthly: (parseFloat(travelBudget) || 0) / 12,
      medicalMonthly: (parseFloat(medicalInsurance) || 0) / 12,
      carInsuranceMonthly: (parseFloat(carInsurance) || 0) / 12
    }

    return res.status(200).json({ 
      success: true, 
      userId: user.id,
      message: '增强版注册成功',
      preview: {
        monthlyBudget,
        totalAnnualCommitments: (parseFloat(travelBudget) || 0) + (parseFloat(medicalInsurance) || 0) + (parseFloat(carInsurance) || 0)
      }
    })

  } catch (error) {
    console.error('增强版注册失败:', error)
    return res.status(500).json({ 
      error: error.message || '注册失败' 
    })
  }
}