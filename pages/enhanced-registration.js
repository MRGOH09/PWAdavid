import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import WebAppWrapper from '../components/WebAppWrapper'

export default function EnhancedRegistrationPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [authProcessed, setAuthProcessed] = useState(false)

  // Supabase客户端
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ))

  // 完整表单数据
  const [formData, setFormData] = useState({
    // 步骤1: 基本信息
    displayName: '',
    phone: '',
    branchCode: '',
    
    // 步骤2: 财务核心设置
    monthlyIncome: '',
    expensePercentage: '',
    
    // 步骤3: 年度预算规划
    travelBudget: '',
    medicalInsurance: '',
    carInsurance: ''
  })

  // 分行选项
  const BRANCH_OPTIONS = [
    'PJY', 'BLS', 'OTK', 'PU', 'UKT', 'TLK', 
    'M2', 'BP', 'MTK', 'HQ', 'VIVA', 'STL', 
    'SRD', 'PDMR', 'KK', '小天使'
  ]

  // 检查认证状态
  useEffect(() => {
    checkAuthStatus()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (authProcessed && event === 'SIGNED_IN') {
        console.log('[Enhanced Registration] 已处理过认证，跳过重复处理')
        return
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[Enhanced Registration] 用户登录成功')
        setAuthProcessed(true)
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase, authProcessed])

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }

      // 检查用户是否已经注册
      const response = await fetch('/api/pwa/auth-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.userExists) {
          router.replace('/')
          return
        }
      }
    } catch (error) {
      console.error('[Enhanced Registration] 认证检查失败:', error)
    }
  }

  // 表单验证
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.displayName.trim().length >= 2 && 
               formData.phone.trim().length >= 8 && // 手机号码至少8位
               formData.branchCode !== ''
      case 2:
        return formData.monthlyIncome > 0 && 
               formData.expensePercentage >= 0 && 
               formData.expensePercentage <= 100
      case 3:
        return true // 年度预算是可选的
      default:
        return false
    }
  }

  // 下一步
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
      setError(null)
    } else {
      setError('请填写所有必填字段')
    }
  }

  // 上一步
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  // 完成注册
  const handleCompleteRegistration = async () => {
    console.log('🚀 开始增强版注册流程...')
    setLoading(true)
    setError(null)

    try {
      // 最终验证
      if (!validateStep(1) || !validateStep(2)) {
        throw new Error('请确保必填信息都已填写完整')
      }

      // 获取当前用户会话
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (userError || sessionError || !user || !session) {
        throw new Error('用户未登录')
      }

      console.log('✅ 用户信息:', { userId: user.id, email: user.email })

      // 调用增强版注册API
      const response = await fetch('/api/enhanced-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 基本信息
          displayName: formData.displayName.trim(),
          phone: formData.phone.trim(),
          branchCode: formData.branchCode,
          userEmail: user.email,
          
          // 财务设置
          monthlyIncome: parseInt(formData.monthlyIncome),
          expensePercentage: parseInt(formData.expensePercentage),
          
          // 年度预算
          travelBudget: parseFloat(formData.travelBudget) || 0,
          medicalInsurance: parseFloat(formData.medicalInsurance) || 0,
          carInsurance: parseFloat(formData.carInsurance) || 0
        })
      })

      console.log('📥 API响应状态:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `注册失败 (${response.status})`)
      }

      const responseData = await response.json()
      console.log('🎉 注册成功！', responseData)

      // 短暂延迟显示成功状态
      setTimeout(() => {
        console.log('🔄 跳转到首页')
        router.push('/')
      }, 2000)

    } catch (error) {
      console.error('💥 注册失败:', error)
      setError(error.message || '注册过程中发生未知错误')
      setLoading(false)
    }
  }

  // 进度条
  const ProgressBar = () => (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
            currentStep >= step 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {currentStep > step ? '✓' : step}
          </div>
          {step < 3 && (
            <div className={`w-8 h-1 mx-2 rounded-full transition-all duration-200 ${
              currentStep > step ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  // 步骤标题
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return { title: '基本信息', subtitle: '完善你的个人资料' }
      case 2: return { title: '财务核心', subtitle: '设置收入和支出目标' }
      case 3: return { title: '年度规划', subtitle: '规划你的年度预算' }
      default: return { title: '', subtitle: '' }
    }
  }

  return (
    <WebAppWrapper>
      <Layout title="完善资料 - Learner Club">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-md mx-auto pt-8">
            
            {/* Logo和总标题 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                完善个人资料
              </h1>
              <p className="text-gray-600">
                让Learner Club更好地为你服务
              </p>
            </div>

            {/* 进度条 */}
            <ProgressBar />

            <ModernCard>
              {/* 步骤标题 */}
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {getStepTitle().title}
                </h2>
                <p className="text-sm text-gray-600">
                  {getStepTitle().subtitle}
                </p>
              </div>

              {/* 步骤1: 基本信息 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">👤</span>
                      昵称 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="输入您的昵称"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">📱</span>
                      手机号码 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="请输入至少8位数字，例如: +60123456789"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      💡 请输入完整的手机号码（含国家代码），至少8位数字
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">🏢</span>
                      所属分行 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.branchCode}
                        onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      >
                        <option value="">-- 请选择分行 --</option>
                        {BRANCH_OPTIONS.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤2: 财务核心 */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">💰</span>
                      月收入 (RM) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData({...formData, monthlyIncome: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如: 5000"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">📊</span>
                      生活开销目标占比 (%) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.expensePercentage}
                        onChange={(e) => setFormData({...formData, expensePercentage: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                        placeholder="例如: 60"
                        min="0"
                        max="100"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>

                  {formData.monthlyIncome > 0 && formData.expensePercentage > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 预览计算</h4>
                      <div className="text-xs text-blue-800 space-y-1">
                        <p>生活开销预算: RM {(formData.monthlyIncome * formData.expensePercentage / 100).toLocaleString()}</p>
                        <p>EPF储蓄 (24%): RM {(formData.monthlyIncome * 0.24).toLocaleString()}</p>
                        <p>剩余可支配: RM {(formData.monthlyIncome * (100 - formData.expensePercentage - 24) / 100).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 步骤3: 年度规划 */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">这些费用会自动分摊到每月相关分类中</p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">🏖️</span>
                      年度旅游预算 (RM)
                    </label>
                    <input
                      type="number"
                      value={formData.travelBudget}
                      onChange={(e) => setFormData({...formData, travelBudget: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如: 6000"
                      min="0"
                    />
                    {formData.travelBudget > 0 && (
                      <div className="text-xs text-gray-500">
                        月度分摊: RM {(formData.travelBudget / 12).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">🏥</span>
                      年度医疗保险 (RM)
                    </label>
                    <input
                      type="number"
                      value={formData.medicalInsurance}
                      onChange={(e) => setFormData({...formData, medicalInsurance: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如: 2400"
                      min="0"
                    />
                    {formData.medicalInsurance > 0 && (
                      <div className="text-xs text-gray-500">
                        月度分摊: RM {(formData.medicalInsurance / 12).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">🚗</span>
                      年度车险 (RM)
                    </label>
                    <input
                      type="number"
                      value={formData.carInsurance}
                      onChange={(e) => setFormData({...formData, carInsurance: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="例如: 1200"
                      min="0"
                    />
                    {formData.carInsurance > 0 && (
                      <div className="text-xs text-gray-500">
                        月度分摊: RM {(formData.carInsurance / 12).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">💡 智能分摊说明</h4>
                    <div className="text-xs text-green-800 space-y-1">
                      <p>• 旅游预算 → 自动加入"学习投资"分类</p>
                      <p>• 医疗保险 → 自动加入"储蓄投资"分类</p>
                      <p>• 车险费用 → 自动加入"生活开销"分类</p>
                    </div>
                  </div>
                </div>
              )}


              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <p className="text-sm text-red-600 flex-1">{error}</p>
                </div>
              )}

              {/* 导航按钮 */}
              <div className="mt-6 flex justify-between">
                {currentStep > 1 && (
                  <button
                    onClick={prevStep}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                  >
                    上一步
                  </button>
                )}
                
                <div className="flex-1" />

                {currentStep < 3 ? (
                  <button
                    onClick={nextStep}
                    disabled={!validateStep(currentStep)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteRegistration}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        完成注册中...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="mr-2">🎉</span>
                        完成注册
                      </div>
                    )}
                  </button>
                )}
              </div>
            </ModernCard>

            {/* 底部提示 */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p className="mb-2">🔒 您的信息将被安全保护</p>
              <p className="text-xs">所有字段都可以在设置中随时修改</p>
            </div>
          </div>
        </div>
      </Layout>
    </WebAppWrapper>
  )
}