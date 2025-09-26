import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { SmoothTransition } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'
import PWAClient, { formatCurrency } from '../lib/api'
import QuickActions from '../components/QuickActions'

// 中文到英文分类代码映射表 - 与数据库一致
const CATEGORY_CODE_MAP = {
  '餐饮': 'food',
  '娱乐': 'ent', 
  '购物': 'shop',
  '交通': 'transport',
  '水电': 'utilities',
  '手机': 'mobile',
  '家用': 'home',
  '其他': 'other',
  '书籍': 'books',
  '课程': 'course',
  '培训': 'training',
  '认证': 'cert',
  '股票': 'stock',
  '定存': 'fixed',
  '保险': 'insurance',
  '紧急基金': 'emerg'
}

// 与Telegram系统完全一致的分类系统
const TELEGRAM_CATEGORIES = {
  A: {
    name: '生活开销',
    icon: '🛒',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    items: [
      { code: '餐饮', name: '餐饮', icon: '🍽️' },
      { code: '娱乐', name: '娱乐', icon: '🎬' },
      { code: '购物', name: '购物', icon: '🛍️' },
      { code: '交通', name: '交通', icon: '🚗' },
      { code: '水电', name: '水电', icon: '💡' },
      { code: '手机', name: '手机', icon: '📱' },
      { code: '家用', name: '家用', icon: '🏠' },
      { code: '其他', name: '其他', icon: '📦' }
    ]
  },
  B: {
    name: '学习投资',
    icon: '📚',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    items: [
      { code: '书籍', name: '书籍', icon: '📖' },
      { code: '课程', name: '课程', icon: '🎓' },
      { code: '培训', name: '培训', icon: '🔧' },
      { code: '认证', name: '认证', icon: '📜' }
    ]
  },
  C: {
    name: '储蓄投资',
    icon: '💎',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    items: [
      { code: '股票', name: '股票', icon: '📈' },
      { code: '定存', name: '定存', icon: '🏦' },
      { code: '保险', name: '保险', icon: '🛡️' },
      { code: '紧急基金', name: '紧急基金', icon: '🚨' },
      { code: '其他', name: '其他', icon: '💰' }
    ]
  }
}

// 创建空记录行 - 不再需要单独的日期字段
const createEmptyRecord = (index) => ({
  id: `temp-${Date.now()}-${index}`,
  group: 'A',
  category: '餐饮',
  amount: '',
  note: '',
  isValid: false
})

