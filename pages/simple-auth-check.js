import { useState } from 'react'
import Head from 'next/head'

export default function SimpleAuthCheck() {
  const [authInfo, setAuthInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkAuth = async () => {
    setLoading(true)
    
    const result = {
      timestamp: new Date().toLocaleString(),
      localStorage_jwt: null,
      cookies: null,
      api_test: null
    }

    // 检查localStorage
    try {
      if (typeof window !== 'undefined') {
        const jwt = localStorage.getItem('jwt_token')
        result.localStorage_jwt = {
          exists: !!jwt,
          preview: jwt ? jwt.substring(0, 30) + '...' : null,
          length: jwt ? jwt.length : 0
        }
      }
    } catch (e) {
      result.localStorage_jwt = { error: e.message }
    }

    // 检查cookies
    try {
      if (typeof document !== 'undefined') {
        result.cookies = {
          raw: document.cookie,
          has_auth_token: document.cookie.includes('auth_token'),
          has_auth: document.cookie.includes('auth='),
          cookie_count: document.cookie.split(';').length
        }
      }
    } catch (e) {
      result.cookies = { error: e.message }
    }

    // 测试API
    try {
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'check-auth' })
      })
      
      const apiResult = await response.json()
      result.api_test = {
        status: response.status,
        ok: response.ok,
        authenticated: apiResult.authenticated,
        user: apiResult.user,
        error: apiResult.error,
        message: apiResult.message
      }
    } catch (e) {
      result.api_test = { error: e.message }
    }

    setAuthInfo(result)
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>简单认证检查 - LEARNER CLUB</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          
          <div className="bg-blue-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">🔍 简单认证检查</h1>
            <p className="text-blue-100">快速诊断JWT认证状态</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <button
              onClick={checkAuth}
              disabled={loading}
              className={`w-full p-4 rounded-lg font-semibold text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? '🔄 检查中...' : '🚀 开始检查认证状态'}
            </button>
          </div>

          {authInfo && (
            <div className="space-y-6">
              
              {/* localStorage检查 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">📱 LocalStorage JWT Token</h2>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
{JSON.stringify(authInfo.localStorage_jwt, null, 2)}
                </pre>
                {authInfo.localStorage_jwt?.exists ? (
                  <div className="mt-3 p-3 bg-green-100 text-green-800 rounded-lg">
                    ✅ 找到localStorage JWT token (长度: {authInfo.localStorage_jwt.length})
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg">
                    ❌ localStorage中没有JWT token
                  </div>
                )}
              </div>

              {/* Cookie检查 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">🍪 Cookie检查</h2>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
{JSON.stringify(authInfo.cookies, null, 2)}
                </pre>
                {(authInfo.cookies?.has_auth_token || authInfo.cookies?.has_auth) ? (
                  <div className="mt-3 p-3 bg-green-100 text-green-800 rounded-lg">
                    ✅ 找到认证cookie
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg">
                    ❌ 没有找到认证cookie (auth_token 或 auth)
                  </div>
                )}
              </div>

              {/* API测试 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">🌐 API认证测试</h2>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
{JSON.stringify(authInfo.api_test, null, 2)}
                </pre>
                {authInfo.api_test?.authenticated ? (
                  <div className="mt-3 p-3 bg-green-100 text-green-800 rounded-lg">
                    ✅ API认证成功！用户: {authInfo.api_test.user?.name} (分行: {authInfo.api_test.user?.branch})
                  </div>
                ) : authInfo.api_test?.status === 401 ? (
                  <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg">
                    ❌ API认证失败 (401 Unauthorized)
                    <br />💡 需要先通过 <a href="/login" className="underline text-blue-600">Telegram登录</a>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
                    ⚠️ API测试异常: {authInfo.api_test?.error || '未知错误'}
                  </div>
                )}
              </div>

              {/* 解决方案 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-800 mb-3">💡 解决方案</h3>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p><strong>如果没有JWT token:</strong></p>
                  <p>1. 访问 <a href="/login" className="underline text-blue-600">/login</a> 通过Telegram登录</p>
                  <p>2. 登录成功后会自动设置认证cookie和localStorage</p>
                  
                  <p className="mt-4"><strong>如果有token但API失败:</strong></p>
                  <p>1. token可能已过期，需要重新登录</p>
                  <p>2. 检查环境变量JWT_SECRET设置</p>
                  
                  <p className="mt-4"><strong>测试链接:</strong></p>
                  <div className="space-x-4">
                    <a href="/login" className="text-blue-600 hover:underline">📲 Telegram登录</a>
                    <a href="/test-settings" className="text-blue-600 hover:underline">⚙️ Settings测试</a>
                    <a href="/profile" className="text-blue-600 hover:underline">👤 查看Profile</a>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}