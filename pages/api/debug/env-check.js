export default async function handler(req, res) {
  // 检查环境变量是否正确设置
  const envCheck = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    
    // 显示部分值用于调试（隐藏敏感信息）
    SUPABASE_URL_value: process.env.SUPABASE_URL,
    SERVICE_KEY_prefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 30) + '...',
    ANON_KEY_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...',
    
    // 检查两个key是否相同（这应该是false）
    keys_are_same: process.env.SUPABASE_SERVICE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  
  // 测试Supabase连接
  let supabaseTest = null
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    
    // 尝试查询一个简单的表
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    supabaseTest = {
      connection: 'success',
      error: error ? error.message : null,
      hasData: !!data
    }
  } catch (error) {
    supabaseTest = {
      connection: 'failed',
      error: error.message
    }
  }
  
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envCheck,
    supabaseTest
  })
}