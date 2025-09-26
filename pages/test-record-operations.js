import { useState } from 'react'
import Layout from '../components/Layout'
import PWAClient from '../lib/api'

export default function TestRecordOperationsPage() {
  const [testRecord, setTestRecord] = useState({
    group: 'A',
    category: 'food',
    amount: '15.90',
    date: new Date().toISOString().slice(0, 10),
    note: '测试记录 - 早餐'
  })
  
  const [createdRecordId, setCreatedRecordId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 测试添加记录
  const testAddRecord = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('[测试] 开始添加记录:', testRecord)
      
      const response = await PWAClient.call('data', 'add-record', testRecord)
      
      console.log('[测试] 添加记录响应:', response)
      
      // 尝试从响应中提取记录ID - 根据record-system.js的返回格式
      let recordId = null
      console.log('[测试] 分析响应结构以提取记录ID:', response)
      
      if (response.record && response.record.id) {
        recordId = response.record.id  // 主系统直接返回 {ok: true, record: {id: ...}}
      } else if (response.data && response.data.record && response.data.record.id) {
        recordId = response.data.record.id  // 如果PWA包装了一层data
      } else if (response.data && response.data.id) {
        recordId = response.data.id
      } else if (response.id) {
        recordId = response.id
      }
      
      console.log('[测试] 提取的记录ID:', recordId)
      
      setCreatedRecordId(recordId)
      setResult({
        operation: '✅ 添加记录',
        success: true,
        recordId: recordId,
        response: response,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('[测试] 添加记录失败:', error)
      setResult({
        operation: '❌ 添加记录',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  // 测试删除记录
  const testDeleteRecord = async () => {
    if (!createdRecordId) {
      alert('请先添加一条记录以获取ID')
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      console.log('[测试] 开始删除记录:', createdRecordId)
      
      const response = await PWAClient.deleteRecord(createdRecordId)
      
      console.log('[测试] 删除记录响应:', response)
      
      setResult({
        operation: '🗑️ 删除记录',
        success: true,
        recordId: createdRecordId,
        response: response,
        timestamp: new Date().toISOString()
      })
      
      setCreatedRecordId(null) // 清除ID因为记录已被删除
      
    } catch (error) {
      console.error('[测试] 删除记录失败:', error)
      setResult({
        operation: '❌ 删除记录',
        success: false,
        error: error.message,
        recordId: createdRecordId,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  // 测试修改记录（需要实现）
  const testUpdateRecord = async () => {
    if (!createdRecordId) {
      alert('请先添加一条记录以获取ID')
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      const updatedData = {
        ...testRecord,
        amount: '20.50',
        note: '测试记录 - 修改后的早餐'
      }
      
      console.log('[测试] 开始修改记录:', { recordId: createdRecordId, data: updatedData })
      
      // 检查是否有updateRecord方法
      if (typeof PWAClient.updateRecord === 'function') {
        const response = await PWAClient.updateRecord(createdRecordId, updatedData)
        console.log('[测试] 修改记录响应:', response)
        
        setResult({
          operation: '✏️ 修改记录',
          success: true,
          recordId: createdRecordId,
          response: response,
          updatedData: updatedData,
          timestamp: new Date().toISOString()
        })
      } else {
        // 使用通用call方法
        const response = await PWAClient.call('data', 'update-record', {
          recordId: createdRecordId,
          ...updatedData
        })
        
        console.log('[测试] 修改记录响应:', response)
        
        setResult({
          operation: '✏️ 修改记录',
          success: true,
          recordId: createdRecordId,
          response: response,
          updatedData: updatedData,
          timestamp: new Date().toISOString()
        })
      }
      
    } catch (error) {
      console.error('[测试] 修改记录失败:', error)
      setResult({
        operation: '❌ 修改记录',
        success: false,
        error: error.message,
        recordId: createdRecordId,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  // 获取最新的历史记录查看结果
  const testGetHistory = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const response = await PWAClient.getHistory({ month: currentMonth, limit: 5 })
      
      console.log('[测试] 获取历史记录响应:', response)
      
      setResult({
        operation: '📋 获取历史记录',
        success: true,
        recordCount: response.records?.length || 0,
        records: response.records?.slice(0, 3) || [], // 只显示前3条
        response: response,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('[测试] 获取历史记录失败:', error)
      setResult({
        operation: '❌ 获取历史记录',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    setLoading(false)
  }
  
  return (
    <Layout title="记录操作测试 - Learner Club">
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">🧪 记录操作完整测试</h1>
        
        {/* 测试数据显示 */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="font-bold text-blue-900 mb-3">📋 测试数据</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>分类:</strong> {testRecord.group}类 - {testRecord.category}
            </div>
            <div>
              <strong>金额:</strong> RM{testRecord.amount}
            </div>
            <div>
              <strong>日期:</strong> {testRecord.date}
            </div>
            <div>
              <strong>备注:</strong> {testRecord.note}
            </div>
          </div>
          {createdRecordId && (
            <div className="mt-2 p-2 bg-green-100 rounded text-green-800">
              <strong>✅ 当前记录ID:</strong> {createdRecordId}
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={testAddRecord}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-green-600 transition-colors"
          >
            {loading ? '🔄 处理中...' : '➕ 1. 测试添加记录'}
          </button>
          
          <button
            onClick={testUpdateRecord}
            disabled={loading || !createdRecordId}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {loading ? '🔄 处理中...' : '✏️ 2. 测试修改记录'}
          </button>
          
          <button
            onClick={testDeleteRecord}
            disabled={loading || !createdRecordId}
            className="bg-red-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
          >
            {loading ? '🔄 处理中...' : '🗑️ 3. 测试删除记录'}
          </button>
          
          <button
            onClick={testGetHistory}
            disabled={loading}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-purple-600 transition-colors"
          >
            {loading ? '🔄 处理中...' : '📋 4. 查看历史记录'}
          </button>
        </div>
        
        {/* 结果显示 */}
        {result && (
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{result.operation} 测试结果</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.success ? '成功' : '失败'}
              </span>
            </div>
            
            <div className="space-y-3">
              {result.recordId && (
                <div>
                  <strong>记录ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{result.recordId}</code>
                </div>
              )}
              
              {result.recordCount !== undefined && (
                <div>
                  <strong>记录数量:</strong> {result.recordCount}
                </div>
              )}
              
              {result.error && (
                <div className="bg-red-50 p-3 rounded">
                  <strong className="text-red-800">错误信息:</strong>
                  <pre className="text-red-700 text-sm mt-1 whitespace-pre-wrap">{result.error}</pre>
                </div>
              )}
              
              {result.updatedData && (
                <div className="bg-blue-50 p-3 rounded">
                  <strong className="text-blue-800">修改后数据:</strong>
                  <pre className="text-blue-700 text-sm mt-1">{JSON.stringify(result.updatedData, null, 2)}</pre>
                </div>
              )}
              
              {result.records && result.records.length > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <strong>最新记录 (前3条):</strong>
                  <div className="mt-2 space-y-2">
                    {result.records.map((record, index) => (
                      <div key={index} className="text-sm p-2 bg-white rounded border">
                        <div className="flex justify-between">
                          <span>{record.category_code} - RM{Math.abs(record.amount)}</span>
                          <span className="text-gray-500">{record.ymd}</span>
                        </div>
                        {record.note && <div className="text-gray-600 text-xs mt-1">{record.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 font-semibold">
                  🔍 查看完整API响应
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </details>
              
              <div className="text-xs text-gray-500 mt-4">
                <strong>测试时间:</strong> {result.timestamp}
              </div>
            </div>
          </div>
        )}
        
        {/* 使用说明 */}
        <div className="mt-8 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-2">📖 测试流程说明</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li><strong>1. 添加记录</strong> - 创建一条新的测试记录，获取记录ID</li>
            <li><strong>2. 修改记录</strong> - 使用获取的ID修改记录内容（金额和备注）</li>
            <li><strong>3. 删除记录</strong> - 使用ID删除刚才创建的记录</li>
            <li><strong>4. 查看历史</strong> - 获取最新的历史记录验证操作结果</li>
          </ol>
        </div>
      </div>
    </Layout>
  )
}