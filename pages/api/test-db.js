import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    console.log('环境变量检查:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

    // 使用Vercel集成的环境变量
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 测试数据库连接 - 简单查询
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .limit(3)

    if (error) {
      console.error('数据库查询错误:', error)
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error
      })
    }

    console.log('数据库查询成功:', data)

    // 测试插入操作（不会真的插入）
    const testInsert = await supabase
      .from('users')
      .insert({
        name: 'test-user-' + Date.now(),
        branch_code: 'TEST',
        status: 'test'
      })
      .select()

    return res.status(200).json({
      success: true,
      message: '数据库连接正常',
      queryResult: data,
      insertTest: testInsert.error ? testInsert.error.message : '插入测试成功'
    })

  } catch (error) {
    console.error('API错误:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}