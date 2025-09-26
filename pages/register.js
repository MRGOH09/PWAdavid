import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import WebAppWrapper from '../components/WebAppWrapper'

// 分行选择数据
const { BRANCHES: BRANCH_OPTIONS } = require('../lib/branches.js')

export default function RegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 注册表单数据
  const [formData, setFormData] = useState({
    displayName: '',
    branchCode: '',
    monthlyIncome: '',
    expensePercentage: ''
  })
  
  // 用户信息（从Google OAuth获取）
  const [userInfo, setUserInfo] = useState({
    email: 'user@example.com',
    name: '用户',
    picture: ''
  })
  
  useEffect(() => {
    // 检查认证状态，如果已经完整注册则跳转
    checkAuthAndRedirect()
  }, [])
  
  const checkAuthAndRedirect = async () => {
    try {
      const response = await fetch('/api/pwa/auth-check', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.authenticated) {
          if (!result.needsRegistration) {
            // 已经完整注册，跳转到主页
            router.replace('/')
          } else {
            // 需要注册，获取用户信息
            setUserInfo({
              email: result.user.email,
              name: result.user.name,
              picture: result.user.avatar_url || ''
            })
            
            // 如果有部分信息，预填表单
            if (result.user.profile) {
              setFormData(prev => ({
                ...prev,
                displayName: result.user.profile.display_name || result.user.name || '',
                monthlyIncome: result.user.profile.monthly_income || '',
                expensePercentage: result.user.profile.expense_percentage || ''
              }))
            } else {
              // 默认使用Google名称
              setFormData(prev => ({
                ...prev,
                displayName: result.user.name || ''
              }))
            }
          }
        } else {
          // 未认证，跳转到登录页
          router.replace('/login-google')
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error)
    }
  }
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }
  
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.displayName.trim().length >= 2
      case 2:
        return formData.branchCode !== ''
      case 3:
        return formData.monthlyIncome && parseFloat(formData.monthlyIncome) > 0
      case 4:
        return formData.expensePercentage && 
               parseFloat(formData.expensePercentage) >= 0 && 
               parseFloat(formData.expensePercentage) <= 100
      default:
        return false
    }
  }
  
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1)
      } else {
        handleCompleteRegistration()
      }
    } else {
      setError(getStepError(currentStep))
    }
  }
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }
  
  const getStepError = (step) => {
    switch (step) {
      case 1:
        return '昵称至少需要2个字符'
      case 2:
        return '请选择您所属的分行'
      case 3:
        return '请输入有效的月收入金额'
      case 4:
        return '开销占比应该在0-100%之间'
      default:
        return '请填写完整信息'
    }
  }
  
  const handleCompleteRegistration = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 调用注册完成API
      const response = await fetch('/api/pwa/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          branchCode: formData.branchCode,
          monthlyIncome: parseFloat(formData.monthlyIncome),
          expensePercentage: parseFloat(formData.expensePercentage)
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Registration completed:', result)
        
        // 注册完成，跳转到主页
        router.replace('/')
      } else {
        const error = await response.json()
        setError(error.message || '注册失败，请重试')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('注册过程中发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👋</div>
              <h3 className="text-lg font-semibold text-gray-900">设置您的昵称</h3>
              <p className="text-sm text-gray-600 mt-2">
                这个昵称将在排行榜和分享中显示
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                昵称
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder={`默认: ${userInfo.name}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                2-20个字符，可包含中文、英文和数字
              </p>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏢</div>
              <h3 className="text-lg font-semibold text-gray-900">选择您的分行</h3>
              <p className="text-sm text-gray-600 mt-2">
                这将影响您的排行榜分组和数据统计
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {BRANCH_OPTIONS.map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleInputChange('branchCode', branch)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.branchCode === branch
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">💰</div>
              <h3 className="text-lg font-semibold text-gray-900">设置月收入</h3>
              <p className="text-sm text-gray-600 mt-2">
                用于计算您的预算和理财目标
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                月收入 (RM)
              </label>
              <input
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                placeholder="例如: 5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                请输入您的税前月收入，这些信息将被安全保护
              </p>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="text-lg font-semibold text-gray-900">设置开销占比</h3>
              <p className="text-sm text-gray-600 mt-2">
                您希望生活开销占月收入的百分比
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                生活开销占比 (%)
              </label>
              <input
                type="number"
                value={formData.expensePercentage}
                onChange={(e) => handleInputChange('expensePercentage', e.target.value)}
                placeholder="例如: 60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
                step="5"
              />
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 建议：50-70%用于生活开销，剩余部分用于储蓄和投资
                </p>
                {formData.expensePercentage && formData.monthlyIncome && (
                  <p className="text-sm text-blue-800 mt-1 font-medium">
                    预计开销预算: RM {(parseFloat(formData.monthlyIncome) * parseFloat(formData.expensePercentage) / 100).toFixed(0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  return (
    <WebAppWrapper>
      <Layout title="完成注册 - Learner Club">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-md mx-auto pt-8">
            {/* 进度条 */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  第 {currentStep} 步，共 4 步
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round((currentStep / 4) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* 用户信息卡片 */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {userInfo.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{userInfo.name}</p>
                  <p className="text-sm text-gray-600">{userInfo.email}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-green-500 text-sm">✓ 已验证</span>
                </div>
              </div>
            </div>
            
            {/* 注册表单 */}
            <ModernCard>
              {renderStepContent()}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {/* 按钮组 */}
              <div className="mt-6 flex space-x-3">
                {currentStep > 1 && (
                  <button
                    onClick={handlePrevStep}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    上一步
                  </button>
                )}
                
                <button
                  onClick={handleNextStep}
                  disabled={loading || !validateStep(currentStep)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      处理中...
                    </div>
                  ) : (
                    currentStep === 4 ? '完成注册' : '下一步'
                  )}
                </button>
              </div>
            </ModernCard>
            
            {/* 安全提示 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                🔒 您的信息将被安全加密存储，仅用于个人财务分析
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </WebAppWrapper>
  )
}
