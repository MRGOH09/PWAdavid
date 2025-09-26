import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import WebAppWrapper from '../components/WebAppWrapper'
import { getBrowserInfo } from '../lib/browser-detection'

export default function GoogleLoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [browserInfo, setBrowserInfo] = useState(null)
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ))
  
  useEffect(() => {
    // 检查浏览器信息
    const info = getBrowserInfo()
    setBrowserInfo(info)
    
    // 检查是否已登录
    checkAuthStatus()
    
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
  
  const checkAuthStatus = async () => {
    try {
      // 使用Supabase原生认证检查
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('用户已登录:', session.user)
        router.replace('/')
        return
      }
    } catch (error) {
      console.log('Not authenticated:', error)
    } finally {
      setChecking(false)
    }
  }
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('启动Google OAuth登录...')
      
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
  
  if (checking) {
    return (
      <WebAppWrapper>
        <Layout title="登录 - Learner Club">
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">正在检查登录状态...</p>
            </div>
          </div>
        </Layout>
      </WebAppWrapper>
    )
  }
  
  return (
    <WebAppWrapper>
      <Layout title="登录 - Learner Club">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📊</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Learner Club
              </h1>
              <p className="text-gray-600">
                智能财务管理助手
              </p>
            </div>
            
            {/* 登录卡片 */}
            <ModernCard>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  使用Google账号登录
                </h2>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-6">
                    使用您的Google账号安全登录
                  </p>
                  
                  {/* Google登录按钮 */}
                  <div className="text-center">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="w-5 h-5 mr-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      {loading ? '正在登录...' : '使用Google登录'}
                    </button>
                    {/* 错误提示 */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-4">
                      点击登录即表示您同意我们的服务条款
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p className="mb-1">
                    首次登录将自动创建账号
                  </p>
                  <p>
                    我们不会存储您的Google密码
                  </p>
                </div>
              </div>
            </ModernCard>
            
            {/* 功能介绍 */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">📊</span>
                <span>智能财务数据分析和洞察</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">🏆</span>
                <span>分院排行榜和挑战活动</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">📱</span>
                <span>支持PWA，随时随地记账</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">🔒</span>
                <span>Google OAuth安全认证</span>
              </div>
            </div>
            
            {/* 设备提示 */}
            {browserInfo?.device === 'huawei' && (
              <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-center">
                  <span className="text-orange-700 text-sm">
                    💡 华为设备用户：登录后可以将此应用添加到桌面，获得原生应用体验
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </WebAppWrapper>
  )
}