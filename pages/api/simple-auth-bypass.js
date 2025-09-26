// 绕过认证的简陋测试 - 直接测试API调用
export default async function handler(req, res) {
  console.log('[Bypass Test] 请求开始:', req.method)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[Bypass Test] 绕过认证，直接测试API调用')
    
    // 使用硬编码的用户ID进行测试
    const testUserId = 'a8d5633e-6438-420a-8818-946a961a6d88' // 你之前认证成功的用户ID
    
    // 获取请求数据
    const { group, category, amount, date, note } = req.body
    
    console.log('[Bypass Test] 请求数据:', {
      group, category, amount, date, note
    })
    
    if (!group || !category || !amount || !date) {
      return res.json({
        success: false,
        step: 'validation_failed',
        error: '缺少必需字段',
        received: { group, category, amount, date, note }
      })
    }
    
    // 构建API请求数据
    const requestData = {
      action: 'create',
      userId: testUserId,
      data: {
        category_group: group,
        category_code: category,
        amount: parseFloat(amount),
        note: note || '',
        ymd: date
      }
    }
    
    console.log('[Bypass Test] API请求数据:', JSON.stringify(requestData))
    
    // 调用主系统API
    const apiURL = 'https://verceteleg.vercel.app/api/records/record-system'
    console.log('[Bypass Test] 开始调用:', apiURL)
    
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    
    console.log('[Bypass Test] API响应状态:', response.status, response.statusText)
    
    // 处理响应
    const responseText = await response.text()
    console.log('[Bypass Test] API响应文本:', responseText)
    
    let responseData = null
    try {
      responseData = JSON.parse(responseText)
      console.log('[Bypass Test] API响应JSON:', responseData)
    } catch (parseError) {
      console.log('[Bypass Test] JSON解析失败:', parseError.message)
    }
    
    return res.json({
      success: response.ok,
      step: 'completed',
      test_results: {
        used_user_id: testUserId,
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
    console.error('[Bypass Test] 错误:', error)
    
    return res.json({
      success: false,
      step: 'error',
      error: error.message,
      stack: error.stack
    })
  }
}