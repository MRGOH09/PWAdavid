// 公共健康检查API - 不需要认证
export default function handler(req, res) {
  // 设置CORS头，允许外部访问
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      deployment: 'pwa-google-vercel',
      environment: process.env.NODE_ENV || 'unknown',
      
      // 环境变量检查（不暴露实际值）
      envCheck: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN
      },
      
      // 基本系统信息
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        isVercel: !!process.env.VERCEL,
        vercelRegion: process.env.VERCEL_REGION || 'unknown'
      },
      
      // 配置状态
      config: {
        googleClientIdLength: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length : 0,
        jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        supabaseUrlValid: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.includes('supabase.co') : false
      }
    }

    res.status(200).json(healthData)
  } catch (error) {
    console.error('[public-health] Error:', error)
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}