// 调试API - 检查Vercel环境变量配置状态
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 检查关键环境变量是否存在（不输出实际值，只检查存在性）
  const envCheck = {
    timestamp: new Date().toISOString(),
    NODE_ENV: process.env.NODE_ENV,
    hasJWT_SECRET: !!process.env.JWT_SECRET,
    hasSUPABASE_URL: !!process.env.SUPABASE_URL,
    hasSUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    hasTELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    
    // 检查JWT_SECRET长度（不输出内容）
    JWT_SECRET_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    JWT_SECRET_starts_with: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 8) : null,
    
    // 平台信息
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    vercel_region: process.env.VERCEL_REGION || 'unknown'
  }

  return res.json({
    status: 'Environment Check',
    data: envCheck,
    allVariablesPresent: envCheck.hasJWT_SECRET && 
                       envCheck.hasSUPABASE_URL && 
                       envCheck.hasSUPABASE_SERVICE_KEY && 
                       envCheck.hasTELEGRAM_BOT_TOKEN
  })
}