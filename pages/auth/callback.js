import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('=== [CALLBACK] 开始处理 ===')
        console.log('[CALLBACK] 当前URL:', window.location.href)
        
        // 检查URL hash中的token（Implicit Flow）
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const errorInHash = hashParams.get('error')
        
        // 获取URL query中的参数
        const { code, state, error: oauthError } = router.query

        console.log('[CALLBACK] 检查参数:', {
          hasAccessToken: !!accessToken,
          hasCode: !!code,
          hasError: !!oauthError || !!errorInHash
        })

        if (oauthError || errorInHash) {
          console.error('[CALLBACK] OAuth返回错误:', oauthError || errorInHash)
          router.push('/auth?error=' + encodeURIComponent(oauthError || errorInHash))
          return
        }

        // 获取跳转参数
        const urlParams = new URLSearchParams(window.location.search)
        const mode = urlParams.get('mode') || 'login'
        const next = urlParams.get('next')
        
        console.log('[CALLBACK] 跳转参数:', { mode, next })

        // 处理Implicit Flow（token在hash中）- 直接跳转让目标页面的Supabase自动处理
        if (accessToken) {
          console.log('[CALLBACK] 检测到Implicit Flow token，直接跳转')
          
          // 保留hash中的token信息进行跳转
          const hashString = window.location.hash
          
          if (mode === 'test' && next) {
            console.log('[CALLBACK] 测试模式，带hash跳转到:', next + hashString)
            window.location.href = next + hashString
          } else {
            console.log('[CALLBACK] 正常模式，带hash跳转到:', `/auth?mode=${mode}` + hashString)
            window.location.href = `/auth?mode=${mode}` + hashString
          }
          return
        }
        
        // 处理Authorization Code Flow（如果有code参数）
        if (code) {
          console.log('[CALLBACK] 检测到Authorization Code Flow')
          if (mode === 'test' && next) {
            router.push(`${next}?code=${code}&state=${state || ''}`)
          } else {
            router.push(`/auth?mode=${mode}&code=${code}&state=${state || ''}`)
          }
          return
        }
        
        // 没有找到有效参数，跳转到认证页面
        console.log('[CALLBACK] 没有找到有效参数，跳转到认证页面')
        router.push('/auth')
        
      } catch (error) {
        console.error('[CALLBACK] 处理失败:', error)
        router.push('/auth?error=' + encodeURIComponent(error.message))
      }
    }

    // 只有在router准备好时才处理回调
    if (router.isReady) {
      handleAuthCallback()
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          正在处理登录...
        </h2>
        <p className="text-gray-600">
          请稍候，我们正在完成您的Google登录
        </p>
      </div>
    </div>
  )
}