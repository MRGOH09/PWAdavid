import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard, { DataCard, CircularProgress, BalanceCard, CategoryCard } from '../components/ModernCard'
import { SmoothTransition, PageSkeleton } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import PWAClient, { formatCurrency, formatDateTime, getCategoryInfo } from '../lib/api'

export default function ModernDashboard() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  
  useEffect(() => {
    checkAuthAndLoadDashboard()
  }, [])
  
  const checkAuthAndLoadDashboard = async () => {
    try {
      const authResult = await PWAClient.checkAuth()
      if (!authResult.authenticated) {
        router.replace('/login-supabase')
        return
      }
      loadDashboard()
    } catch (error) {
      console.error('认证检查失败:', error)
      router.replace('/login-supabase')
    }
  }
  
  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const result = await PWAClient.getDashboard()
      setData(result)
      setError('')
      
    } catch (error) {
      console.error('Dashboard load error:', error)
      
      if (error.message.includes('Unauthorized')) {
        router.replace('/login-supabase')
        return
      }
      
      setError(error.message || '加载失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  const handleRefresh = () => {
    loadDashboard(true)
  }
  
  if (loading) {
    return (
      <Layout title="首页 - Learner Club">
        <PageSkeleton type="dashboard" />
      </Layout>
    )
  }
  
  if (error && !data) {
    return (
      <Layout title="首页 - Learner Club">
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
          <ModernCard className="p-8 text-center">
            <div className="text-6xl mb-4">💸</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              暂时无法连接
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadDashboard()}
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
    <Layout title="首页 - Learner Club">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        
        {/* 安装引导横幅 */}
        <InstallBanner 
          onShow={() => setShowInstallGuide(true)}
          onDismiss={() => {}} 
        />
        
        {/* 现代化头部 */}
        <ModernHeader 
          user={data?.user} 
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        
        {/* 主要内容区域 */}
        <div className="px-4 pb-8 space-y-6">
          
          {/* 余额总览卡片 */}
          <div className="-mt-16 relative z-10">
            <BalanceOverview data={data?.monthly} />
          </div>
          
          {/* 快速数据卡片组 */}
          <QuickStats data={data?.monthly} stats={data?.stats} />
          
          {/* 支出分析 */}
          <SpendingAnalysis data={data?.monthly} />
          
          {/* 最近活动 */}
          <RecentActivity records={data?.recent} />
          
        </div>
        
        {/* 安装引导弹窗 */}
        {showInstallGuide && (
          <InstallGuide onClose={() => setShowInstallGuide(false)} />
        )}
        
      </div>
    </Layout>
  )
}

// 现代化头部组件
function ModernHeader({ user, onRefresh, refreshing }) {
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? '早上好' : currentHour < 18 ? '下午好' : '晚上好'
  
  return (
    <div className="relative overflow-hidden">
      {/* 背景渐变 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-12 pb-24">
        
        {/* 装饰性元素 */}
        <div className="absolute top-0 right-0 opacity-10">
          <div className="w-64 h-64 rounded-full bg-white transform translate-x-20 -translate-y-20"></div>
        </div>
        <div className="absolute bottom-0 left-0 opacity-5">
          <div className="w-48 h-48 rounded-full bg-white transform -translate-x-12 translate-y-12"></div>
        </div>
        
        {/* 内容 */}
        <div className="relative z-10 flex justify-between items-start text-white">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl font-bold">
                {greeting}
              </h1>
            </div>
            <p className="text-xl font-semibold text-blue-100">
              {user?.name || 'Learner'}
            </p>
            <p className="text-blue-200 text-sm mt-1">
              {user?.branch ? `${user.branch} 分行` : 'Learner Club 会员'}
            </p>
          </div>
          
          {/* 刷新按钮 */}
          <button 
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl hover:bg-white/30 transition-all duration-200 transform hover:scale-105"
          >
            <span className={`text-xl ${refreshing ? 'animate-spin' : ''}`}>
              🔄
            </span>
          </button>
        </div>
        
      </div>
    </div>
  )
}

