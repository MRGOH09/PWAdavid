export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[Debug Env] 检查环境变量...')
    
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      supabaseUrl: process.env.SUPABASE_URL ? 'https://*****.supabase.co' : 'MISSING',
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.length : 0,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...' : 'MISSING',
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    }
    
    console.log('[Debug Env] 环境变量检查结果:', envCheck)

    // 尝试连接Supabase
    let supabaseTest = null
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )
      
      // 简单的连接测试 - 查询users表结构
      const { error: schemaError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        
      if (schemaError) {
        supabaseTest = {
          connection: 'failed',
          error: schemaError.message,
          code: schemaError.code
        }
      } else {
        supabaseTest = {
          connection: 'success',
          message: 'Successfully connected to Supabase'
        }
      }
    } catch (error) {
      supabaseTest = {
        connection: 'error',
        error: error.message
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      env: envCheck,
      supabase: supabaseTest
    })

  } catch (error) {
    console.error('[Debug Env] 错误:', error)
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message
    })
  }
}