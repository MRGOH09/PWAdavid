import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Card, { StatCard, ProgressCard } from '../components/Card'
import { LoadingPage, LoadingCard } from '../components/LoadingSpinner'
import InstallGuide, { InstallBanner } from '../components/InstallGuide'
import PWAClient, { formatCurrency, formatDateTime, getCategoryInfo } from '../lib/api'

export default function DashboardPage() {
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
      // 先检查认证状态
      const authResult = await PWAClient.checkAuth()
      if (!authResult.authenticated) {
        router.replace('/login-supabase')
        return
      }
      // 认证成功后加载仪表板
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
    return <LoadingPage message="正在加载您的财务数据..." />
  }
  
  if (error && !data) {
    return (
      <Layout title="首页 - Learner Club">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">😞</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                加载失败
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => loadDashboard()}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                重试
              </button>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout title="首页 - Learner Club">
      {/* 安装引导横幅 */}
      <InstallBanner 
        onShow={() => setShowInstallGuide(true)}
        onDismiss={() => {}} 
      />
      
      {/* 用户信息头部 */}
      <UserHeader 
        user={data?.user} 
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      
      {/* 核心数据卡片 */}
      <div className="px-4 -mt-8 relative z-10">
        <MonthlyOverview data={data?.monthly} />
      </div>
      
      {/* 统计信息 */}
      <div className="px-4 mt-6">
        <UserStats stats={data?.stats} />
      </div>
      
      {/* 最近记录 */}
      <div className="px-4 mt-6 mb-8">
        <RecentRecords records={data?.recent} />
      </div>
      
      {/* 安装引导弹窗 */}
      {showInstallGuide && (
        <InstallGuide onClose={() => setShowInstallGuide(false)} />
      )}
    </Layout>
  )
}

function UserHeader({ user, onRefresh, refreshing }) {
  return (
    <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white relative">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-1">
            你好，{user?.name || 'User'} 👋
          </h1>
          <p className="text-blue-100 text-sm">
            {user?.branch ? `${user.branch} 分行` : '欢迎使用Learner Club'}
          </p>
        </div>
        
        <button 
          onClick={onRefresh}
          disabled={refreshing}
          className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
        >
          <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>
            🔄
          </span>
        </button>
      </div>
      
      {/* 装饰性元素 */}
      <div className="absolute top-4 right-4 opacity-10">
        <span className="text-4xl">📊</span>
      </div>
    </div>
  )
}

function MonthlyOverview({ data }) {
  if (!data) {
    return <LoadingCard message="加载月度数据..." />
  }
  
  const { income, spent_a, spent_b, spent_c, percentage_a, percentage_b, percentage_c, days_left } = data
  const totalSpent = spent_a + spent_b + spent_c
  const remaining = Math.max(0, income - totalSpent)
  
  return (
    <Card>
      {/* 收入总览 */}
      <div className="text-center mb-6">
        <p className="text-gray-600 text-sm mb-1">本月收入</p>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">
          {formatCurrency(income)}
        </h2>
        <p className="text-sm text-gray-500">
          剩余 {days_left} 天 • 已用 {formatCurrency(totalSpent)}
        </p>
      </div>
      
      {/* 三类支出统计 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard
          label="生活开销"
          value={formatCurrency(spent_a)}
          suffix={`${percentage_a}%`}
          color="red"
        />
        <StatCard
          label="学习投资"
          value={formatCurrency(spent_b)}
          suffix={`${percentage_b}%`}
          color="blue"
        />
        <StatCard
          label="储蓄投资"
          value={formatCurrency(spent_c)}
          suffix={`${percentage_c}%`}
          color="green"
        />
      </div>
      
      {/* 剩余金额提醒 */}
      {remaining > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-green-800 text-sm">
            💰 本月还可使用 <span className="font-semibold">{formatCurrency(remaining)}</span>
          </p>
        </div>
      )}
      
      {totalSpent > income && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-red-800 text-sm">
            ⚠️ 本月支出已超预算 <span className="font-semibold">{formatCurrency(totalSpent - income)}</span>
          </p>
        </div>
      )}
    </Card>
  )
}

function UserStats({ stats }) {
  if (!stats) {
    return <LoadingCard message="加载统计数据..." />
  }
  
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">记录统计</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="连续记录"
          value={stats.current_streak}
          suffix="天"
          color="orange"
          icon="🔥"
        />
        <StatCard
          label="总记录数"
          value={stats.total_records}
          suffix="笔"
          color="blue"
          icon="📝"
        />
      </div>
    </Card>
  )
}

function RecentRecords({ records }) {
  if (!records || records.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近记录</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-gray-500">暂无记录</p>
          <p className="text-sm text-gray-400 mt-1">
            使用Telegram Bot开始记录吧
          </p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">最近记录</h3>
        <span className="text-sm text-gray-500">近5笔</span>
      </div>
      
      <div className="space-y-3">
        {records.map((record, index) => (
          <RecordItem key={record.id || index} record={record} />
        ))}
      </div>
    </Card>
  )
}

function RecordItem({ record }) {
  const categoryInfo = getCategoryInfo(record.category, record.group)
  const isExpense = record.amount < 0
  
  return (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      {/* 分类图标 */}
      <div className="flex-shrink-0">
        <span className="text-2xl">{categoryInfo.icon}</span>
      </div>
      
      {/* 记录信息 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {categoryInfo.name}
        </p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>{formatDateTime(record.date)}</span>
          <span>•</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
            {record.group}类
          </span>
        </div>
        {record.note && (
          <p className="text-sm text-gray-400 truncate mt-1">
            {record.note}
          </p>
        )}
      </div>
      
      {/* 金额 */}
      <div className="text-right">
        <p className={`font-semibold ${
          isExpense ? 'text-red-600' : 'text-green-600'
        }`}>
          {isExpense ? '-' : '+'}{formatCurrency(Math.abs(record.amount))}
        </p>
      </div>
    </div>
  )
}