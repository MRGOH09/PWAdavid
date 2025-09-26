import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestAuthFlow() {
  const [logs, setLogs] = useState([])
  
  // 配置Supabase客户端 - 关闭自动处理以便手动测试
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        detectSessionInUrl: false,    // 关闭自动检测，手动处理
        persistSession: true,          // 持久化session到localStorage
        autoRefreshToken: true,        // 自动刷新token
        flowType: 'implicit'           // 明确使用implicit flow
      }
    }
  ))

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = `[${timestamp}] ${message}`
    setLogs(prev => {
      const updatedLogs = [...prev, newLog]
      // 保存日志到localStorage
      localStorage.setItem('test-auth-logs', JSON.stringify(updatedLogs))
      return updatedLogs
    })
    console.log(`[TEST] ${message}`)
  }

  const handleTokenWithMultipleMethods = async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      addLog('❌ 没有找到完整的token')
      return
    }
    
    addLog('🔑 找到OAuth tokens，开始尝试多种方法...')
    
    // 方法1: 直接setSession
    addLog('📌 方法1: 直接setSession')
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (error) {
        addLog(`❌ 方法1失败: ${error.message}`)
      } else if (data.session) {
        addLog('✅ 方法1成功！会话已建立')
        addLog(`用户: ${data.session.user.email}`)
        return
      }
    } catch (e) {
      addLog(`❌ 方法1异常: ${e.message}`)
    }
    
    // 方法2: 先验证token再设置
    addLog('📌 方法2: 先验证token有效性')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      })
      
      if (response.ok) {
        const user = await response.json()
        addLog(`✅ Token有效！用户: ${user.email}`)
        
        // 现在尝试设置会话
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            addLog(`❌ 方法2 setSession失败: ${error.message}`)
          } else if (data.session) {
            addLog('✅ 方法2成功！会话已建立')
            return
          }
        } catch (e) {
          addLog(`❌ 方法2 setSession异常: ${e.message}`)
        }
      } else {
        const errorText = await response.text()
        addLog(`❌ Token验证失败: ${response.status} - ${errorText}`)
      }
    } catch (e) {
      addLog(`❌ 方法2异常: ${e.message}`)
    }
    
    // 方法3: 创建新的Supabase客户端
    addLog('📌 方法3: 创建detectSessionInUrl=true的新客户端')
    try {
      const newSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            detectSessionInUrl: true,
            persistSession: false
          }
        }
      )
      
      // 等待新客户端处理
      setTimeout(async () => {
        const { data: { session } } = await newSupabase.auth.getSession()
        if (session) {
          addLog('✅ 方法3: 新客户端成功获取会话')
          addLog(`用户: ${session.user.email}`)
          
          // 同步到主客户端
          try {
            const { error } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            })
            
            if (error) {
              addLog(`⚠️ 同步到主客户端失败: ${error.message}`)
            } else {
              addLog('✅ 会话已同步到主客户端')
            }
          } catch (e) {
            addLog(`⚠️ 同步异常: ${e.message}`)
          }
        } else {
          addLog('❌ 方法3: 新客户端也无法建立会话')
        }
      }, 1500)
    } catch (e) {
      addLog(`❌ 方法3异常: ${e.message}`)
    }
    
    // 方法4: 使用localStorage直接存储
    addLog('📌 方法4: 直接操作localStorage (不推荐但测试用)')
    try {
      const sessionData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: null  // 这里需要从token解析
      }
      
      // 尝试从token解析用户信息
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        sessionData.user = {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {}
        }
        
        localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData))
        addLog('📝 已写入localStorage')
        
        // 重新初始化客户端
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          addLog('✅ 方法4: 通过localStorage成功')
        } else {
          addLog('❌ 方法4: localStorage写入但未生效')
        }
      } catch (e) {
        addLog(`❌ 方法4 token解析失败: ${e.message}`)
      }
    } catch (e) {
      addLog(`❌ 方法4异常: ${e.message}`)
    }
  }

  useEffect(() => {
    // 从localStorage恢复之前的日志
    const savedLogs = localStorage.getItem('test-auth-logs')
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs)
      setLogs(parsedLogs)
      addLog('📁 恢复之前的日志记录')
    } else {
      addLog('页面加载完成')
    }
    
    // 显示当前URL信息用于调试
    addLog(`当前URL: ${window.location.href}`)
    
    // 检查URL中是否有token（用于调试，Supabase会自动处理）
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    if (hashParams.has('access_token')) {
      addLog('🔄 检测到OAuth token在URL hash中')
      addLog('⏳ Supabase正在自动处理token...')
      
      // 尝试多种方法处理token
      handleTokenWithMultipleMethods()
    }
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`认证状态变化: ${event}`)
      
      if (event === 'SIGNED_IN' && session) {
        addLog(`✅ 用户登录成功: ${session.user.email}`)
        
        // 测试用户存在性检查API
        try {
          addLog('开始检查用户是否存在...')
          const response = await fetch('/api/pwa/auth-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.user.email })
          })
          
          if (response.ok) {
            const result = await response.json()
            addLog(`用户存在检查结果: ${JSON.stringify(result)}`)
            
            if (result.userExists) {
              addLog('✅ 用户存在 - 可以正常使用系统')
            } else {
              addLog('❌ 用户不存在 - 需要完成注册')
            }
          } else {
            addLog(`API调用失败: ${response.status}`)
          }
        } catch (error) {
          addLog(`检查用户存在失败: ${error.message}`)
        }
      }
      
      if (event === 'SIGNED_OUT') {
        addLog('用户登出')
      }
      
      if (event === 'TOKEN_REFRESHED') {
        addLog('Token已刷新')
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase])

  const handleGoogleLogin = async () => {
    addLog('开始Google OAuth登录...')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?mode=test&next=${encodeURIComponent('/test-auth-flow')}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      })
      
      if (error) {
        addLog(`OAuth失败: ${error.message}`)
      } else {
        addLog('OAuth重定向中...')
        addLog(`重定向URL: ${data.url}`)
      }
    } catch (error) {
      addLog(`OAuth错误: ${error.message}`)
    }
  }

  const handleLogout = async () => {
    addLog('开始登出...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      addLog(`登出失败: ${error.message}`)
    } else {
      addLog('登出成功')
    }
  }

  const clearLogs = () => {
    setLogs([])
    localStorage.removeItem('test-auth-logs')
  }

  const checkSession = async () => {
    addLog('检查当前会话...')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      addLog(`获取会话失败: ${error.message}`)
    } else if (session) {
      addLog(`✅ 活跃会话存在`)
      addLog(`用户: ${session.user.email}`)
      addLog(`会话ID: ${session.access_token.substring(0, 20)}...`)
    } else {
      addLog('⚠️ 没有活跃会话')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 认证流程测试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleGoogleLogin} style={{ marginRight: '10px', padding: '10px' }}>
          🔑 Google登录测试
        </button>
        <button onClick={checkSession} style={{ marginRight: '10px', padding: '10px' }}>
          🔍 检查会话
        </button>
        <button onClick={handleLogout} style={{ marginRight: '10px', padding: '10px' }}>
          🚪 登出测试
        </button>
        <button onClick={clearLogs} style={{ padding: '10px' }}>
          🧹 清空日志
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        height: '400px', 
        overflow: 'auto',
        backgroundColor: '#f5f5f5' 
      }}>
        <h3>📋 实时日志：</h3>
        {logs.length === 0 ? (
          <p>等待操作...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              {log}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h4>📖 测试说明：</h4>
        <ul>
          <li>点击"Google登录测试"会触发OAuth流程</li>
          <li>Supabase会自动处理返回的token（使用detectSessionInUrl）</li>
          <li>登录后会自动检查用户是否在数据库中存在</li>
          <li>所有步骤都会显示在日志中</li>
        </ul>
        
        <h4>✅ 关键配置：</h4>
        <ul>
          <li>detectSessionInUrl: true - 自动处理URL中的token</li>
          <li>flowType: 'implicit' - 使用implicit flow</li>
          <li>不手动调用setSession - 让Supabase自动管理</li>
        </ul>
      </div>
    </div>
  )
}