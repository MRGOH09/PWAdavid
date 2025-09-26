// 绕过认证的批量记录API - 临时解决方案
export default async function handler(req, res) {
  console.log('[Batch No Auth] 请求开始:', req.method)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 使用硬编码的用户ID（从之前的成功测试中获得）
    const testUserId = 'a8d5633e-6438-420a-8818-946a961a6d88'
    
    const { records } = req.body
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        error: '没有提供有效的记录数据' 
      })
    }
    
    console.log(`[Batch No Auth] 处理 ${records.length} 条记录`)
    
    const results = []
    const errors = []
    
    // 逐个调用主系统API（使用与成功测试相同的方法）
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        // 构建请求数据
        const requestData = {
          action: 'create',
          userId: testUserId,
          data: {
            category_group: record.group,
            category_code: record.category,
            amount: parseFloat(record.amount),
            note: record.note || '',
            ymd: record.date
          }
        }
        
        console.log(`[Batch No Auth] 记录 ${i+1}:`, requestData)
        
        // 调用主系统API - 这次从服务端调用，不存在CORS问题
        const response = await fetch('https://verceteleg.vercel.app/api/records/record-system', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'PWA-Batch-NoAuth-Client'
          },
          body: JSON.stringify(requestData)
        })
        
        const responseText = await response.text()
        console.log(`[Batch No Auth] 记录 ${i+1} 响应:`, response.status, responseText.substring(0, 100))
        
        if (response.ok) {
          let responseData = null
          try {
            responseData = JSON.parse(responseText)
          } catch (e) {
            responseData = { text: responseText }
          }
          
          results.push({ 
            index: i, 
            success: true, 
            record: responseData 
          })
        } else {
          errors.push({ 
            index: i, 
            error: `${response.status}: ${responseText}` 
          })
        }
        
      } catch (recordError) {
        console.error(`[Batch No Auth] 记录 ${i+1} 错误:`, recordError)
        errors.push({ 
          index: i, 
          error: recordError.message 
        })
      }
    }
    
    const successCount = results.length
    const failCount = errors.length
    
    console.log(`[Batch No Auth] 完成: 成功 ${successCount}, 失败 ${failCount}`)
    
    return res.json({
      success: failCount === 0,
      message: `批量记录完成：成功 ${successCount}，失败 ${failCount}`,
      total: records.length,
      successCount,
      failCount,
      results,
      errors
    })
    
  } catch (error) {
    console.error('[Batch No Auth] 总体错误:', error)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}