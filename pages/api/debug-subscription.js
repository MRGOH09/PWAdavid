import { createClient } from '@supabase/supabase-js'
import { validateJWTToken } from '../../lib/auth'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  try {
    // JWT Token验证
    const user = await validateJWTToken(req)
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        step: 'JWT验证失败'
      })
    }

    if (req.method === 'POST') {
      const { subscription, deviceInfo } = req.body
      
      console.log('[调试] 开始订阅调试流程')
      console.log('[调试] 用户ID:', user.id)
      console.log('[调试] 订阅数据:', {
        endpoint: subscription?.endpoint?.slice(-50),
        hasKeys: !!subscription?.keys,
        p256dh: !!subscription?.keys?.p256dh,
        auth: !!subscription?.keys?.auth
      })

      // 步骤1: 验证输入数据
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.json({
          success: false,
          step: '数据验证',
          error: 'Invalid subscription data',
          details: {
            hasSubscription: !!subscription,
            hasEndpoint: !!subscription?.endpoint,
            hasKeys: !!subscription?.keys,
            hasP256dh: !!subscription?.keys?.p256dh,
            hasAuth: !!subscription?.keys?.auth
          }
        })
      }

      // 步骤2: 检查用户是否存在
      console.log('[调试] 检查用户存在性...')
      const { data: userExists, error: userError } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', user.id)
        .single()

      console.log('[调试] 用户查询结果:', { userExists, userError })

      if (userError || !userExists) {
        return res.json({
          success: false,
          step: '用户验证',
          error: '用户不存在',
          details: { userError, userExists }
        })
      }

      // 步骤3: 删除现有订阅
      console.log('[调试] 删除现有订阅...')
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)

      console.log('[调试] 删除结果:', { deleteError })

      // 步骤4: 插入新订阅
      console.log('[调试] 插入新订阅...')
      const insertData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: deviceInfo?.userAgent || '',
        device_info: deviceInfo || {},
        last_used: new Date().toISOString()
      }

      console.log('[调试] 插入数据:', {
        user_id: insertData.user_id,
        endpoint_length: insertData.endpoint.length,
        p256dh_length: insertData.p256dh.length,
        auth_length: insertData.auth.length,
        has_device_info: !!insertData.device_info
      })

      const { data, error: insertError } = await supabase
        .from('push_subscriptions')
        .insert(insertData)

      console.log('[调试] 插入结果:', { data, insertError })

      if (insertError) {
        return res.json({
          success: false,
          step: '数据库插入',
          error: insertError.message,
          details: {
            code: insertError.code,
            hint: insertError.hint,
            details: insertError.details
          }
        })
      }

      return res.json({
        success: true,
        step: '完成',
        message: '订阅保存成功',
        data: { insertedId: data?.[0]?.id }
      })

    } else {
      // GET 请求 - 返回调试信息
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, name, telegram_id')
        .eq('id', user.id)
        .single()

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)

      return res.json({
        user: userInfo,
        subscriptions: subscriptions || [],
        subscriptionCount: subscriptions?.length || 0
      })
    }

  } catch (error) {
    console.error('[调试] 捕获异常:', error)
    return res.status(500).json({
      success: false,
      step: '异常处理',
      error: error.message,
      stack: error.stack
    })
  }
}