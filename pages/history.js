import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { SmoothTransition, PageSkeleton } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'
import PWAClient, { formatCurrency, formatDate, getCategoryInfo } from '../lib/api'
import { formatDisplayDate } from '../lib/date-utils'
import QuickActions from '../components/QuickActions'

// 🚀 原生PWA-Google API调用器 - 带认证的原生数据库操作
const nativeAPI = async (action, data = {}) => {
  // 获取Supabase认证token
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('请先登录')
  }

  const response = await fetch('/api/pwa/data', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}` // PWA-Google原生认证
    },
    body: JSON.stringify({ action, ...data })
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `操作失败 (${response.status})`)
  }
  
  return response.json()
}

// 分类说明函数
function getCategoryDescription(group) {
  const descriptions = {
    'A': '开销 - 生活必需支出',
    'B': '学习 - 投资未来成长', 
    'C': '储蓄 - 财富积累保障'
  }
  return descriptions[group] || `${group}类`
}

// 分类标签显示函数（更直观的用户界面）
function getCategoryLabel(group) {
  const labels = {
    'A': '生活开销',
    'B': '学习投资', 
    'C': '储蓄投资'
  }
  return labels[group] || `${group}类`
}

export default function HistoryPage() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [editingRecord, setEditingRecord] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // 默认选择当前月份
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    setSelectedMonth(currentMonth)
    loadHistory(currentMonth)
  }, [])

  // Toast自动消失
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])



  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const loadHistory = async (month = selectedMonth, offset = 0, append = false) => {
    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      const result = await PWAClient.getHistory({ 
        month, 
        limit: 20, 
        offset 
      })
      
      // 防御性检查 - 确保返回数据格式正确
      if (!result || typeof result !== 'object') {
        throw new Error('API返回数据格式错误')
      }
      
      console.log('[History] API返回数据:', result.debug || 'no debug info')
      console.log('[History] 返回的记录数量:', result.records?.length || 0)
      
      const safeRecords = Array.isArray(result.records) ? result.records : []
      
      if (append) {
        console.log('[History] 追加模式 - 原有记录:', records.length, '新增记录:', safeRecords.length)
        setRecords(prev => [...prev, ...safeRecords])
      } else {
        console.log('[History] 替换模式 - 设置新记录数量:', safeRecords.length)
        setRecords(safeRecords)
      }
      
      setHasMore(safeRecords.length === 20) // 如果返回20条记录，可能还有更多
      setError('')

    } catch (error) {
      console.error('History load error:', error)
      
      if (error.message.includes('Unauthorized')) {
        router.replace('/login-supabase')
        return
      }
      
      setError(error.message || '加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!hasMore || loadingMore) return
    loadHistory(selectedMonth, records.length, true)
  }

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth)
    setRecords([])
    loadHistory(newMonth, 0, false)
  }

  const handleDeleteRecord = async (recordId) => {
    try {
      showToast('🔄 正在删除...', 'info')
      await nativeAPI('delete-record-native', { recordId })
      window.location.reload()
    } catch (error) {
      showToast('❌ ' + (error.message || '删除失败'), 'error')
    }
  }

  const handleEditRecord = (record) => {
    setEditingRecord(record)
  }

  const handleUpdateRecord = async (recordId, updatedData) => {
    try {
      setEditingRecord(null)
      showToast('🔄 正在修改...', 'info')
      await nativeAPI('update-record-native', { recordId, ...updatedData })
      window.location.reload()
    } catch (error) {
      showToast('❌ ' + (error.message || '修改失败'), 'error')
    }
  }

  const handleCancelEdit = () => {
    setEditingRecord(null)
  }

  if (loading && !records.length) {
    return (
      <Layout title="历史记录 - Learner Club">
        <PageSkeleton type="history" />
      </Layout>
    )
  }

  return (
    <WebAppWrapper>
      <Layout title="历史记录 - Learner Club">
        <BrandHeader />
        
        <SmoothTransition>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            
            <PageHeader
              title={
                <>
                  <span>📊</span>
                  <span>LEARNER历史记录</span>
                </>
              }
              subtitle="回顾财务轨迹 · 掌握消费规律"
              onBack={() => router.back()}
              rightButton={
                <button 
                  onClick={() => router.push('/add-record')}
                  className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition-colors"
                >
                  <span className="text-xl">➕</span>
                </button>
              }
            />

            <div className="px-4 pb-8 space-y-6">
              
              {/* 月份选择 */}
              <div className="-mt-16 relative z-10">
                <ModernCard className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">选择月份</h3>
                    <MonthSelector 
                      selectedMonth={selectedMonth}
                      onMonthChange={handleMonthChange}
                    />
                  </div>
                </ModernCard>
              </div>

              {/* 记录列表 */}
              {error && !records.length ? (
                <ModernCard className="p-8 text-center">
                  <div className="text-6xl mb-4">😞</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">加载失败</h3>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <button
                    onClick={() => loadHistory()}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    重新加载
                  </button>
                </ModernCard>
              ) : records.length === 0 ? (
                <ModernCard className="p-8 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">暂无记录</h3>
                  <p className="text-gray-600 mb-6">
                    {selectedMonth === new Date().toISOString().slice(0, 7) 
                      ? '还没有记录，开始你的理财之旅吧！'
                      : `${selectedMonth} 没有消费记录`}
                  </p>
                  <button
                    onClick={() => router.push('/add-record')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    💰 开始记账
                  </button>
                </ModernCard>
              ) : (
                <>
                  <RecordsList 
                    records={records} 
                    onDeleteRecord={handleDeleteRecord}
                    onEditRecord={handleEditRecord}
                  />
                  
                  {/* 加载更多 */}
                  {hasMore && (
                    <div className="text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:from-gray-200 hover:to-gray-300 transition-all disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>加载中...</span>
                          </div>
                        ) : (
                          '📄 加载更多'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </SmoothTransition>

        {/* 编辑记录模态框 */}
        {editingRecord && (
          <EditRecordModal 
            record={editingRecord}
            onSave={handleUpdateRecord}
            onCancel={handleCancelEdit}
          />
        )}

        {/* Toast 提示 */}
        {toast && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* 快速操作按钮 */}
        <QuickActions />
      </Layout>
    </WebAppWrapper>
  )
}

// 月份选择器组件
function MonthSelector({ selectedMonth, onMonthChange }) {
  // 生成最近12个月的选项
  const months = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStr = date.toISOString().slice(0, 7)
    const monthName = date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long' 
    })
    months.push({ value: monthStr, label: monthName })
  }

  return (
    <select
      value={selectedMonth}
      onChange={(e) => onMonthChange(e.target.value)}
      className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {months.map(month => (
        <option key={month.value} value={month.value}>
          {month.label}
        </option>
      ))}
    </select>
  )
}


// 记录列表组件 - 时间流展示（参考银行应用设计）
function RecordsList({ records, onDeleteRecord, onEditRecord }) {
  // 直接按时间排序，不分组 - 最新记录在上
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = new Date(`${a.ymd || a.date} ${a.created_at || '00:00:00'}`)
    const dateB = new Date(`${b.ymd || b.date} ${b.created_at || '00:00:00'}`)
    return dateB.getTime() - dateA.getTime() // 倒序排列，最新在上
  })

  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">交易记录</h3>
      
      <div className="space-y-4">
        {sortedRecords.map((record) => (
          <TimelineRecordItem 
            key={record.id} 
            record={record} 
            onDelete={onDeleteRecord}
            onEdit={onEditRecord}
          />
        ))}
      </div>
    </ModernCard>
  )
}

// 时间线记录项组件 - 银行应用风格
function TimelineRecordItem({ record, onDelete, onEdit }) {
  const categoryInfo = getCategoryInfo(record.category_code, record.category_group)
  const isExpense = record.amount < 0
  
  // 检查是否为自动生成的记录
  const isAutoGenerated = ['travel_auto', 'ins_med_auto', 'ins_car_auto'].includes(record.category_code)
  
  // 检查是否为打卡记录
  const isCheckInRecord = record.category_code === 'checkin'
  
  // 移动端友好的删除确认
  const handleDeleteClick = (recordId) => {
    // 使用更明确的确认提示
    const confirmed = window.confirm(`确定要删除这条记录吗？\n\n${categoryInfo.name} - RM${Math.abs(record.amount).toFixed(2)}\n${record.note || '无备注'}`)
    
    if (confirmed) {
      console.log('[Mobile Delete] 用户确认删除记录:', recordId)
      onDelete(recordId)
    } else {
      console.log('[Mobile Delete] 用户取消删除')
    }
  }
  
  // 格式化日期时间 - 参考银行应用的显示方式
  const formatDateTime = (record) => {
    const dateStr = record.ymd || record.date
    const timeStr = record.created_at
    
    // 调试信息
    console.log('[TimelineRecord] 调试数据:', { dateStr, timeStr, record })
    
    // 处理不同的时间格式
    let date
    if (timeStr) {
      // 如果created_at是完整的ISO字符串 (如: 2024-08-27T10:30:00.000Z)
      if (timeStr.includes('T')) {
        date = new Date(timeStr)
      } 
      // 如果created_at只是时间部分 (如: 10:30:00)
      else if (dateStr) {
        date = new Date(`${dateStr} ${timeStr}`)
      }
      // 如果只有created_at，尝试直接解析
      else {
        date = new Date(timeStr)
      }
    } 
    // 如果没有created_at，只用日期
    else if (dateStr) {
      date = new Date(dateStr)
    }
    
    // 验证日期有效性
    if (!date || isNaN(date.getTime())) {
      console.warn('[TimelineRecord] 无效日期:', { dateStr, timeStr })
      return formatDisplayDate(dateStr || '未知时间')
    }
    
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    
    // 判断是否为今天、昨天
    if (date.toDateString() === today.toDateString()) {
      return `今天, ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨天, ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    } else {
      return `${date.getDate()} ${date.toLocaleDateString('zh-CN', { month: 'short' })}, ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    }
  }

  return (
    <div className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-200 group border-b ${
      isCheckInRecord
        ? 'bg-green-50/50 hover:bg-green-50 border-green-100'
        : isAutoGenerated 
          ? 'bg-purple-50/50 hover:bg-purple-50 border-purple-100' 
          : 'hover:bg-gray-50 border-gray-100'
    }`}>
      
      {/* 左侧：时间和交易信息 */}
      <div className="flex-1 min-w-0">
        {/* 时间戳 - 银行应用风格 */}
        <div className="text-sm text-gray-500 mb-1">
          {formatDateTime(record)}
        </div>
        
        {/* 交易描述 - 主要信息 */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xl">{categoryInfo.icon}</span>
          <p className="font-medium text-gray-900 truncate">
            {categoryInfo.name}
          </p>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full" 
                title={getCategoryDescription(record.category_group)}>
            {getCategoryLabel(record.category_group)}
          </span>
          {/* 标识特殊记录类型 */}
          {isCheckInRecord && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full" 
                  title="每日打卡记录，获得积分奖励">
              打卡
            </span>
          )}
          {isAutoGenerated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full" 
                  title="每月固定支出">
              固定
            </span>
          )}
        </div>
        
        {/* 备注信息 */}
        {record.note && (
          <div className="text-sm text-gray-500 mt-1 truncate">
            {record.note}
          </div>
        )}
      </div>
      
      {/* 右侧：金额和操作按钮 */}
      <div className="text-right flex items-center space-x-2">
        <div>
          {isCheckInRecord ? (
            <p className="font-bold text-lg text-green-500">
              +积分
            </p>
          ) : (
            <p className={`font-bold text-lg ${
              isExpense ? 'text-red-500' : 'text-blue-500'
            }`}>
              {isExpense ? '-' : '+'}RM{Math.abs(record.amount).toFixed(2)}
            </p>
          )}
        </div>
        
        {/* 特殊记录类型处理 */}
        {isCheckInRecord ? (
          <>
            {/* 打卡记录的查看按钮 */}
            <button
              onClick={() => {
                alert('这是每日打卡记录\n\n✅ 成功获得积分奖励\n💡 继续保持每日打卡习惯！\n\n打卡记录不可编辑或删除')
              }}
              className="w-10 h-10 bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-500 rounded-lg flex items-center justify-center transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
              title="查看打卡详情"
            >
              <span className="text-base">ℹ️</span>
            </button>
          </>
        ) : isAutoGenerated ? (
          <>
            {/* 设置链接按钮 */}
            <button
              onClick={() => {
                if (window.confirm('此为固定月度支出记录\n\n要调整金额请前往设置页面\n\n是否现在跳转到设置？')) {
                  window.location.href = '/settings'
                }
              }}
              className="w-10 h-10 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-500 rounded-lg flex items-center justify-center transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
              title="前往设置调整"
            >
              <span className="text-base">⚙️</span>
            </button>
          </>
        ) : (
          <>
            {/* 普通记录的编辑和删除按钮 */}
            <button
              onClick={() => onEdit(record)}
              className="w-10 h-10 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-500 rounded-lg flex items-center justify-center transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
              title="修改记录"
            >
              <span className="text-base">✏️</span>
            </button>
            
            <button
              onClick={() => handleDeleteClick(record.id)}
              className="w-10 h-10 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 rounded-lg flex items-center justify-center transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
              title="删除记录"
            >
              <span className="text-base">🗑️</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// 编辑记录模态框组件
function EditRecordModal({ record, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    group: record.category_group || 'A',
    category: record.category_code || 'food',
    amount: Math.abs(record.amount).toString(),
    date: record.ymd || record.date || new Date().toISOString().slice(0, 10),
    note: record.note || ''
  })
  const [saving, setSaving] = useState(false)

  const categoryInfo = getCategoryInfo(record.category_code, record.category_group)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await onSave(record.id, formData)
    } catch (error) {
      console.error('保存记录失败:', error)
    }

    setSaving(false)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">修改记录</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 显示原记录信息 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{categoryInfo.icon}</span>
            <span className="font-medium text-gray-900">{categoryInfo.name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {getCategoryLabel(record.category_group)}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            原金额: RM{Math.abs(record.amount).toFixed(2)} | 日期: {record.ymd || record.date}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleInputChange('group', 'A')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.group === 'A' 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                生活开销
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('group', 'B')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.group === 'B' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                学习投资
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('group', 'C')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.group === 'C' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                储蓄投资
              </button>
            </div>
          </div>

          {/* 子分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">子分类</label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="food">🍽️ 餐饮</option>
              <option value="ent">🎬 娱乐</option>
              <option value="shop">🛍️ 购物</option>
              <option value="trans">🚗 交通</option>
              <option value="book">📚 书籍</option>
              <option value="course">🎓 课程</option>
              <option value="save">💰 储蓄</option>
            </select>
          </div>

          {/* 金额输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额 (RM)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          {/* 日期输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 备注输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="可选的备注信息..."
              rows={3}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Toast 提示组件
function Toast({ message, type = 'success', onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // 入场动画
    setTimeout(() => setIsVisible(true), 50)
  }, [])
  
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // 等待动画完成
  }
  
  const getBgColor = (type) => {
    switch (type) {
      case 'success': return 'bg-gradient-to-r from-green-500 to-green-600'
      case 'error': return 'bg-gradient-to-r from-red-500 to-red-600'  
      case 'info': return 'bg-gradient-to-r from-blue-500 to-blue-600'
      case 'warning': return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600'
    }
  }
  
  const bgColor = getBgColor(type)
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`${bgColor} text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 transition-all duration-300 ${
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : '-translate-y-2 opacity-0 scale-95'
      }`}>
        <span className="text-base font-medium">{message}</span>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-200 text-xl leading-none ml-2 hover:scale-110 transition-transform"
        >
          ×
        </button>
      </div>
    </div>
  )
}