// 余额总览组件
function BalanceOverview({ data }) {
  if (!data) {
    return (
      <ModernCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </ModernCard>
    )
  }
  
  const { income, spent_a, spent_b, spent_c, days_left } = data
  const totalSpent = spent_a + spent_b + spent_c
  const remaining = Math.max(0, income - totalSpent)
  
  return (
    <BalanceCard 
      income={income}
      spent={totalSpent}
      remaining={remaining}
      daysLeft={days_left}
    />
  )
}

// 快速统计组件
function QuickStats({ data, stats }) {
  if (!data || !stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <ModernCard key={i} className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-200 rounded-full w-10 mx-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </ModernCard>
        ))}
      </div>
    )
  }
  
  const { spent_a, spent_b, spent_c, percentage_a, percentage_b, percentage_c } = data
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <DataCard
        icon="🛒"
        label="生活开销"
        value={`RM ${spent_a.toLocaleString()}`}
        change={`${percentage_a}%`}
        trend={percentage_a > 60 ? 'down' : 'neutral'}
      />
      <DataCard
        icon="📚"
        label="学习投资"
        value={`RM ${spent_b.toLocaleString()}`}
        change={`${percentage_b}%`}
        trend={percentage_b > 15 ? 'up' : 'neutral'}
      />
      <DataCard
        icon="💎"
        label="储蓄投资"
        value={`RM ${spent_c.toLocaleString()}`}
        change={`${percentage_c}%`}
        trend={percentage_c > 20 ? 'up' : 'neutral'}
      />
    </div>
  )
}

// 支出分析组件
function SpendingAnalysis({ data }) {
  if (!data) return null
  
  const { spent_a, spent_b, spent_c, percentage_a, percentage_b, percentage_c } = data
  
  const categories = [
    {
      name: '生活开销',
      amount: spent_a,
      percentage: percentage_a,
      items: 12, // 假设数据
      icon: '🛒',
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    },
    {
      name: '学习投资', 
      amount: spent_b,
      percentage: percentage_b,
      items: 5,
      icon: '📚',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      name: '储蓄投资',
      amount: spent_c,
      percentage: percentage_c,
      items: 8,
      icon: '💎',
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    }
  ]
  
  return <CategoryCard categories={categories} />
}

// 最近活动组件
function RecentActivity({ records }) {
  if (!records || records.length === 0) {
    return (
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg">暂无活动记录</p>
          <p className="text-sm text-gray-400 mt-2">
            使用Telegram Bot开始记录财务数据
          </p>
        </div>
      </ModernCard>
    )
  }
  
  return (
    <ModernCard className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          近5笔
        </span>
      </div>
      
      <div className="space-y-4">
        {records.map((record, index) => (
          <ModernActivityItem key={record.id || index} record={record} />
        ))}
      </div>
    </ModernCard>
  )
}

// 现代化活动项组件
function ModernActivityItem({ record }) {
  const categoryInfo = getCategoryInfo(record.category, record.group)
  const isExpense = record.amount < 0
  
  return (
    <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition-all duration-200 group">
      {/* 分类图标 */}
      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
        <span className="text-2xl">{categoryInfo.icon}</span>
      </div>
      
      {/* 记录信息 */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate text-lg">
          {categoryInfo.name}
        </p>
        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
          <span>{formatDateTime(record.date)}</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-medium">
            {record.group}类
          </span>
        </div>
        {record.note && (
          <p className="text-sm text-gray-400 truncate mt-2 bg-gray-50 px-3 py-1 rounded-lg">
            💬 {record.note}
          </p>
        )}
      </div>
      
      {/* 金额 */}
      <div className="text-right">
        <p className={`font-bold text-xl ${
          isExpense ? 'text-red-500' : 'text-emerald-500'
        }`}>
          {isExpense ? '-' : '+'}{formatCurrency(Math.abs(record.amount))}
        </p>
        <div className="text-xs text-gray-400 mt-1">
          {isExpense ? '支出' : '收入'}
        </div>
      </div>
    </div>
  )
}