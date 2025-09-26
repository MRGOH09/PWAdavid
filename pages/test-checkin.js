import { useState } from 'react'
import Layout from '../components/Layout'

export default function TestCheckIn() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }
  
  // 测试1: 直接API调用
  const testDirectAPI = async () => {
    setIsLoading(true)
    setLogs([])
    addLog('开始测试直接API调用')
    
    try {
      // 获取token
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      addLog(`Session获取: ${session ? '成功' : '失败'}`, session ? 'success' : 'error')
      
      if (!session) {
        addLog('无session，请先登录', 'error')
        setIsLoading(false)
        return
      }
      
      addLog(`Token长度: ${session.access_token.length}`)
      
      // 直接调用API
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'checkin' })
      })
      
      addLog(`API响应状态: ${response.status}`, response.ok ? 'success' : 'error')
      
      const result = await response.json()
      addLog(`API响应内容: ${JSON.stringify(result, null, 2)}`)
      
      if (result.success) {
        addLog('✅ 打卡成功！', 'success')
        if (result.score) {
          addLog(`获得积分: ${result.score.total_score}分`, 'success')
          addLog(`连续天数: ${result.score.current_streak}天`, 'success')
        }
      } else {
        addLog(`打卡失败: ${result.message || result.error}`, 'error')
      }
      
    } catch (error) {
      addLog(`错误: ${error.message}`, 'error')
      addLog(`错误栈: ${error.stack}`, 'error')
    }
    
    setIsLoading(false)
  }
  
  // 测试2: PWAClient调用
  const testPWAClient = async () => {
    setIsLoading(true)
    setLogs([])
    addLog('开始测试PWAClient调用')
    
    try {
      const PWAClient = (await import('../lib/api')).default
      addLog('PWAClient导入成功')
      
      const result = await PWAClient.call('data', 'checkin')
      addLog(`PWAClient响应: ${JSON.stringify(result, null, 2)}`)
      
      if (result.success) {
        addLog('✅ 通过PWAClient打卡成功！', 'success')
      } else {
        addLog(`打卡失败: ${result.message}`, 'error')
      }
      
    } catch (error) {
      addLog(`PWAClient错误: ${error.message}`, 'error')
      addLog(`错误详情: ${error.stack}`, 'error')
    }
    
    setIsLoading(false)
  }
  
  // 测试3: 检查认证状态
  const testAuth = async () => {
    setIsLoading(true)
    setLogs([])
    addLog('开始检查认证状态')
    
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // 获取session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        addLog('✅ Session存在', 'success')
        addLog(`用户ID: ${session.user.id}`)
        addLog(`邮箱: ${session.user.email}`)
        addLog(`Token类型: ${session.token_type}`)
        addLog(`过期时间: ${new Date(session.expires_at * 1000).toLocaleString()}`)
      } else {
        addLog('❌ 无Session', 'error')
      }
      
      // 获取用户
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        addLog('✅ 用户信息获取成功', 'success')
        addLog(`Provider: ${user.app_metadata?.provider || 'unknown'}`)
      } else {
        addLog('❌ 无法获取用户信息', 'error')
      }
      
    } catch (error) {
      addLog(`认证检查错误: ${error.message}`, 'error')
    }
    
    setIsLoading(false)
  }
  
  // 测试4: 检查数据库状态
  const testDatabase = async () => {
    setIsLoading(true)
    setLogs([])
    addLog('开始检查数据库状态')
    
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addLog('请先登录', 'error')
        setIsLoading(false)
        return
      }
      
      const today = new Date().toISOString().split('T')[0]
      addLog(`今日日期: ${today}`)
      
      // 检查user_daily_scores
      const { data: scores, error: scoreError } = await supabase
        .from('user_daily_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('ymd', today)
      
      if (scoreError) {
        addLog(`查询积分表错误: ${scoreError.message}`, 'error')
      } else {
        addLog(`今日积分记录: ${scores?.length || 0}条`)
        if (scores?.length > 0) {
          addLog(`积分详情: ${JSON.stringify(scores[0], null, 2)}`)
        }
      }
      
      // 检查records
      const { data: records, error: recordError } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .eq('category_code', 'checkin')
        .eq('ymd', today)
      
      if (recordError) {
        addLog(`查询记录表错误: ${recordError.message}`, 'error')
      } else {
        addLog(`今日打卡记录: ${records?.length || 0}条`)
      }
      
    } catch (error) {
      addLog(`数据库检查错误: ${error.message}`, 'error')
    }
    
    setIsLoading(false)
  }
  
  return (
    <Layout title="打卡功能测试">
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">🔧 打卡功能测试页面</h1>
          
          {/* 测试按钮 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={testDirectAPI}
              disabled={isLoading}
              className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              测试1: 直接API调用
            </button>
            
            <button
              onClick={testPWAClient}
              disabled={isLoading}
              className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              测试2: PWAClient调用
            </button>
            
            <button
              onClick={testAuth}
              disabled={isLoading}
              className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              测试3: 检查认证状态
            </button>
            
            <button
              onClick={testDatabase}
              disabled={isLoading}
              className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              测试4: 检查数据库状态
            </button>
          </div>
          
          {/* 清空日志 */}
          <button
            onClick={() => setLogs([])}
            className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清空日志
          </button>
          
          {/* 日志显示 */}
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto h-96">
            {logs.length === 0 ? (
              <div className="text-gray-500">等待测试...</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    'text-white'
                  }`}
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))
            )}
          </div>
          
          {/* 加载状态 */}
          {isLoading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}