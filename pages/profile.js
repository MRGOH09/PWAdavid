import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard, { DataCard } from '../components/ModernCard'
import { SmoothTransition, PageSkeleton } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'
import PWAClient, { formatCurrency, formatDate } from '../lib/api'
import QuickActions from '../components/QuickActions'

export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  
  useEffect(() => {
    loadProfile()
    
    // 监听页面获得焦点事件，自动刷新数据
    const handleFocus = () => {
      console.log('[Profile] 页面获得焦点，刷新数据')
      loadProfile()
    }
    
    // 监听路由变化，从settings返回时刷新
    const handleRouteChange = (url) => {
      if (url === '/profile' || url === '/') {
        console.log('[Profile] 路由变化，刷新数据')
        loadProfile()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    router.events.on('routeChangeComplete', handleRouteChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])
  
  const loadProfile = async () => {
    try {
      setLoading(true)
      const result = await PWAClient.getProfile()
      setData(result)
      setError('')
    } catch (error) {
      console.error('Profile load error:', error)
      
      if (error.message.includes('Unauthorized')) {
        router.replace('/login-supabase')
        return
      }
      
      setError(error.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return
    
    try {
      setLoggingOut(true)
      
      // 清除Cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      document.cookie = 'user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      
      // 清除本地存储
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // 重定向到登录页
      router.replace('/login-supabase')
      
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }
  
  if (loading) {
    return (
      <Layout title="个人中心 - Learner Club">
        <PageSkeleton type="profile" />
      </Layout>
    )
  }
  
  if (error && !data) {
    return (
      <Layout title="个人中心 - Learner Club">
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
          <ModernCard className="p-8 text-center">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              加载失败
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadProfile()}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
            >
              重新加载
            </button>
          </ModernCard>
        </div>
      </Layout>
    )
  }
  
  return (
    <WebAppWrapper>
      <Layout title="个人中心 - Learner Club">
      <BrandHeader />
      
      <SmoothTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">

          {/* 用户个人信息头部 */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-6 pb-24 relative overflow-hidden">
            {/* 装饰性元素 */}
            <div className="absolute top-0 right-0 opacity-10">
              <div className="w-64 h-64 rounded-full bg-white transform translate-x-20 -translate-y-20"></div>
            </div>
            <div className="absolute bottom-0 left-0 opacity-5">
              <div className="w-48 h-48 rounded-full bg-white transform -translate-x-12 translate-y-12"></div>
            </div>
            
            <div className="relative z-10 flex items-start space-x-4 text-white">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl">👤</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2 truncate">
                  {data?.profile?.display_name || data?.user?.name || 'User'}
                </h1>
                <div className="space-y-1 text-blue-100">
                  {data?.user?.branch && (
                    <p className="flex items-center text-sm">
                      <span className="mr-2">🏢</span>
                      <span className="truncate">{data.user.branch} 分行</span>
                    </p>
                  )}
                  {data?.user?.joined_date && (
                    <p className="flex items-center text-sm">
                      <span className="mr-2">📅</span>
                      <span className="truncate">{formatDate(data.user.joined_date)} 加入</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 pb-8 space-y-6">
            
            {/* 个人信息卡片 - 移到顶部 */}
            <div className="-mt-16 relative z-10">
              <PersonalInfo profile={data?.profile} user={data?.user} />
            </div>
            
            {/* 功能菜单 */}
            <FunctionMenu />
            
            {/* 退出登录 */}
            <ModernCard className="p-6">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
              >
                {loggingOut ? '正在退出...' : '🚪 退出登录'}
              </button>
            </ModernCard>
            
          </div>
        </div>
      </SmoothTransition>
      
      {/* 快速操作按钮 */}
      <QuickActions />
      </Layout>
    </WebAppWrapper>
  )
}

function ProfileHeader({ user, profile }) {
  return (
    <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
      <div className="flex items-center space-x-4">
        {/* 用户头像占位符 */}
        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        
        <div className="flex-1">
          <h1 className="text-xl font-bold mb-1">
            {profile?.display_name || user?.name || 'User'}
          </h1>
          <div className="space-y-1 text-sm text-blue-100">
            {user?.branch && (
              <p>🏢 {user.branch} 分行</p>
            )}
            {user?.joined_date && (
              <p>📅 {formatDate(user.joined_date)} 加入</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 装饰性元素 */}
      <div className="absolute top-4 right-4 opacity-10">
        <span className="text-4xl">👤</span>
      </div>
    </div>
  )
}


function PersonalInfo({ profile, user }) {
  const router = useRouter()
  
  const infoItems = [
    {
      label: '昵称',
      value: profile?.display_name || '-',
      icon: '👤'
    },
    {
      label: '联系方式',
      value: profile?.phone || '-',
      icon: '📱'
    },
    {
      label: '邮箱',
      value: profile?.email || '-',
      icon: '📧'
    },
    {
      label: '月收入',
      value: profile?.income ? formatCurrency(profile.income) : '-',
      icon: '💰'
    },
    {
      label: '生活开销占比',
      value: profile?.a_pct ? `${profile.a_pct}%` : '-',
      icon: '🛒'
    },
    {
      label: '年度旅游预算',
      value: profile?.travel_budget ? formatCurrency(profile.travel_budget) : '-',
      icon: '✈️'
    },
    {
      label: '年度医疗保险',
      value: profile?.annual_medical_insurance ? formatCurrency(profile.annual_medical_insurance) : '-',
      icon: '🏥'
    },
    {
      label: '年度车险',
      value: profile?.annual_car_insurance ? formatCurrency(profile.annual_car_insurance) : '-',
      icon: '🚗'
    }
  ]
  
  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">个人信息</h3>
      
      <div className="space-y-4">
        {infoItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-gray-700">{item.label}</span>
            </div>
            <span className="font-medium text-gray-900 text-right">{item.value}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => router.push('/settings')}
          className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <p className="text-sm font-medium flex items-center justify-center">
            <span className="mr-2">✏️</span>
            点击这里修改个人信息
          </p>
        </button>
      </div>
    </ModernCard>
  )
}

function FunctionMenu() {
  const router = useRouter()
  
  const menuItems = [
    {
      icon: '💰',
      label: '快速记账',
      description: '添加收支记录',
      action: () => router.push('/add-record')
    },
    {
      icon: '🧮',
      label: '计算器',
      description: '数学计算工具',
      action: () => router.push('/calculator')
    },
    {
      icon: '📊',
      label: '历史记录',
      description: '查看详细的消费历史',
      action: () => router.push('/history')
    },
    {
      icon: '⚙️',
      label: '应用设置',
      description: '推送通知和个性化设置',
      action: () => router.push('/settings')
    },
    {
      icon: '🏆',
      label: '排行榜',
      description: '查看个人和分行排名',
      action: () => router.push('/leaderboard')
    },
    {
      icon: '❓',
      label: '帮助反馈',
      description: '使用帮助和问题反馈',
      action: () => {
        if (confirm('需要帮助或反馈？我们将跳转到反馈表单')) {
          window.open('https://forms.gle/i8v2ogSYTEzcJG2X9', '_blank')
        }
      }
    }
  ]
  
  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">功能菜单</h3>
      
      <div className="space-y-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        ))}
      </div>
    </ModernCard>
  )
}