// 测试批量记录
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[Batch Test] 开始测试批量记录')
    
    // 使用硬编码的用户ID进行测试
    const testUserId = 'a8d5633e-6438-420a-8818-946a961a6d88'
    
    // 准备测试记录
    const testRecords = [
      {
        group: 'A',
        category: 'food',
        amount: '10.00',
        date: '2025-08-27',
        note: '测试记录1'
      },
      {
        group: 'A',
        category: 'shop',
        amount: '20.00',
        date: '2025-08-27',
        note: '测试记录2'
      }
    ]
    
    console.log('[Batch Test] 测试记录:', testRecords)
    
    // 方法1: 逐个调用create (当前PWA使用的方法)
    const singleResults = []
    const singleErrors = []
    
    for (let i = 0; i < testRecords.length; i++) {
      const record = testRecords[i]
      try {
        const response = await fetch('https://verceteleg.vercel.app/api/records/record-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            userId: testUserId,
            data: {
              category_group: record.group,
              category_code: record.category,
              amount: parseFloat(record.amount),
              note: record.note || '',
              ymd: record.date
            }
          })
        })
        
        const result = await response.text()
        singleResults.push({
          index: i,
          status: response.status,
          ok: response.ok,
          result: result.substring(0, 100)
        })
      } catch (error) {
        singleErrors.push({
          index: i,
          error: error.message
        })
      }
    }
    
    // 方法2: 使用batch-create action
    let batchResult = null
    try {
      const batchResponse = await fetch('https://verceteleg.vercel.app/api/records/record-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-create',
          userId: testUserId,
          data: testRecords.map(r => ({
            category_group: r.group,
            category_code: r.category,
            amount: parseFloat(r.amount),
            note: r.note || '',
            ymd: r.date
          }))
        })
      })
      
      const batchText = await batchResponse.text()
      batchResult = {
        status: batchResponse.status,
        ok: batchResponse.ok,
        result: batchText.substring(0, 200)
      }
    } catch (error) {
      batchResult = {
        error: error.message
      }
    }
    
    return res.json({
      success: true,
      test_user_id: testUserId,
      method1_single_calls: {
        results: singleResults,
        errors: singleErrors
      },
      method2_batch_create: batchResult
    })
    
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}