import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import WebAppWrapper from '../components/WebAppWrapper'

export default function AuthPage() {
  const router = useRouter()
  // 从URL参数获取模式，默认为login
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('mode') || 'login'
    }
    return 'login'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authProcessed, setAuthProcessed] = useState(false) // KISS: 简单标志防止重复处理
  
  // Supabase客户端
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ))
  
  // 表单数据（用于注册后的额外信息）
  const [formData, setFormData] = useState({
    displayName: '',
    branchCode: '',
    monthlyIncome: '',
    expensePercentage: ''
  })
  
  // 分行选项
  const BRANCH_OPTIONS = [
    'PJY', 'BLS', 'OTK', 'PU', 'UKT', 'TLK', 
    'M2', 'BP', 'MTK', 'HQ', 'VIVA', 'STL', 
    'SRD', 'PDMR', 'KK', '小天使'
  ]
  
  useEffect(() => {
    console.log('[DEBUG] useEffect运行，当前mode:', mode)
    console.log('[DEBUG] 当前URL:', window.location.href)
    
    // 检查URL中是否有token
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    if (hashParams.has('access_token')) {
      console.log('[AUTH] 检测到OAuth token在URL hash中，Supabase自动处理中...')
      
      // 给Supabase一点时间处理token
      setTimeout(async () => {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (session) {
          console.log('[AUTH] ✅ 会话已自动建立成功！')
        } else if (error) {
          console.log('[AUTH] ❌ 会话建立失败:', error.message)
        }
      }, 500)
    }
    
    checkAuthStatus()
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] 认证状态变化:', event)
      console.log('[DEBUG] authProcessed标志:', authProcessed)
      
      // KISS: 如果已经处理过认证，跳过
      if (authProcessed && event === 'SIGNED_IN') {
        console.log('[AUTH] 🚫 已处理过认证，跳过重复处理')
        return
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[AUTH] ✅ 用户登录成功:', session.user.email)
        setAuthProcessed(true) // KISS: 标记已处理
        
        // Supabase会自动管理session，无需手动保存到localStorage
        console.log('[AUTH] Supabase session已建立，用户信息：', {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name || session.user.user_metadata.full_name,
          picture: session.user.user_metadata.picture || session.user.user_metadata.avatar_url
        })
        
        // 重新从URL读取当前模式，避免状态不同步
        const currentMode = typeof window !== 'undefined' 
          ? new URLSearchParams(window.location.search).get('mode') || 'login'
          : 'login'
        console.log('[DEBUG] 从URL重新读取的mode:', currentMode)
        
        // 检查用户是否在数据库中存在
        console.log('[AUTH] 检查用户是否在数据库中存在')
        const response = await fetch('/api/pwa/auth-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.userExists) {
            console.log('[AUTH] 用户已存在，跳转到首页')
            router.push('/')
          } else {
            console.log('[AUTH] 用户不存在，跳转到完整注册')
            // KISS: 直接跳转到完整注册页面
            router.push('/enhanced-registration')
          }
        } else {
          console.error('[AUTH] 检查用户存在失败')
          setError('检查用户状态失败，请重试')
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH] 用户登出')
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AUTH] Token已刷新')
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase, router, mode])
  
  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[AUTH] 发现已登录session，检查用户是否存在')
        
        const response = await fetch('/api/pwa/auth-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.userExists) {
            console.log('[AUTH] 用户存在，跳转到首页')
            router.replace('/')
            return
          } else {
            console.log('[AUTH] 用户不存在，跳转到完整注册')
            // KISS: 直接跳转到完整注册页面
            router.push('/enhanced-registration')
          }
        }
      } else {
        console.log('[AUTH] 无session，留在认证页')
      }
    } catch (error) {
      console.log('[AUTH] 认证检查失败:', error)
    } finally {
      setChecking(false)
    }
  }
  
  // 这个函数已经整合到onAuthStateChange中，不再需要单独的checkUserExists
  
  // Google OAuth处理
  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`启动Google OAuth ${mode === 'register' ? '注册' : '登录'}...`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?mode=${mode}`,
          queryParams: {
            access_type: 'offline',
            prompt: mode === 'register' ? 'consent' : 'select_account',
          }
        }
      })
      
      if (error) throw error
      
      console.log('重定向到Google OAuth...')
      
    } catch (error) {
      console.error('Google认证错误:', error)
      setError(error.message || 'Google认证失败')
      setLoading(false)
    }
  }
  
  // 完成注册（添加额外信息）
  const handleCompleteRegistration = async () => {
    console.log('🚀 开始注册流程...')
    setLoading(true)
    setError(null)
    
    try {
      console.log('📋 验证表单数据:', formData)
      
      // 详细验证表单
      if (!formData.displayName || formData.displayName.trim().length < 2) {
        throw new Error('昵称至少需要2个字符')
      }
      
      if (!formData.branchCode) {
        throw new Error('请选择所属分行')
      }
      
      if (!formData.monthlyIncome || formData.monthlyIncome <= 0) {
        throw new Error('请输入有效的月收入')
      }
      
      if (formData.expensePercentage === '' || formData.expensePercentage < 0 || formData.expensePercentage > 100) {
        throw new Error('开销占比应该在0-100%之间')
      }
      
      console.log('✅ 表单验证通过')
      
      // 获取当前用户和会话
      console.log('🔐 获取用户会话...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (userError) {
        console.error('❌ 获取用户失败:', userError)
        throw new Error('获取用户信息失败: ' + userError.message)
      }
      
      if (sessionError) {
        console.error('❌ 获取会话失败:', sessionError)
        throw new Error('获取会话失败: ' + sessionError.message)
      }
      
      if (!user || !session) {
        console.error('❌ 用户或会话不存在')
        throw new Error('用户未登录')
      }
      
      console.log('✅ 用户信息:', { userId: user.id, email: user.email })
      
      // 准备API请求数据
      const requestData = {
        displayName: formData.displayName.trim(),
        branchCode: formData.branchCode,
        monthlyIncome: parseInt(formData.monthlyIncome),
        expensePercentage: parseInt(formData.expensePercentage)
      }
      
      console.log('📤 发送API请求:', requestData)
      
      // KISS: 使用最简单的注册API
      const response = await fetch('/api/simple-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          branchCode: formData.branchCode,
          monthlyIncome: formData.monthlyIncome,
          expensePercentage: formData.expensePercentage,
          userEmail: user.email
        })
      })
      
      console.log('📥 API响应状态:', response.status, response.statusText)
      
      let responseData
      try {
        responseData = await response.json()
        console.log('📄 API响应数据:', responseData)
      } catch (parseError) {
        console.error('❌ 解析响应失败:', parseError)
        throw new Error('服务器响应格式错误')
      }
      
      if (!response.ok) {
        console.error('❌ API请求失败:', responseData)
        throw new Error(responseData.error || `请求失败 (${response.status})`)
      }
      
      console.log('🎉 注册成功！准备跳转...')
      
      // 短暂延迟显示成功状态
      setTimeout(() => {
        console.log('🔄 跳转到首页')
        router.push('/')
      }, 1500)
      
    } catch (error) {
      console.error('💥 注册失败:', error)
      setError(error.message || '注册过程中发生未知错误')
      setLoading(false)
    }
  }
  
  // 加载中状态
  if (checking) {
    return (
      <WebAppWrapper>
        <Layout title="Learner Club">
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">正在检查登录状态...</p>
            </div>
          </div>
        </Layout>
      </WebAppWrapper>
    )
  }
  
  // 完成注册步骤
  if (mode === 'complete-registration') {
    return (
      <WebAppWrapper>
        <Layout title="完成注册 - Learner Club">
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md mx-auto pt-8">
              {/* Logo和标题 */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  欢迎加入 Learner Club
                </h1>
                <p className="text-gray-600">
                  最后一步，完善您的个人资料
                </p>
              </div>
              
              <ModernCard>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">完成注册信息</h2>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <div className="w-8 h-1 bg-blue-500 rounded"></div>
                    <div className="w-8 h-1 bg-blue-500 rounded"></div>
                    <div className="w-8 h-1 bg-blue-200 rounded"></div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* 昵称 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">👤</span>
                      昵称
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="输入您的昵称"
                    />
                  </div>
                  
                  {/* 分行选择 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">🏢</span>
                      所属分行
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
                  
                  {/* 月收入 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">💰</span>
                      月收入 (RM)
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
                  
                  {/* 开销占比 */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="text-lg mr-2">📊</span>
                      生活开销占比 (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.expensePercentage}
                        onChange={(e) => setFormData({...formData, expensePercentage: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="例如: 60"
                        min="0"
                        max="100"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 错误提示 */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <p className="text-sm text-red-600 flex-1">{error}</p>
                    </div>
                  )}
                  
                  {/* 提交按钮 */}
                  <button
                    onClick={handleCompleteRegistration}
                    disabled={loading || !formData.displayName || !formData.branchCode || !formData.monthlyIncome || !formData.expensePercentage}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        保存中...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">🎉</span>
                        完成注册
                      </div>
                    )}
                  </button>
                </div>
              </ModernCard>
              
              {/* 底部说明 */}
              <div className="mt-6 text-center text-sm text-gray-500">
                <p className="mb-2">完成注册后，您将可以：</p>
                <div className="flex justify-center space-x-4 text-xs">
                  <div className="flex items-center">
                    <span className="mr-1">📊</span>
                    财务数据分析
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">🏆</span>
                    分院排行榜
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">📱</span>
                    PWA离线支持
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </WebAppWrapper>
    )
  }
  
  // 主认证页面（登录/注册）
  return (
    <WebAppWrapper>
      <Layout title={`${mode === 'register' ? '注册' : '登录'} - Learner Club`}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📊</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Learner Club
              </h1>
              <p className="text-gray-600">
                智能财务管理助手
              </p>
            </div>
            
            {/* 模式切换标签 */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  mode === 'login' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  mode === 'register' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                注册
              </button>
            </div>
            
            {/* 认证卡片 */}
            <ModernCard>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {mode === 'register' ? '创建新账号' : '欢迎回来'}
                </h2>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-6">
                    {mode === 'register' 
                      ? '使用Google账号快速注册' 
                      : '使用Google账号登录'}
                  </p>
                  
                  {/* Google认证按钮 */}
                  <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 mr-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {loading 
                      ? '处理中...' 
                      : mode === 'register' ? '使用Google注册' : '使用Google登录'}
                  </button>
                  
                  {/* 错误提示 */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                      {error.includes('尚未注册') && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-700">
                            💡 请切换到"注册"模式，使用相同的Google账号完成注册流程
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  {mode === 'register' ? (
                    <>
                      <p className="mb-1">新用户注册后需要填写额外信息</p>
                      <p>已有账号？<button 
                        onClick={() => {setMode('login'); setError(null)}}
                        className="text-blue-600 hover:underline"
                      >立即登录</button></p>
                    </>
                  ) : (
                    <>
                      <p className="mb-1">请确认您的Google账号已经注册过</p>
                      <p>首次使用？<button 
                        onClick={() => {setMode('register'); setError(null)}}
                        className="text-blue-600 hover:underline"
                      >立即注册</button></p>
                    </>
                  )}
                </div>
              </div>
            </ModernCard>
            
            {/* 功能介绍 */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">📊</span>
                <span>智能财务数据分析</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">🏆</span>
                <span>分院排行榜系统</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-3">📱</span>
                <span>PWA离线支持</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </WebAppWrapper>
  )
}