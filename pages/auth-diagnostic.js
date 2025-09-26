import { useEffect, useState } from 'react'

export default function AuthDiagnostic() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const addResult = (step, status, details) => {
    setResults(prev => [...prev, { step, status, details, timestamp: new Date().toLocaleTimeString() }])
  }

  useEffect(() => {
    const runDiagnostic = async () => {
      setLoading(true)
      setResults([])

      // 1. 检查localStorage
      addResult('检查LocalStorage JWT', 'info', '检查浏览器本地存储...')
      const localToken = localStorage.getItem('jwt_token')
      if (localToken) {
        addResult('LocalStorage JWT', 'success', `找到token: ${localToken.substring(0, 20)}...`)
      } else {
        addResult('LocalStorage JWT', 'warning', '未找到localStorage中的jwt_token')
      }

      // 2. 检查Cookies
      addResult('检查Cookies', 'info', '检查浏览器cookies...')
      const cookies = document.cookie
      if (cookies.includes('auth_token')) {
        addResult('Cookies', 'success', 'Found auth_token cookie')
      } else {
        addResult('Cookies', 'warning', 'No auth_token cookie found')
      }
      addResult('All Cookies', 'info', cookies || 'No cookies')

      // 3. 测试checkAuth API
      addResult('测试checkAuth', 'info', '调用PWA checkAuth API...')
      try {
        const response = await fetch('/api/pwa/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-auth' }),
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          addResult('checkAuth API', data.authenticated ? 'success' : 'warning', 
            `认证状态: ${data.authenticated}, 详情: ${JSON.stringify(data)}`)
        } else {
          const errorText = await response.text()
          addResult('checkAuth API', 'error', `HTTP ${response.status}: ${errorText}`)
        }
      } catch (error) {
        addResult('checkAuth API', 'error', `请求失败: ${error.message}`)
      }

      // 4. 测试profile API
      addResult('测试Profile API', 'info', '调用用户资料API...')
      try {
        const response = await fetch('/api/pwa/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'profile' }),
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          addResult('Profile API', 'success', `获取成功: ${JSON.stringify(data.profile || data, null, 2)}`)
        } else {
          const errorText = await response.text()
          addResult('Profile API', 'error', `HTTP ${response.status}: ${errorText}`)
        }
      } catch (error) {
        addResult('Profile API', 'error', `请求失败: ${error.message}`)
      }

      // 5. 测试登录端点 (GET)
      addResult('测试Auth端点', 'info', '测试认证端点是否响应...')
      try {
        // 不传认证参数，只是测试端点是否工作
        const response = await fetch('/api/pwa/auth', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.status === 405) {
          addResult('Auth端点', 'success', '端点正常 (Method not allowed for empty request)')
        } else {
          const text = await response.text()
          addResult('Auth端点', 'info', `Status: ${response.status}, Response: ${text.substring(0, 200)}`)
        }
      } catch (error) {
        addResult('Auth端点', 'error', `端点测试失败: ${error.message}`)
      }

      setLoading(false)
    }

    runDiagnostic()
  }, [])

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8">PWA 认证诊断</h1>
        
        {loading && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>正在运行诊断...</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{result.step}</h3>
                <span className="text-sm opacity-75">{result.timestamp}</span>
              </div>
              <pre className="text-sm whitespace-pre-wrap overflow-auto">
                {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">快速操作</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              前往登录页
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              重新诊断
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('jwt_token')
                localStorage.removeItem('user_info')
                document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                alert('已清除所有认证信息')
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              清除认证信息
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}