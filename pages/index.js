import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard, { DataCard, CircularProgress, BalanceCard, CategoryCard } from '../components/ModernCard'
import { SmoothTransition, useSmartPreload, PageSkeleton } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
// import PullToRefresh from '../components/PullToRefresh' // 移除以解决滚动卡顿问题
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import QuickActions from '../components/QuickActions'
import PWAClient, { formatCurrency, formatDateTime, getCategoryInfo } from '../lib/api'
import { BarChart, DonutChart, CategoryBredown } from '../components/Charts'
import { BudgetControl, RecordStatistics } from '../components/SpendingInsights'

export default function ModernDashboard() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  // 版本更新标记 - v1.1.0 - 2025-09-04 新增分院统计功能
  // Telegram跳转已移除
  const { preloadPage } = useSmartPreload()
  
  // 🛡️ 认证重定向保护 - 防止无限循环
  const [authRedirectCount, setAuthRedirectCount] = useState(0)
  const MAX_AUTH_REDIRECTS = 3
  
  useEffect(() => {
    checkAuthAndLoadDashboard()
    
    // 预加载相关页面数据
    setTimeout(() => {
      preloadPage('profile')
      preloadPage('history')
    }, 2000)
  }, [])
  
  const checkAuthAndLoadDashboard = async () => {
    try {
      // KISS: 直接用Supabase检查session，避免复杂API调用
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('[AUTH] 无session，跳转到登录页')
        
        // 🛡️ 认证保护：检查重定向次数
        if (authRedirectCount >= MAX_AUTH_REDIRECTS) {
          console.warn('[AUTH] 重定向次数过多，显示错误信息')
          setError('认证服务异常，请手动刷新页面或清除浏览器缓存后重试')
          setLoading(false)
          return
        }
        setAuthRedirectCount(prev => prev + 1)
        router.replace('/auth')
        return
      }
      
      // 检查用户是否在数据库中存在
      const response = await fetch('/api/pwa/auth-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (!result.userExists) {
          console.log('[AUTH] 用户不存在，跳转到注册页')
          
          // 🛡️ 认证保护：检查重定向次数
          if (authRedirectCount >= MAX_AUTH_REDIRECTS) {
            console.warn('[AUTH] 重定向次数过多，显示错误信息')
            setError('用户注册异常，请联系管理员或尝试重新登录')
            setLoading(false)
            return
          }
          setAuthRedirectCount(prev => prev + 1)
          router.replace('/auth?mode=complete-registration')
          return
        }
      }
      
      console.log('[AUTH] 用户已认证，加载仪表板')
      // 🛡️ 认证成功，重置计数器
      setAuthRedirectCount(0)
      loadDashboard()
    } catch (error) {
      console.error('认证检查失败:', error)
      
      // 🛡️ 认证保护：检查重定向次数
      if (authRedirectCount >= MAX_AUTH_REDIRECTS) {
        console.warn('[AUTH] 重定向次数过多，显示网络错误')
        setError('网络连接异常，请检查网络设置后刷新页面')
        setLoading(false)
        return
      }
      setAuthRedirectCount(prev => prev + 1)
      router.replace('/auth')
    }
  }
  
  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
        // 刷新时显示骨架屏而不是loading页面
        setShowSkeleton(true)
        // 强制获取最新数据
        const result = await PWAClient.getFreshDashboard()
        setData(result)
      } else {
        setLoading(true)
        // 首次加载时使用缓存数据
        const result = await PWAClient.getDashboard()
        setData(result)
      }
      
      setError('')
      
    } catch (error) {
      console.error('Dashboard load error:', error)
      
      if (error.message.includes('Unauthorized')) {
        // 🛡️ 认证保护：检查重定向次数
        if (authRedirectCount >= MAX_AUTH_REDIRECTS) {
          console.warn('[DASHBOARD] 认证错误重定向次数过多')
          setError('认证已过期，请手动点击刷新按钮重新登录')
          return
        }
        setAuthRedirectCount(prev => prev + 1)
        router.replace('/auth')
        return
      }
      
      setError(error.message || '加载失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setShowSkeleton(false)
    }
  }
  
  const handleRefresh = () => {
    loadDashboard(true)
  }
  
  // 使用骨架屏替代传统loading页面
  if (loading && !data) {
    return (
      <Layout title="首页 - Learner Club">
        <PageSkeleton type="dashboard" />
      </Layout>
    )
  }
  
  // 刷新时显示骨架屏覆盖
  if (showSkeleton) {
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
    <WebAppWrapper>
      <Layout title="首页 - Learner Club">
        
      <SmoothTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        
        {/* LEARNER CLUB 品牌标语 */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🎯</span>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold tracking-wide">LEARNER CLUB</h1>
              <p className="text-xs opacity-90">学习改变命运 · 记录成就未来 ✨</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              title="刷新数据"
            >
              <span className={`text-sm ${refreshing ? 'animate-spin' : ''}`}>
                {refreshing ? '⏳' : '🔄'}
              </span>
            </button>
          </div>
        </div>
        
        {/* 现代化头部 */}
        <ModernHeader 
          user={data?.user} 
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        
        {/* 主要内容区域 */}
        <div className="px-4 pb-8 space-y-6">
          
          {/* 强化版目标控制 - 替代原本月总览 */}
          <div className="-mt-16 relative z-10">
            <EnhancedBudgetControl data={data} />
          </div>
          
          {/* 支出占比图表 - 强调百分比 */}
          <EnhancedExpenseChart data={data} />
          
          {/* 快速数据卡片组 */}
          <QuickStats data={data?.monthly} stats={data?.stats} />
          
          {/* 记录统计 */}
          <RecordStatistics data={data} />
          
          {/* 支出分析 */}
          <SpendingAnalysis data={data?.monthly} />
          
          {/* 详细分类明细 */}
          <CategoryBredown 
            title="📋 分类明细"
            categoryDetails={data?.categoryDetails} 
            groupConfig={{
              A: { name: '开销', icon: '🛒', color: '#3B82F6' },
              B: { name: '学习', icon: '📚', color: '#10B981' },
              C: { name: '储蓄', icon: '💎', color: '#F59E0B' }
            }}
          />
          
          
          {/* 最近活动 */}
          <RecentActivity records={data?.recent} />
          
        </div>
        
        
        </div>
      </SmoothTransition>
      
      {/* PWA安装提示 */}
      <PWAInstallPrompt />
      
      {/* 快速操作按钮 */}
      <QuickActions />
      
      </Layout>
    </WebAppWrapper>
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
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
      icon: '🛒',
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    },
    {
      name: '学习投资', 
      amount: spent_b,
      percentage: percentage_b,
      icon: '📚',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      name: '储蓄投资',
      amount: spent_c,
      percentage: percentage_c,
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
            点击右下角按钮开始记录财务数据
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

// 支出占比圆环图
function ExpenseDonutChart({ data }) {
  if (!data) return null
  
  const { monthly } = data
  const total = monthly.total_expenses
  
  if (total === 0) {
    return (
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 现时支出与占比</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">本月暂无支出记录</p>
        </div>
      </ModernCard>
    )
  }
  
  const chartData = [
    {
      name: '开销',
      value: monthly.spent_a,
      color: '#3B82F6',
      icon: '🛒'
    },
    {
      name: '学习',
      value: monthly.spent_b,
      color: '#10B981', 
      icon: '📚'
    },
    {
      name: '储蓄',
      value: monthly.spent_c,
      color: '#F59E0B',
      icon: '💎'
    }
  ].filter(item => item.value > 0)
  
  return (
    <DonutChart 
      title="💰 现时支出与占比"
      data={chartData}
      total={total}
      centerText="总支出"
    />
  )
}

// 强化版目标控制组件
// 方案B预算控制组件 - 突出每日可用金额
function EnhancedBudgetControl({ data }) {
  if (!data) return null
  
  const { monthly } = data
  const { income, spent_a, budget_a, remaining_a } = monthly
  const daysLeft = monthly.days_left || 1
  
  // 方案B核心计算
  const dailyBudget = remaining_a > 0 ? (remaining_a / Math.max(1, daysLeft)) : 0
  const todaySpent = monthly.today_spent || 0  // 从API获取真实今日支出
  const weekSpent = monthly.week_spent || 0    // 从API获取真实本周支出
  
  return (
    <ModernCard className="rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">剩余预算</p>
            <p className="text-3xl font-bold">RM {remaining_a.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">剩余天数</p>
            <p className="text-2xl font-bold">{daysLeft} 天</p>
          </div>
        </div>
        
        {/* LEARNER CLUB 理念融入 */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-sm text-center opacity-90">
            💡 "控制每日开销，成就未来目标"
          </p>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {/* 核心亮点：每日可用金额 */}
        <div className="flex items-center justify-center p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
              💰
            </div>
            <div>
              <p className="text-sm text-gray-600">每日可用</p>
              <p className="text-2xl font-bold text-green-600">
                RM {dailyBudget.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
        
        {/* 消费统计网格 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">今日已花</p>
            <p className="font-bold text-blue-600">RM {todaySpent}</p>
            <p className="text-xs text-gray-400 mt-1">
              {dailyBudget > 0 ? `${((todaySpent/dailyBudget)*100).toFixed(0)}%` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">本周已花</p>
            <p className="font-bold text-purple-600">RM {weekSpent}</p>
            <p className="text-xs text-gray-400 mt-1">7天平均</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">本月已花</p>
            <p className="font-bold text-orange-600">RM {spent_a.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {budget_a > 0 ? `${((spent_a/budget_a)*100).toFixed(0)}%` : '0%'}
            </p>
          </div>
        </div>
        
        {/* 智能提醒 */}
        <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                预算状态
              </p>
              <p className="text-xs mt-1 text-blue-700">
                {dailyBudget > 0 
                  ? `还有 ${daysLeft} 天，每日可用 RM ${dailyBudget.toFixed(0)}`
                  : '本月预算已用完，请控制开支'
                }
              </p>
            </div>
          </div>
        </div>
        
        {/* 预算总览 */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <span>总预算: RM {budget_a.toLocaleString()}</span>
            <span>•</span>
            <span>月收入: RM {income.toLocaleString()}</span>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            LEARNER CLUB
          </span>
        </div>
      </div>
    </ModernCard>
  )
}

// 强化版支出占比图表 - 强调百分比
function EnhancedExpenseChart({ data }) {
  if (!data) return null
  
  const { monthly } = data
  const { percentage_a, percentage_b, percentage_c, spent_a, spent_b, spent_c } = monthly
  const total = spent_a + spent_b + spent_c
  
  if (total === 0) {
    return (
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 支出占比分析</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">💭</div>
          <p className="text-gray-500">开始记录，掌控财务</p>
        </div>
      </ModernCard>
    )
  }
  
  // 找出最大占比类别
  const maxPercentage = Math.max(percentage_a, percentage_b, percentage_c)
  const dominantCategory = percentage_a === maxPercentage ? '开销' : 
                          percentage_b === maxPercentage ? '学习' : '储蓄'
  
  // 为圆环图准备数据，强调百分比
  const chartData = [
    {
      name: '开销',
      value: spent_a,
      percentage: percentage_a,
      color: percentage_a > 60 ? '#EF4444' : '#3B82F6',
      icon: '🛒'
    },
    {
      name: '学习',
      value: spent_b,
      percentage: percentage_b,
      color: '#10B981',
      icon: '📚'
    },
    {
      name: '储蓄', 
      value: spent_c,
      percentage: percentage_c,
      color: percentage_c < 20 ? '#F59E0B' : '#10B981',
      icon: '💎'
    }
  ].filter(item => item.value > 0)
  
  return (
    <ModernCard className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span>📊 支出占比分析</span>
          <span className="text-sm font-normal text-gray-500">基于月收入计算</span>
        </h3>
      </div>
      
      {/* 自定义百分比圆环图 */}
      <div className="relative">
        <PercentageDonutChart 
          data={chartData}
          dominantCategory={dominantCategory}
          maxPercentage={maxPercentage}
        />
      </div>
      
      {/* LEARNER CLUB 理财理念 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 LEARNER CLUB 理财理念</h4>
        <div className="space-y-1">
          <p className="text-xs text-blue-800">
            • 开销 33% - 合理控制日常生活支出
          </p>
          <p className="text-xs text-blue-800">
            • 学习 33% - 持续投资自我提升和技能
          </p>
          <p className="text-xs text-blue-800">
            • 储蓄 33% - 稳健积累财富安全边际
          </p>
        </div>
      </div>
    </ModernCard>
  )
}

// 百分比专用圆环图组件
function PercentageDonutChart({ data, dominantCategory, maxPercentage }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  const radius = 80
  const strokeWidth = 20
  const center = 100
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercentage = 0
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <div>
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* SVG圆环 */}
          <svg width="200" height="200" className="transform -rotate-90">
            {/* 背景圆环 */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            
            {/* 数据圆环 */}
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -((cumulativePercentage / 100) * circumference)
              
              cumulativePercentage += percentage
              
              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-300 ${hoveredIndex === index ? 'opacity-80' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </svg>
          
          {/* 中心显示百分比 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {Math.round(maxPercentage)}%
              </div>
              <div className="text-sm text-gray-500">{dominantCategory}占比</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 图例 - 显示所有类别百分比 */}
      <div className="grid grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div 
            key={index}
            className={`text-center p-3 rounded-lg transition-all duration-200 cursor-pointer ${
              hoveredIndex === index ? 'bg-gray-50 scale-105' : 'hover:bg-gray-50'
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-xs text-gray-600">{item.name}</div>
            <div className="text-xl font-bold" style={{ color: item.color }}>
              {item.percentage}%
            </div>
            <div className="text-xs text-gray-500">
              RM {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}