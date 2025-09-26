import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import Layout from '../components/Layout'

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'

export default function NewLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('jwt_token')
    if (token) {
      router.replace('/')
    }
  }, [router])

  // 解码Google JWT token
  const decodeGoogleToken = (credential) => {
    try {
      const base64Url = credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }

  // 处理Google登录成功
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)
    
    try {
      // 解码Google token获取用户信息
      const googleUser = decodeGoogleToken(credentialResponse.credential)
      console.log('Google用户信息:', googleUser)
      
      // 调用后端API创建或登录PWA用户
      const response = await fetch('/api/pwa/auth-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          email_verified: googleUser.email_verified
        }),
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // 保存JWT token到localStorage
        localStorage.setItem('jwt_token', data.token)
        localStorage.setItem('user_info', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture,
          provider: 'google'
        }))
        
        console.log('登录成功，跳转到首页')
        
        // 跳转到首页
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Google登录失败')
      }
    } catch (error) {
      console.error('Google登录错误:', error)
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
            </div>

            {/* 登录卡片 */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold text-center mb-6">
                欢迎回来
              </h2>

              {/* Google登录按钮 */}
              <div className="space-y-4">
                {GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700 mb-2">
                      ⚠️ 请配置Google OAuth Client ID
                    </p>
                    <p className="text-xs text-yellow-600">
                      在.env.local中设置NEXT_PUBLIC_GOOGLE_CLIENT_ID
                    </p>
                    <ol className="text-xs text-yellow-600 mt-2 list-decimal list-inside">
                      <li>访问 Google Cloud Console</li>
                      <li>创建OAuth 2.0客户端ID</li>
                      <li>添加授权重定向URI</li>
                      <li>复制Client ID到环境变量</li>
                    </ol>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google登录失败')}
                      text="continue_with"
                      shape="rectangular"
                      theme="outline"
                      size="large"
                      width="100%"
                      locale="zh_CN"
                    />
                    
                    {loading && (
                      <div className="flex items-center text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        <span className="text-sm">正在登录...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* 说明文字 */}
                <div className="text-center text-xs text-gray-500 mt-6 space-y-1">
                  <p>使用Google账号快速登录</p>
                  <p>首次登录将自动创建PWA账号</p>
                  <p>您的数据将安全存储在我们的服务器</p>
                </div>

                {/* 分割线 */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">PWA独立应用</span>
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
              <p className="mt-1">完全独立运行，不依赖Telegram</p>
            </div>
          </div>
        </div>
      </Layout>
    </GoogleOAuthProvider>
  )
}