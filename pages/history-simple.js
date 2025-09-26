import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// 全新History页面 - 极简可靠架构
export default function HistoryPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 页面加载时获取数据
  useEffect(() => {
    loadHistoryData()
  }, [])

  // 获取历史数据 - 完全模仿Telegram API调用
  async function loadHistoryData() {
    try {
      setLoading(true)
      setError('')
      
      console.log('🔄 [New History] 开始加载数据...')
      
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'history',
          month: '2025-08', // 先硬编码测试
          limit: 10,
          offset: 0
        })
      })

      console.log('📊 [New History] API响应状态:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [New History] API失败:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ [New History] API成功:', result)
      
      setData(result)
      
    } catch (err) {
      console.error('💥 [New History] 加载失败:', err)
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>📊 历史记录</h1>
        <div>⏳ 加载中...</div>
      </div>
    )
  }

  // 渲染错误状态
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>📊 历史记录</h1>
        <div style={{ color: 'red', margin: '20px 0' }}>
          ❌ {error}
        </div>
        <button onClick={loadHistoryData}>
          🔄 重新加载
        </button>
        <br/><br/>
        <button onClick={() => router.back()}>
          ← 返回
        </button>
      </div>
    )
  }

  // 渲染数据 - 极简列表
  const records = data?.records || []
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📊 历史记录</h1>
        <button onClick={() => router.back()}>
          ← 返回
        </button>
      </div>

      {/* 调试信息 */}
      <details style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <summary>🔍 调试信息</summary>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>

      {/* 记录统计 */}
      {data?.stats && (
        <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>📈 本月统计</h3>
          <div>总记录: {data.stats.totalRecords || 0} 条</div>
          <div>总支出: RM {(data.stats.totalSpent || 0).toFixed(2)}</div>
        </div>
      )}

      {/* 记录列表 */}
      <div>
        <h3>📝 记录列表 ({records.length}条)</h3>
        
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            📝 暂无记录<br/>
            <small>尝试在Telegram中添加一些记录</small>
          </div>
        ) : (
          <div style={{ space: '10px' }}>
            {records.map((record, index) => (
              <div 
                key={record.id || index} 
                style={{ 
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  background: 'white'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {record.ymd || record.date || '未知日期'}
                </div>
                <div>
                  {record.category_group}/{record.category_code} · 
                  RM {Math.abs(record.amount || 0).toFixed(2)}
                </div>
                {record.note && (
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    💬 {record.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button onClick={loadHistoryData} style={{ marginRight: '10px' }}>
          🔄 刷新数据
        </button>
        <button onClick={() => router.push('/')}>
          🏠 回首页
        </button>
      </div>
    </div>
  )
}