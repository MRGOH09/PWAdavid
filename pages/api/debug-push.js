import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  try {
    // 检查环境变量
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NEXT_PUBLIC_FCM_VAPID_KEY: !!process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY
    }

    // 检查表是否存在 - 分别查询每个表
    const tableChecks = await Promise.all([
      supabase.from('users').select('count').limit(1),
      supabase.from('push_subscriptions').select('count').limit(1),
      supabase.from('push_logs').select('count').limit(1)
    ])

    const tableCheck = {
      users: !tableChecks[0].error,
      push_subscriptions: !tableChecks[1].error,
      push_logs: !tableChecks[2].error
    }

    const tableErrors = {
      users: tableChecks[0].error?.message,
      push_subscriptions: tableChecks[1].error?.message,
      push_logs: tableChecks[2].error?.message
    }

    return res.json({
      environment: envCheck,
      database: {
        tables: tableCheck,
        errors: tableErrors
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Debug Push] 错误:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}