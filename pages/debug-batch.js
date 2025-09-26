import { useState } from 'react'

export default function DebugBatch() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testBatchRecord = async () => {
    setLoading(true)
    setResult('正在测试...')

    const testRecords = [{
      group: 'A',
      category: 'food', // 直接使用英文代码
      amount: '12.50',
      note: '测试PWA批量记录 - 直接写入Supabase',
      date: new Date().toISOString().split('T')[0]
    }]

    try {
      console.log('使用PWA API测试批量记录:', testRecords)

      // 获取Supabase session token
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setResult('错误：用户未登录')
        setLoading(false)
        return
      }

      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'batch-add-records',
          records: testRecords
        })
      })

      const responseText = await response.text()
      console.log('PWA API响应状态:', response.status)
      console.log('PWA API响应文本:', responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        result = { error: '响应不是有效JSON', raw: responseText }
      }

      setResult(JSON.stringify({
        api: 'PWA批量记录API (直接写入Supabase)',
        status: response.status,
        ok: response.ok,
        result: result
      }, null, 2))

    } catch (error) {
      console.error('PWA API请求失败:', error)
      setResult(JSON.stringify({
        error: error.message,
        stack: error.stack
      }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">批量记录调试</h1>
      
      <button
        onClick={testBatchRecord}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? '测试中...' : '测试批量记录'}
      </button>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">结果:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {result || '点击按钮开始测试'}
        </pre>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">浏览器控制台:</h2>
        <p className="text-sm text-gray-600">
          打开浏览器开发者工具查看详细的console.log输出
        </p>
      </div>
    </div>
  )
}