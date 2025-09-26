// 调试PWA记录API的具体错误
import { validateJWTToken } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[DEBUG Record] 开始记录调试')
    
    // 1. 验证用户身份
    const user = await validateJWTToken(req)
    if (!user) {
      return res.json({
        step: 'auth_failed',
        error: '用户认证失败',
        authenticated: false
      })
    }
    
    console.log(`[DEBUG Record] 用户认证成功: ${user.id}`)
    
    // 2. 模拟调用主系统API
    const testRecord = {
      group: 'A',
      category: 'food',
      amount: 10.00,
      date: new Date().toISOString().slice(0, 10),
      note: '测试记录'
    }
    
    // 构建API请求URL
    const baseURL = process.env.NODE_ENV === 'production' 
      ? '' // 生产环境使用相对路径
      : 'http://localhost:3000' // 开发环境需要主系统在3000端口运行
    
    const apiURL = `${baseURL}/api/records/record-system`
    console.log(`[DEBUG Record] API URL: ${apiURL}`)
    
    const requestBody = {
      action: 'create',
      userId: user.id,
      data: {
        category_group: testRecord.group,
        category_code: testRecord.category,
        amount: parseFloat(testRecord.amount),
        note: testRecord.note || '',
        ymd: testRecord.date
      }
    }
    
    console.log(`[DEBUG Record] Request body:`, requestBody)
    
    try {
      const response = await fetch(apiURL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'PWA-Debug-Client'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log(`[DEBUG Record] API Response status: ${response.status}`)
      console.log(`[DEBUG Record] API Response headers:`, Object.fromEntries(response.headers.entries()))
      
      let responseData = null
      const responseText = await response.text()
      console.log(`[DEBUG Record] API Response text:`, responseText)
      
      try {
        responseData = JSON.parse(responseText)
        console.log(`[DEBUG Record] API Response JSON:`, responseData)
      } catch (parseError) {
        console.log(`[DEBUG Record] JSON解析失败:`, parseError.message)
      }
      
      return res.json({
        step: 'api_call_completed',
        authenticated: true,
        user: { id: user.id, name: user.name },
        api_url: apiURL,
        request_body: requestBody,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          parsed: responseData,
          success: response.ok
        }
      })
      
    } catch (fetchError) {
      console.error(`[DEBUG Record] Fetch错误:`, fetchError)
      return res.json({
        step: 'api_call_failed',
        authenticated: true,
        user: { id: user.id, name: user.name },
        api_url: apiURL,
        request_body: requestBody,
        fetch_error: {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack
        }
      })
    }
    
  } catch (error) {
    console.error('[DEBUG Record] 总体错误:', error)
    
    return res.json({
      step: 'general_error',
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    })
  }
}