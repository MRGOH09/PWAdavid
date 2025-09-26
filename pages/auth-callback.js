import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthCallback() {
  const router = useRouter()
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        // 从URL获取token和returnTo参数
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const returnTo = urlParams.get('returnTo') || '/'
        
        if (token) {
          // 保存token到localStorage
          localStorage.setItem('jwt_token', token)
          console.log('JWT token 已保存到 localStorage')
          
          // 跳转到目标页面
          router.replace(returnTo)
        } else {
          // 没有token，跳转到登录页
          router.replace('/login-supabase')
        }
      } catch (error) {
        console.error('认证处理失败:', error)
        router.replace('/login-supabase')
      }
    }
    
    processAuth()
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">正在完成登录...</p>
      </div>
    </div>
  )
}