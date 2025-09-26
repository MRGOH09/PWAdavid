import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function DebugAuth() {
  const [debugInfo, setDebugInfo] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    debugAuthState()
  }, [])

  const debugAuthState = async () => {
    try {
      console.log('[DEBUG] 开始认证状态诊断')
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      // 1. 检查环境变量
      const envCheck = {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }

      // 2. 检查session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // 3. 如果有session，检查用户是否在数据库存在
      let userExistsResult = null
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/pwa/auth-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.user.email })
          })
          if (response.ok) {
            userExistsResult = await response.json()
          } else {
            userExistsResult = { error: `HTTP ${response.status}` }
          }
        } catch (e) {
          userExistsResult = { error: e.message }
        }
      }

      // 4. 检查URL参数
      const urlParams = typeof window !== 'undefined' ? {
        search: window.location.search,
        hash: window.location.hash,
        href: window.location.href
      } : {}

      const debugData = {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        session: session ? {
          userId: session.user.id,
          email: session.user.email,
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token?.length || 0,
          expiresAt: session.expires_at
        } : null,
        sessionError: sessionError,
        userExists: userExistsResult,
        url: urlParams
      }

      console.log('[DEBUG] 认证诊断结果:', debugData)
      setDebugInfo(debugData)

    } catch (error) {
      console.error('[DEBUG] 诊断失败:', error)
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>诊断中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">PWA-Google 认证状态诊断</h1>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">当前时间</h2>
          <p>{debugInfo.timestamp}</p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">环境变量检查</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
{JSON.stringify(debugInfo.environment, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Session状态</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
{JSON.stringify(debugInfo.session, null, 2)}
          </pre>
          {debugInfo.sessionError && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
              Session错误: {JSON.stringify(debugInfo.sessionError)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">数据库用户检查</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
{JSON.stringify(debugInfo.userExists, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">URL信息</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
{JSON.stringify(debugInfo.url, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibent mb-2">逻辑分析</h2>
          <div className="text-sm">
            {debugInfo.session ? (
              <div className="text-green-600">✅ 用户已登录</div>
            ) : (
              <div className="text-red-600">❌ 用户未登录</div>
            )}
            
            {debugInfo.userExists?.userExists === true && (
              <div className="text-green-600">✅ 用户在数据库中存在</div>
            )}
            
            {debugInfo.userExists?.userExists === false && (
              <div className="text-yellow-600">⚠️ 用户在数据库中不存在</div>
            )}

            {debugInfo.userExists?.error && (
              <div className="text-red-600">❌ 检查用户存在失败: {debugInfo.userExists.error}</div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">建议跳转逻辑</h2>
          <div className="text-sm">
            {!debugInfo.session && (
              <div>应该停留在 /auth 页面进行登录</div>
            )}
            {debugInfo.session && debugInfo.userExists?.userExists === true && (
              <div>应该跳转到 / 首页显示数据</div>
            )}
            {debugInfo.session && debugInfo.userExists?.userExists === false && (
              <div>应该停留在 /auth 页面完成注册</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}