import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function TestSettingsDebug() {
  const [logs, setLogs] = useState([])
  const [testResults, setTestResults] = useState({})

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  // 测试JWT认证状态
  const testAuth = async () => {
    addLog('🔍 测试JWT认证状态...', 'info')
    
    try {
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'check-auth' })
      })

      addLog(`📊 API响应状态: ${response.status} ${response.statusText}`, 'info')

      const result = await response.json()
      setTestResults(prev => ({ ...prev, auth: result }))
      
      if (response.status === 401) {
        addLog(`❌ JWT认证失败 (401 Unauthorized)`, 'error')
        addLog(`💡 解决方案: 请先访问 /login 通过Telegram登录`, 'warning')
      } else if (result.authenticated) {
        addLog(`✅ JWT认证成功: ${result.user?.name} (分行: ${result.user?.branch})`, 'success')
      } else {
        addLog(`❌ JWT认证失败: 响应显示未认证`, 'error')
      }
    } catch (error) {
      addLog(`❌ 认证测试失败: ${error.message}`, 'error')
      setTestResults(prev => ({ ...prev, auth: { error: error.message } }))
    }
  }

  // 测试数据库连接
  const testDatabase = async () => {
    addLog('📊 测试数据库连接...', 'info')
    
    try {
      const response = await fetch('/api/pwa/test-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'test_db' })
      })

      const result = await response.json()
      setTestResults(prev => ({ ...prev, database: result }))
      
      if (result.ok) {
        addLog(`✅ 数据库连接正常`, 'success')
      } else {
        addLog(`❌ 数据库连接失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 数据库测试失败: ${error.message}`, 'error')
      setTestResults(prev => ({ ...prev, database: { error: error.message } }))
    }
  }

  // 检查环境变量
  const checkEnvironment = () => {
    addLog('🔧 检查环境变量...', 'info')
    
    const envVars = {
      hasJWT_localStorage: typeof window !== 'undefined' ? !!localStorage.getItem('jwt_token') : false,
      JWT_value_preview: typeof window !== 'undefined' ? localStorage.getItem('jwt_token')?.substring(0, 20) + '...' : 'N/A',
      cookies_raw: typeof document !== 'undefined' ? document.cookie : 'N/A',
      has_auth_token_cookie: typeof document !== 'undefined' ? document.cookie.includes('auth_token') : false,
      has_auth_cookie: typeof document !== 'undefined' ? document.cookie.includes('auth=') : false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    }
    
    setTestResults(prev => ({ ...prev, environment: envVars }))
    
    if (envVars.hasJWT_localStorage) {
      addLog(`✅ 找到localStorage JWT token`, 'success')
    } else {
      addLog(`❌ localStorage中无JWT token`, 'error')
    }
    
    if (envVars.has_auth_token_cookie || envVars.has_auth_cookie) {
      addLog(`✅ 找到认证cookie`, 'success')
    } else {
      addLog(`❌ 无认证cookie`, 'error')
      addLog(`💡 需要先通过Telegram登录: /login`, 'warning')
    }
    
    addLog(`📋 环境信息检查完成`, 'info')
  }

  // 测试现有的profile API
  const testProfileAPI = async () => {
    addLog('👤 测试现有Profile API...', 'info')
    
    try {
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'profile' })
      })

      const result = await response.json()
      setTestResults(prev => ({ ...prev, profile: result }))
      
      if (result.success) {
        addLog(`✅ Profile API正常: 找到用户 ${result.data?.user?.name}`, 'success')
      } else {
        addLog(`❌ Profile API失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ Profile API测试失败: ${error.message}`, 'error')
      setTestResults(prev => ({ ...prev, profile: { error: error.message } }))
    }
  }

  const runAllTests = async () => {
    setLogs([])
    setTestResults({})
    
    addLog('🚀 开始全面测试...', 'info')
    
    checkEnvironment()
    await testAuth()
    await testDatabase()
    await testProfileAPI()
    
    addLog('✅ 所有测试完成', 'success')
  }

  useEffect(() => {
    // 页面加载时自动运行测试
    runAllTests()
  }, [])

  return (
    <>
      <Head>
        <title>Settings 调试页面 - LEARNER CLUB</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 标题 */}
          <div className="bg-orange-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">🐛 Settings 调试页面</h1>
            <p className="text-orange-100">诊断Settings功能的认证和数据库问题</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 测试按钮 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🧪 测试工具</h2>
              
              <div className="space-y-3">
                <button
                  onClick={runAllTests}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors font-medium"
                >
                  🚀 运行所有测试
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={testAuth}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors text-sm"
                  >
                    🔍 测试认证
                  </button>
                  
                  <button
                    onClick={testDatabase}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors text-sm"
                  >
                    📊 测试数据库
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={checkEnvironment}
                    className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors text-sm"
                  >
                    🔧 检查环境
                  </button>
                  
                  <button
                    onClick={testProfileAPI}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors text-sm"
                  >
                    👤 测试Profile
                  </button>
                </div>
              </div>
            </div>

            {/* 测试结果 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📋 测试结果</h2>
              
              <div className="space-y-4">
                {Object.keys(testResults).map(testType => (
                  <div key={testType} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-2 capitalize">
                      {testType === 'auth' && '🔍 认证测试'}
                      {testType === 'database' && '📊 数据库测试'}
                      {testType === 'environment' && '🔧 环境检查'}
                      {testType === 'profile' && '👤 Profile API'}
                    </h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(testResults[testType], null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 操作日志 */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">📋 调试日志</h2>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待测试运行...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setLogs([])}
              className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              清空日志
            </button>
          </div>

          {/* 解决方案提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
            <h3 className="font-semibold text-yellow-800 mb-3">💡 常见问题解决方案</h3>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li><strong>JWT认证失败</strong>: 请先通过Telegram登录获取有效token</li>
              <li><strong>数据库连接失败</strong>: 检查环境变量SUPABASE_URL和SUPABASE_SERVICE_KEY</li>
              <li><strong>用户资料不存在</strong>: 可能需要先完成/start流程创建用户资料</li>
              <li><strong>权限错误</strong>: 确认用户已在系统中注册并有相应权限</li>
            </ul>
            
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800 font-medium">🔗 快速链接:</p>
              <div className="mt-2 space-x-4">
                <a href="/login" className="text-blue-600 hover:underline">📲 Telegram登录</a>
                <a href="/profile" className="text-blue-600 hover:underline">👤 查看Profile</a>
                <a href="/test-settings" className="text-blue-600 hover:underline">⚙️ Settings测试</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}