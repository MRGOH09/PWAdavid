import { useState } from 'react'
import Layout from '../components/Layout'

export default function TestBatchPage() {
  const [testData, setTestData] = useState({
    userId: 'a8d5633e-6438-420a-8818-946a961a6d88',
    records: [
      {
        group: 'A',
        category: 'food',
        amount: '10.50',
        date: new Date().toISOString().slice(0, 10),
        note: '早餐'
      },
      {
        group: 'A',
        category: 'shop',
        amount: '25.00',
        date: new Date().toISOString().slice(0, 10),
        note: '日用品'
      },
      {
        group: 'A',
        category: 'trans',
        amount: '8.00',
        date: new Date().toISOString().slice(0, 10),
        note: '公交车'
      },
      {
        group: 'B',
        category: 'book',
        amount: '45.90',
        date: new Date().toISOString().slice(0, 10),
        note: '学习书籍'
      },
      {
        group: 'A',
        category: 'ent',
        amount: '30.00',
        date: new Date().toISOString().slice(0, 10),
        note: '电影票'
      }
    ]
  })
  
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 测试方法1：逐个调用（当前PWA方法）
  const testMethod1 = async () => {
    setLoading(true)
    setResult(null)
    
    const results = []
    const errors = []
    
    for (let i = 0; i < testData.records.length; i++) {
      const record = testData.records[i]
      try {
        const response = await fetch('https://verceteleg.vercel.app/api/records/record-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            userId: testData.userId,
            data: {
              category_group: record.group,
              category_code: record.category,
              amount: parseFloat(record.amount),
              note: record.note,
              ymd: record.date
            }
          })
        })
        
        const responseText = await response.text()
        let responseData = null
        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          // JSON解析失败
        }
        
        results.push({
          index: i,
          status: response.status,
          ok: response.ok,
          data: responseData,
          text: responseText.substring(0, 100)
        })
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        })
      }
    }
    
    setResult({
      method: '逐个调用 (当前PWA方法)',
      totalRecords: testData.records.length,
      successCount: results.filter(r => r.ok).length,
      failCount: results.filter(r => !r.ok).length + errors.length,
      results,
      errors,
      timestamp: new Date().toISOString()
    })
    
    setLoading(false)
  }
  
  // 测试方法2：批量API调用
  const testMethod2 = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('https://verceteleg.vercel.app/api/records/record-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-create',
          userId: testData.userId,
          data: testData.records.map(r => ({
            category_group: r.group,
            category_code: r.category,
            amount: parseFloat(r.amount),
            note: r.note,
            ymd: r.date
          }))
        })
      })
      
      const responseText = await response.text()
      let responseData = null
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        // JSON解析失败
      }
      
      setResult({
        method: '批量API (batch-create)',
        totalRecords: testData.records.length,
        response: {
          status: response.status,
          ok: response.ok,
          data: responseData,
          text: responseText
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        method: '批量API (batch-create)',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  // 测试绕过认证的批量记录（解决方案）
  const testNoAuthBatch = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/batch-no-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: testData.records
        })
      })
      
      const responseText = await response.text()
      let responseData = null
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        // JSON解析失败
      }
      
      setResult({
        method: '🎯 绕过认证批量记录 (解决方案)',
        totalRecords: testData.records.length,
        successCount: responseData?.successCount || 0,
        failCount: responseData?.failCount || 0,
        response: {
          status: response.status,
          ok: response.ok,
          data: responseData,
          text: responseText.substring(0, 500)
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        method: '绕过认证批量记录',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }

  // 测试PWA批量记录端点
  const testPWABatch = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-add-records',
          records: testData.records
        })
      })
      
      const responseText = await response.text()
      let responseData = null
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        // JSON解析失败
      }
      
      setResult({
        method: 'PWA批量端点 (/api/pwa/data)',
        totalRecords: testData.records.length,
        response: {
          status: response.status,
          ok: response.ok,
          data: responseData,
          text: responseText.substring(0, 500)
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        method: 'PWA批量端点',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  return (
    <Layout>
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🧪 批量记录测试</h1>
        
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="font-bold mb-2">测试数据</h2>
          <div className="text-sm">
            <p>用户ID: {testData.userId}</p>
            <p>记录数: {testData.records.length}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">查看记录详情</summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(testData.records, null, 2)}
              </pre>
            </details>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={testMethod1}
            disabled={loading}
            className="block w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? '测试中...' : '📝 测试方法1: 逐个调用 (当前PWA方法)'}
          </button>
          
          <button
            onClick={testMethod2}
            disabled={loading}
            className="block w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? '测试中...' : '📦 测试方法2: 批量API (batch-create)'}
          </button>
          
          <button
            onClick={testNoAuthBatch}
            disabled={loading}
            className="block w-full bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? '测试中...' : '🎯 测试绕过认证批量记录 (解决方案)'}
          </button>
          
          <button
            onClick={testPWABatch}
            disabled={loading}
            className="block w-full bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? '测试中...' : '🔐 测试PWA批量端点 (需要认证)'}
          </button>
        </div>
        
        {result && (
          <div className="bg-white border rounded p-4">
            <h2 className="font-bold mb-2">测试结果</h2>
            <div className="text-sm">
              <p className="mb-2">
                <span className="font-semibold">方法:</span> {result.method}
              </p>
              <p className="mb-2">
                <span className="font-semibold">时间:</span> {result.timestamp}
              </p>
              
              {result.totalRecords && (
                <div className="mb-2">
                  <p><span className="font-semibold">总记录:</span> {result.totalRecords}</p>
                  {result.successCount !== undefined && (
                    <>
                      <p className="text-green-600">✅ 成功: {result.successCount}</p>
                      <p className="text-red-600">❌ 失败: {result.failCount}</p>
                    </>
                  )}
                </div>
              )}
              
              {result.error && (
                <div className="bg-red-100 p-2 rounded mb-2">
                  <span className="font-semibold">错误:</span> {result.error}
                </div>
              )}
              
              {result.response && (
                <div className="mb-2">
                  <p>
                    <span className="font-semibold">响应状态:</span> 
                    <span className={result.response.ok ? 'text-green-600' : 'text-red-600'}>
                      {result.response.status} {result.response.ok ? '✅' : '❌'}
                    </span>
                  </p>
                </div>
              )}
              
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 font-semibold">
                  查看完整结果
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}