export default function AddRecordPage() {
  const router = useRouter()
  
  // 🛡️ 定时器引用 - 防止内存泄漏
  const timeoutRefs = useRef([])
  const intervalRefs = useRef([])
  
  // 模式切换状态
  const [isBatchMode, setIsBatchMode] = useState(false)
  
  // 单条记录状态
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [selectedCategory, setSelectedCategory] = useState('餐饮')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3) // 倒计时状态
  
  // 积分反馈状态
  const [scoreInfo, setScoreInfo] = useState(null)
  const [showScoreFeedback, setShowScoreFeedback] = useState(false)
  
  // Check In状态
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState('')
  
  // 批量记录状态
  const [batchRecords, setBatchRecords] = useState(() => 
    Array.from({ length: 5 }, (_, i) => createEmptyRecord(i))
  )
  const [lastSuccessCount, setLastSuccessCount] = useState(0) // 记录最后成功提交的记录数
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]) // 统一日期

  // 🛡️ 定时器清理函数
  const clearAllTimers = () => {
    timeoutRefs.current.forEach(ref => {
      if (ref.current) clearTimeout(ref.current)
    })
    intervalRefs.current.forEach(ref => {
      if (ref.current) clearInterval(ref.current)
    })
    timeoutRefs.current = []
    intervalRefs.current = []
  }

  // 🛡️ 安全的定时器创建函数
  const safeSetTimeout = (callback, delay) => {
    const ref = { current: null }
    ref.current = setTimeout(() => {
      callback()
      // 执行完后从数组中移除
      timeoutRefs.current = timeoutRefs.current.filter(r => r !== ref)
    }, delay)
    timeoutRefs.current.push(ref)
    return ref
  }

  const safeSetInterval = (callback, delay) => {
    const ref = { current: null }
    ref.current = setInterval(callback, delay)
    intervalRefs.current.push(ref)
    return ref
  }

  // 🛡️ 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])

  useEffect(() => {
    // 从URL参数中获取预选分类
    const { group, category } = router.query
    if (group && TELEGRAM_CATEGORIES[group]) {
      setSelectedGroup(group)
      if (category) {
        const categoryExists = TELEGRAM_CATEGORIES[group].items.some(item => item.code === category)
        if (categoryExists) {
          setSelectedCategory(category)
        }
      }
    }
  }, [router.query])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedCategory || !amount) {
      alert('请选择分类并输入金额')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('请输入有效的金额')
      return
    }

    try {
      setIsSubmitting(true)

      const recordData = {
        group: selectedGroup,
        category: CATEGORY_CODE_MAP[selectedCategory] || selectedCategory, // 映射为英文代码
        amount: numAmount,
        note: note.trim() || null,
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      }

      const response = await PWAClient.call('data', 'add-record', recordData)

      // 处理积分反馈
      if (response && response.score) {
        setScoreInfo({
          totalScore: response.score.total_score,
          baseScore: response.score.base_score,
          streakScore: response.score.streak_score,
          bonusScore: response.score.bonus_score,
          currentStreak: response.score.current_streak,
          bonusDetails: response.score.bonus_details || [],
          scoreMessage: response.scoreMessage,
          streakMessage: response.streakMessage,
          achievementMessage: response.achievementMessage
        })
        setShowScoreFeedback(true)
        
        // 6秒后隐藏积分反馈（比普通成功提示长一些）
        safeSetTimeout(() => {
          setShowScoreFeedback(false)
          setScoreInfo(null)
        }, 6000)
      } else {
        // 显示普通成功状态
        setShowSuccess(true)
        setCountdown(3) // 重置倒计时
        
        // 倒计时逻辑
        let count = 3
        const countdownRef = safeSetInterval(() => {
          count--
          setCountdown(count)
          if (count <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current)
              intervalRefs.current = intervalRefs.current.filter(r => r !== countdownRef)
            }
            setShowSuccess(false)
            setCountdown(3) // 重置倒计时
          }
        }, 1000)
      }
      
      // 重置表单
      setSelectedCategory('')
      setAmount('')
      setNote('')

    } catch (error) {
      console.error('添加记录失败:', error)
      alert(error.message || '添加记录失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 批量记录函数
  const updateBatchRecord = (index, field, value) => {
    setBatchRecords(prev => prev.map((record, i) => {
      if (i === index) {
        const updated = { ...record, [field]: value }
        // 实时验证 - 只需要金额和分类（日期统一设置）
        updated.isValid = updated.category && updated.amount && parseFloat(updated.amount) > 0
        return updated
      }
      return record
    }))
  }

  // 处理Enter键导航
  const handleEnterKey = (e, recordIndex, fieldIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // 字段顺序：0=类型, 1=分类, 2=金额, 3=备注
      const fieldsPerRow = 4
      const totalRecords = batchRecords.length
      
      // 计算下一个焦点位置
      let nextRecordIndex = recordIndex
      let nextFieldIndex = fieldIndex + 1
      
      // 如果是当前行的最后一个字段，跳到下一行的第一个字段
      if (nextFieldIndex >= fieldsPerRow) {
        nextFieldIndex = 0
        nextRecordIndex = recordIndex + 1
      }
      
      // 如果超出记录范围，聚焦到提交按钮
      if (nextRecordIndex >= totalRecords) {
        document.getElementById('batch-submit-btn')?.focus()
        return
      }
      
      // 构建下一个元素的ID并聚焦
      const nextElementId = `batch-${nextRecordIndex}-${nextFieldIndex}`
      const nextElement = document.getElementById(nextElementId)
      if (nextElement) {
        nextElement.focus()
      }
    }
  }

  const calculateTotal = () => {
    return batchRecords.reduce((total, record) => {
      const amount = parseFloat(record.amount) || 0
      return total + amount
    }, 0)
  }

  const getValidRecordsCount = () => {
    return batchRecords.filter(record => record.isValid).length
  }

  const getAllCategories = (group) => {
    return TELEGRAM_CATEGORIES[group]?.items || []
  }

  const handleBatchSubmit = async () => {
    const validRecords = batchRecords.filter(record => record.isValid)
    
    if (validRecords.length === 0) {
      alert('请至少填写一条完整记录')
      return
    }

    try {
      setIsSubmitting(true)
      
      // 使用PWA API直接写入Supabase数据库
      const result = await PWAClient.call('data', 'batch-add-records', { 
        records: validRecords.map(record => ({
          group: record.group,
          category: CATEGORY_CODE_MAP[record.category] || record.category, // 映射为英文代码
          amount: record.amount,
          note: record.note,
          date: batchDate // 使用统一日期
        }))
      })
      
      console.log('✅ PWA批量记录成功:', result)
      
      // 保存成功记录数
      setLastSuccessCount(validRecords.length)
      
      // 清空打卡消息，确保显示批量记录成功提示
      setCheckInMessage('')
      setShowSuccess(true)
      setCountdown(3) // 重置倒计时
      setBatchRecords(Array.from({ length: 5 }, (_, i) => createEmptyRecord(i)))
      
      // 倒计时逻辑
      let count = 3
      const batchCountdownRef = safeSetInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          if (batchCountdownRef.current) {
            clearInterval(batchCountdownRef.current)
            intervalRefs.current = intervalRefs.current.filter(r => r !== batchCountdownRef)
          }
          setShowSuccess(false)
          setLastSuccessCount(0) // 重置成功记录数
          setCountdown(3) // 重置倒计时
        }
      }, 1000)

    } catch (error) {
      console.error('PWA批量记录失败:', error)
      alert(error.message || '批量记录失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearBatch = () => {
    if (confirm('确定要清空所有记录吗？')) {
      setBatchRecords(Array.from({ length: 5 }, (_, i) => createEmptyRecord(i)))
    }
  }
  
  // KISS: 极简打卡功能 + 积分反馈
  const handleCheckIn = async () => {
    console.log('[DEBUG] 打卡按钮被点击')
    console.log('[DEBUG] hasCheckedInToday:', hasCheckedInToday)
    
    if (hasCheckedInToday) {
      console.log('[DEBUG] 今日已打卡，直接返回')
      return
    }
    
    console.log('[DEBUG] 开始打卡流程')
    setIsCheckingIn(true)
    try {
      console.log('[DEBUG] 调用PWAClient.call')
      const result = await PWAClient.call('data', 'checkin')
      console.log('[DEBUG] API返回结果:', result)
      
      if (result.success) {
        setHasCheckedInToday(true)
        localStorage.setItem('lastCheckInDate', new Date().toISOString().slice(0, 10))
        
        // 显示积分反馈
        if (result.score) {
          setScoreInfo({
            totalScore: result.score.total_score,
            baseScore: result.score.base_score,
            streakScore: result.score.streak_score || 0,
            bonusScore: result.score.bonus_score || 0,
            currentStreak: result.score.current_streak || 1,
            bonusDetails: result.score.bonus_details || [],
            scoreMessage: result.scoreMessage || `🎉 打卡获得 ${result.score.total_score} 分！`,
            streakMessage: result.streakMessage || `连续打卡 ${result.score.current_streak || 1} 天`
          })
          setShowScoreFeedback(true)
          safeSetTimeout(() => {
            setShowScoreFeedback(false)
            setScoreInfo(null)
          }, 4000)
        } else {
          setCheckInMessage('✅ 打卡成功！')
        }
      } else {
        setCheckInMessage(result.message || '今日已打卡')
        setHasCheckedInToday(true)
      }
      
    } catch (error) {
      console.error('[DEBUG] 打卡失败:', error)
      console.error('[DEBUG] 错误详情:', error.message, error.stack)
      setCheckInMessage('❌ 打卡失败，请重试')
    } finally {
      console.log('[DEBUG] 打卡流程结束')
      setIsCheckingIn(false)
      safeSetTimeout(() => setCheckInMessage(''), 3000)
    }
  }
  
  // 检查打卡状态 - 从服务器获取真实状态
  const checkTodayCheckIn = async () => {
    try {
      console.log('[DEBUG checkTodayCheckIn] 开始检查今日打卡状态')
      
      // 调用API检查真实的打卡状态
      const result = await PWAClient.call('data', 'check-checkin-status')
      console.log('[DEBUG checkTodayCheckIn] API返回:', result)
      
      if (result.success) {
        setHasCheckedInToday(result.hasCheckedIn)
        console.log('[DEBUG checkTodayCheckIn] 今日打卡状态:', result.hasCheckedIn)
        
        // 如果已打卡，设置提示消息
        if (result.hasCheckedIn && result.checkinTime) {
          setCheckInMessage(`✅ 今日已打卡 (${result.checkinTime})`)
        } else if (result.hasCheckedIn) {
          setCheckInMessage('✅ 今日已打卡')
        }
      } else {
        console.error('[DEBUG checkTodayCheckIn] 检查失败:', result.error)
        // 降级到localStorage检查
        const today = new Date().toISOString().slice(0, 10)
        const lastCheckIn = localStorage.getItem('lastCheckInDate')
        const hasChecked = lastCheckIn === today
        console.log('[DEBUG checkTodayCheckIn] 降级检查 - 今天:', today, '上次:', lastCheckIn, '已打卡:', hasChecked)
        setHasCheckedInToday(hasChecked)
      }
    } catch (error) {
      console.error('[DEBUG checkTodayCheckIn] 检查错误:', error)
      // 降级到localStorage检查
      const today = new Date().toISOString().slice(0, 10)
      const lastCheckIn = localStorage.getItem('lastCheckInDate')
      const hasChecked = lastCheckIn === today
      console.log('[DEBUG checkTodayCheckIn] 错误降级检查:', hasChecked)
      setHasCheckedInToday(hasChecked)
    }
  }
  
  // 页面加载时检查打卡状态
  useEffect(() => {
    checkTodayCheckIn()
  }, [])

  const selectedCategoryInfo = selectedCategory ? 
    TELEGRAM_CATEGORIES[selectedGroup].items.find(item => item.code === selectedCategory) : null

  return (
    <WebAppWrapper>
      <Layout title="记账 - Learner Club">
        <BrandHeader />
        
        <SmoothTransition>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            
            <PageHeader
              title={
                <>
                  <span>💰</span>
                  <span>LEARNER记账系统</span>
                </>
              }
              subtitle={isBatchMode ? '表格式批量输入 · 高效记录每笔支出' : '精准记录 · 掌控财务未来'}
              onBack={() => router.back()}
              rightButton={
                <div className="flex bg-white/20 rounded-xl p-1">
                  <button
                    onClick={() => setIsBatchMode(false)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      !isBatchMode 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    💰 单条记录
                  </button>
                  <button
                    onClick={() => setIsBatchMode(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      isBatchMode 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    📋 批量记录
                  </button>
                </div>
              }
            />

            <div className="px-4 pb-8 space-y-6">
              
              {/* Check In 按钮 - 置顶显示 */}
              <div className="-mt-12 relative z-20">
                <ModernCard className={`p-4 transition-all duration-300 ${
                  hasCheckedInToday 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 shadow-lg' 
                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        hasCheckedInToday 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 animate-pulse' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}>
                        <span className="text-xl">✅</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-gray-900">今日打卡</h3>
                          {hasCheckedInToday && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-600 text-white animate-pulse">
                              ✨ 已完成
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {hasCheckedInToday ? '🎉 今日打卡完成，积分已获得！' : '没有开销也要维持连续记录哦！'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckIn}
                      disabled={isCheckingIn || hasCheckedInToday}
                      className={`px-6 py-2 rounded-xl font-medium transition-all transform shadow-lg ${
                        hasCheckedInToday 
                          ? 'bg-green-600 text-white cursor-not-allowed border-2 border-green-500' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105'
                      } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {hasCheckedInToday ? '✅ 今日已打卡' : (isCheckingIn ? '打卡中...' : '立即打卡')}
                    </button>
                  </div>
                  
                  {/* 打卡状态消息 */}
                  {checkInMessage && hasCheckedInToday && (
                    <div className="mt-4 p-3 bg-green-200/50 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">{checkInMessage}</p>
                    </div>
                  )}
                </ModernCard>
              </div>
              
              {/* 积分反馈提示 */}
              {showScoreFeedback && scoreInfo && (
                <div className="relative z-20">
                  <ModernCard className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <div className="text-orange-800">
                      <h3 className="font-bold text-lg mb-2">{scoreInfo.scoreMessage}</h3>
                      <p className="text-sm mb-3">{scoreInfo.streakMessage}</p>
                      
                      {/* 积分详情 */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {scoreInfo.baseScore > 0 && (
                          <div className="bg-white rounded-lg p-2">
                            <div className="text-xs text-green-600">基础分</div>
                            <div className="font-bold text-green-700">{scoreInfo.baseScore}</div>
                          </div>
                        )}
                        {scoreInfo.streakScore > 0 && (
                          <div className="bg-white rounded-lg p-2">
                            <div className="text-xs text-blue-600">连续分</div>
                            <div className="font-bold text-blue-700">{scoreInfo.streakScore}</div>
                          </div>
                        )}
                        {scoreInfo.bonusScore > 0 && (
                          <div className="bg-white rounded-lg p-2">
                            <div className="text-xs text-orange-600">奖励分</div>
                            <div className="font-bold text-orange-700">{scoreInfo.bonusScore}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* 成就提示 */}
                      {scoreInfo.achievementMessage && (
                        <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                          <p className="text-yellow-800 font-semibold text-sm">
                            {scoreInfo.achievementMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </ModernCard>
                </div>
              )}

              {/* 成功对话框 */}
              {showSuccess && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
                  <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 shadow-2xl transform animate-slideUp">
                    <div className="text-center">
                      {/* 成功动画图标 */}
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-green-600 animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      
                      {checkInMessage ? (
                        <div className="text-gray-800">
                          <pre className="whitespace-pre-wrap font-semibold text-sm">
                            {checkInMessage}
                          </pre>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {isBatchMode ? '批量记录成功！' : '记录添加成功！'}
                          </h3>
                          {isBatchMode && (
                            <div className="space-y-2">
                              <p className="text-4xl font-bold text-green-600">
                                {lastSuccessCount} 条
                              </p>
                              <p className="text-gray-600">
                                成功保存到数据库
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* 自动关闭提示 */}
                      <div className="mt-6">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 animate-progress" style={{ animationDuration: '3s' }}></div>
                        </div>
                        <div className="mt-3 text-center">
                          <span className="text-3xl font-bold text-gray-700">{countdown}</span>
                          <p className="text-xs text-gray-500 mt-1">秒后自动关闭</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 根据模式显示不同内容 */}
              {isBatchMode ? (
                // 批量记录模式
                <>
                  {/* 统计卡片 - LEARNER CLUB 风格 */}
                  <div className="-mt-8" style={{ position: 'relative', zIndex: 10 }}>
                    <ModernCard className="p-6 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          📊 批量记录统计
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">"高效批量记录，掌控财务全局"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                          <div className="text-2xl mb-2">📋</div>
                          <div className="text-lg font-bold text-blue-600">{getValidRecordsCount()}</div>
                          <div className="text-sm text-gray-600">有效记录/5</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                          <div className="text-2xl mb-2">💰</div>
                          <div className="text-lg font-bold text-red-600">RM {calculateTotal().toFixed(2)}</div>
                          <div className="text-sm text-gray-600">总支出金额</div>
                        </div>
                      </div>
                    </ModernCard>
                  </div>

                  {/* 统一日期选择器 */}
                  <ModernCard className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">批量记录日期</div>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(batchDate).toLocaleDateString('zh-CN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                      <input
                        type="date"
                        value={batchDate}
                        onChange={(e) => setBatchDate(e.target.value)}
                        className="px-4 py-2 bg-white border-2 border-blue-300 text-blue-600 rounded-lg font-semibold hover:border-blue-400 transition-all"
                      />
                    </div>
                  </ModernCard>

                  {/* 简化的批量记录表格 - 方案C */}
                  <ModernCard className="p-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        📋 记录明细表
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">填写记录详情，所有记录将使用上方选择的日期</p>
                    </div>
                    
                    {/* 表格头部 - 4列布局 */}
                    <div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-gray-600">
                      <div className="col-span-3">类型</div>
                      <div className="col-span-3">分类</div>
                      <div className="col-span-3">金额</div>
                      <div className="col-span-3">备注</div>
                    </div>

                    {/* 记录行 */}
                    <div className="divide-y">
                      {batchRecords.map((record, index) => (
                        <div 
                          key={record.id}
                          className={`grid grid-cols-12 gap-2 py-2 ${
                            record.isValid 
                              ? 'bg-green-50/50' 
                              : ''
                          }`}
                        >
                          {/* 类型 */}
                          <div className="col-span-3">
                            <select
                              id={`batch-${index}-0`}
                              value={record.group}
                              onChange={(e) => {
                                updateBatchRecord(index, 'group', e.target.value)
                                // 重置分类为该组的第一个
                                const firstCategory = TELEGRAM_CATEGORIES[e.target.value]?.items[0]?.code || ''
                                updateBatchRecord(index, 'category', firstCategory)
                              }}
                              onKeyDown={(e) => handleEnterKey(e, index, 0)}
                              className="w-full px-2 py-2 bg-gray-50 rounded text-sm font-medium hover:bg-gray-100 transition-all"
                            >
                              <option value="A">🛒开销</option>
                              <option value="B">📚学习</option>
                              <option value="C">💎储蓄</option>
                            </select>
                          </div>

                          {/* 分类 */}
                          <div className="col-span-3">
                            <select
                              id={`batch-${index}-1`}
                              value={record.category}
                              onChange={(e) => updateBatchRecord(index, 'category', e.target.value)}
                              onKeyDown={(e) => handleEnterKey(e, index, 1)}
                              className="w-full px-2 py-2 bg-white border rounded text-sm hover:border-blue-400 transition-all"
                            >
                              {getAllCategories(record.group).map(cat => (
                                <option key={cat.code} value={cat.code}>
                                  {cat.icon}{cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 金额 */}
                          <div className="col-span-3">
                            <input
                              id={`batch-${index}-2`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={record.amount}
                              onChange={(e) => updateBatchRecord(index, 'amount', e.target.value)}
                              onKeyDown={(e) => handleEnterKey(e, index, 2)}
                              placeholder="0.00"
                              className="w-full px-2 py-2 border rounded text-sm font-bold text-right hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-all"
                            />
                          </div>

                          {/* 备注 */}
                          <div className="col-span-3">
                            <input
                              id={`batch-${index}-3`}
                              type="text"
                              value={record.note}
                              onChange={(e) => updateBatchRecord(index, 'note', e.target.value)}
                              onKeyDown={(e) => handleEnterKey(e, index, 3)}
                              placeholder="备注"
                              className="w-full px-2 py-2 border rounded text-sm hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 添加更多记录按钮 */}
                    <button 
                      onClick={() => setBatchRecords(prev => [...prev, createEmptyRecord(prev.length)])}
                      className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                    >
                      + 添加更多记录
                    </button>
                  </ModernCard>

                  {/* 批量操作按钮 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleClearBatch}
                      disabled={isSubmitting}
                      className="py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      🗑️ 清空
                    </button>
                    
                    <button
                      id="batch-submit-btn"
                      onClick={handleBatchSubmit}
                      disabled={isSubmitting || getValidRecordsCount() === 0}
                      className="py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>保存中...</span>
                        </div>
                      ) : (
                        `💾 保存记录 (${getValidRecordsCount()})`
                      )}
                    </button>
                  </div>

                  {/* LEARNER CLUB 批量记录指导 */}
                  <ModernCard className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-gray-900 mb-1">🎓 LEARNER CLUB 批量记录指导</h4>
                      <p className="text-sm text-gray-600">"高效记录，精准管理，成就财务自由"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/70 p-3 rounded-lg">
                        <div className="text-green-600 font-semibold mb-1">✓ 数据验证</div>
                        <p className="text-gray-700">完整记录显示绿色边框</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-lg">
                        <div className="text-blue-600 font-semibold mb-1">📅 日期管理</div>
                        <p className="text-gray-700">默认今天，可手动调整</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-lg">
                        <div className="text-purple-600 font-semibold mb-1">⚡ 智能过滤</div>
                        <p className="text-gray-700">空行自动忽略，无需手动删除</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-lg">
                        <div className="text-orange-600 font-semibold mb-1">📊 实时统计</div>
                        <p className="text-gray-700">动态显示有效数和金额</p>
                      </div>
                    </div>
                  </ModernCard>
                </>
              ) : (
                // 单条记录模式（原来的内容）
                <>
                  {/* 分组选择 */}
              <div className={showSuccess ? '-mt-4' : '-mt-8'} style={{ position: 'relative', zIndex: 10 }}>
                <ModernCard className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      🎯 选择财务分组
                    </h3>
                    <p className="text-sm text-gray-600">"分类记录，精准掌控每一分钱"</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(TELEGRAM_CATEGORIES).map(([groupKey, groupInfo]) => (
                      <button
                        key={groupKey}
                        onClick={() => {
                          setSelectedGroup(groupKey)
                          setSelectedCategory('') // 重置分类选择
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          selectedGroup === groupKey
                            ? `${groupInfo.bgColor} border-current ${groupInfo.color.replace('bg-', 'text-')}`
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{groupInfo.icon}</div>
                        <div className="text-sm font-medium">{groupInfo.name}</div>
                      </button>
                    ))}
                  </div>
                </ModernCard>
              </div>

              {/* 分类选择 */}
              <ModernCard className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {TELEGRAM_CATEGORIES[selectedGroup].icon} {TELEGRAM_CATEGORIES[selectedGroup].name}
                  </h3>
                  <p className="text-sm text-gray-600">选择具体分类，明细记录支出结构</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {TELEGRAM_CATEGORIES[selectedGroup].items.map((category) => (
                    <button
                      key={category.code}
                      onClick={() => setSelectedCategory(category.code)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedCategory === category.code
                          ? `${TELEGRAM_CATEGORIES[selectedGroup].bgColor} border-current ${TELEGRAM_CATEGORIES[selectedGroup].color.replace('bg-', 'text-')}`
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{category.icon}</span>
                        <span className="font-medium text-sm">{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ModernCard>

              {/* 金额和备注输入 */}
              <ModernCard className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    💰 金额和备注
                  </h3>
                  <p className="text-sm text-gray-600">"每一笔支出都值得记录，每一分钱都值得珍惜"</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 金额输入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金额 (RM)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">
                        💰
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* 备注输入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      备注 (可选)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="添加一些备注..."
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 记录预览 */}
                  {selectedCategoryInfo && amount && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <h4 className="font-semibold text-blue-900 mb-2">🔎 记录预览</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{selectedCategoryInfo.icon}</span>
                          <div>
                            <p className="font-medium text-blue-900">{selectedCategoryInfo.name}</p>
                            <p className="text-sm text-blue-700">{TELEGRAM_CATEGORIES[selectedGroup].name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            -RM {parseFloat(amount || 0).toFixed(2)}
                          </p>
                          <p className="text-sm text-blue-700">支出</p>
                        </div>
                      </div>
                      {note && (
                        <div className="mt-3 p-2 bg-white/50 rounded-lg">
                          <p className="text-sm text-blue-800">💬 {note}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 提交按钮 */}
                  <button
                    type="submit"
                    disabled={!selectedCategory || !amount || isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>添加中...</span>
                      </div>
                    ) : (
                      '💾 添加记录'
                    )}
                  </button>
                </form>
              </ModernCard>

              {/* 快速金额按钮 */}
              <ModernCard className="p-6">
                <div className="text-center mb-4">
                  <h4 className="font-bold text-gray-900 mb-1">⚡ 快速金额</h4>
                  <p className="text-sm text-gray-600">点击快速填入常用金额</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[10, 20, 50, 100, 200, 500, 1000, 2000].map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                      className="py-3 px-2 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:border-blue-200 border border-gray-200 rounded-lg transition-all duration-200 text-sm font-medium hover:scale-105 transform"
                    >
                      RM {quickAmount}
                    </button>
                  ))}
                </div>
              </ModernCard>
              
              {/* LEARNER CLUB 激励语 */}
              <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl mx-4">
                <p className="text-sm italic text-gray-700 mb-2">
                  🌟 "每一笔记录都是通向财务自由的一步"
                </p>
                <p className="text-xs text-gray-500">
                  LEARNER CLUB - 学习改变命运，记录成就未来
                </p>
              </div>
                </>
              )}

            </div>
          </div>
        </SmoothTransition>
        
        {/* 快速操作按钮 */}
        <QuickActions />
      </Layout>
    </WebAppWrapper>
  )
}