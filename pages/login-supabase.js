import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Layout from '../components/Layout'

export default function SupabaseLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ))

  useEffect(() => {
    // 检查是否已登录
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/')
      }
    }
    
    checkUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('用户登录成功:', session.user)
        
        // 保存用户信息到localStorage（兼容现有系统）
        localStorage.setItem('jwt_token', session.access_token)
        localStorage.setItem('user_info', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name || session.user.user_metadata.full_name,
          picture: session.user.user_metadata.picture || session.user.user_metadata.avatar_url,
          provider: 'google'
        }))
        
        // 跳转到首页
        router.push('/')
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase, router])

  // 处理Google登录
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) throw error
      
      // signInWithOAuth 会自动重定向到 Google
      console.log('重定向到Google OAuth...')
      
    } catch (error) {
      console.error('Google登录错误:', error)
      setError(error.message || 'Google登录失败')
      setLoading(false)
    }
  }

  return (
    <Layout title="登录 - Learner Club PWA">
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Learner Club
            </h1>
            <p className="text-gray-600">
              独立PWA财务管理应用
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              ✨ Supabase原生认证
            </div>
          </div>

          {/* 登录卡片 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-semibold text-center mb-6">
              使用Google账号登录
            </h2>

            <div className="space-y-4">
              {/* Google登录按钮 */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium text-gray-900">
                      使用 Google 继续
                    </span>
                  </>
                )}
              </button>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 说明文字 */}
              <div className="text-center text-xs text-gray-500 mt-6 space-y-1">
                <p>使用Supabase原生Google认证</p>
                <p>首次登录将自动创建PWA账号</p>
                <p>安全、快速、可靠</p>
              </div>

              {/* 分割线 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">独立PWA应用</span>
                </div>
              </div>

              {/* 功能介绍 */}
              <div className="grid grid-cols-2 gap-4 text-center text-sm text-gray-600">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">💰</div>
                  <div>财务记录</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">📊</div>
                  <div>数据分析</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">🎯</div>
                  <div>目标管理</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">🏆</div>
                  <div>积分排行</div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>© 2024 Learner Club PWA</p>
            <p className="mt-1">使用Supabase原生认证 - 安全可靠</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}