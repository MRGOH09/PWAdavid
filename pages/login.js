import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 直接跳转到Google登录页面
    router.replace('/login-google')
  }, [])
  
  // 显示跳转中的提示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">正在跳转到登录页面...</p>
      </div>
    </div>
  )
}