// 简陋版本 - 直接测试记录功能
import { validateJWTToken } from '../../lib/auth'

export default async function handler(req, res) {
  console.log('[Simple Test] 请求开始:', req.method)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 步骤0: 检查环境变量
    console.log('[Simple Test] 步骤0: 检查环境变量')
    const envCheck = {
      has_JWT_SECRET: !!process.env.JWT_SECRET,
      JWT_SECRET_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      has_SUPABASE_URL: !!process.env.SUPABASE_URL,
      has_SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      cookies: req.headers.cookie || 'no cookies',
      authorization: req.headers.authorization || 'no auth header'
    }
    console.log('[Simple Test] 环境变量检查:', envCheck)
    
    // 步骤1: 认证用户
    console.log('[Simple Test] 步骤1: 开始用户认证')
    const user = await validateJWTToken(req)
    
    if (!user) {
      console.log('[Simple Test] 用户认证失败')
      
      // 尝试从cookie中直接获取token进行调试
      let debugToken = null
      if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.split('=').map(c => c.trim())
          acc[name] = value
          return acc
        }, {})
        debugToken = cookies.auth_token || cookies.auth || null
      }
      
      return res.json({
        success: false,
        step: 'auth_failed',
        error: '用户认证失败',
        debug: {
          env: envCheck,
          has_token: !!debugToken,
          token_preview: debugToken ? debugToken.substring(0, 20) + '...' : null,
          cookies_found: req.headers.cookie ? Object.keys(req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name] = cookie.split('=').map(c => c.trim())
            acc[name] = true
            return acc
          }, {})) : []
        }
      })
    }
    
    console.log('[Simple Test] 用户认证成功:', user.id, user.name)
    
    // 步骤2: 获取请求数据
    console.log('[Simple Test] 步骤2: 解析请求数据')
    const { group, category, amount, date, note } = req.body
    
    console.log('[Simple Test] 请求数据:', {
      group, category, amount, date, note
    })
    
    if (!group || !category || !amount || !date) {
      console.log('[Simple Test] 缺少必需字段')
      return res.json({
        success: false,
        step: 'validation_failed',
        error: '缺少必需字段',
        received: { group, category, amount, date, note }
      })
    }
    
    // 步骤3: 构建API请求数据
    console.log('[Simple Test] 步骤3: 构建API请求数据')
    const requestData = {
      action: 'create',
      userId: user.id,
      data: {
        category_group: group,
        category_code: category,
        amount: parseFloat(amount),
        note: note || '',
        ymd: date
      }
    }
    
    console.log('[Simple Test] API请求数据:', requestData)
    
    // 步骤4: 调用主系统API - 使用最简单的方式
    console.log('[Simple Test] 步骤4: 调用主系统API')
    const apiURL = 'https://verceteleg.vercel.app/api/records/record-system'
    console.log('[Simple Test] API URL:', apiURL)
    
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    
    console.log('[Simple Test] API响应状态:', response.status, response.statusText)
    
    // 步骤5: 处理响应
    const responseText = await response.text()
    console.log('[Simple Test] API响应文本:', responseText)
    
    let responseData = null
    try {
      responseData = JSON.parse(responseText)
      console.log('[Simple Test] API响应JSON:', responseData)
    } catch (parseError) {
      console.log('[Simple Test] JSON解析失败:', parseError.message)
    }
    
    return res.json({
      success: true,
      step: 'completed',
      test_results: {
        user_id: user.id,
        user_name: user.name,
        request_data: requestData,
        api_url: apiURL,
        api_response: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          text: responseText,
          json: responseData
        }
      }
    })
    
  } catch (error) {
    console.error('[Simple Test] 错误:', error)
    
    return res.json({
      success: false,
      step: 'error',
      error: error.message,
      stack: error.stack
    })
  }
}