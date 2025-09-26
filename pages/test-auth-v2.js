import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestAuthV2() {
  const [logs, setLogs] = useState([])
  const [session, setSession] = useState(null)
  
  // 创建Supabase客户端 - 不自动处理URL
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        detectSessionInUrl: false,  // 关闭自动检测
        persistSession: true,
        autoRefreshToken: true
      }
    }
  ))

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = `[${timestamp}] ${message}`
    setLogs(prev => [...prev, newLog])
    console.log(`[TEST-V2] ${message}`, data || '')
  }

  useEffect(() => {
    addLog('页面加载完成')
    addLog(`当前URL: ${window.location.href}`)
    
    // 手动处理URL中的token
    handleUrlToken()
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`认证状态变化: ${event}`)
      if (session) {
        setSession(session)
        addLog(`会话建立: ${session.user.email}`)
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase])

  const handleUrlToken = async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      addLog('URL中没有找到token')
      return
    }
    
    addLog('🔑 找到OAuth token')
    
    // 方法1: 尝试使用getSessionFromUrl (已弃用但可能仍有效)
    try {
      addLog('尝试方法1: getSessionFromUrl')
      if (supabase.auth.getSessionFromUrl) {
        const { data, error } = await supabase.auth.getSessionFromUrl()
        if (error) {
          addLog(`方法1失败: ${error.message}`)
        } else if (data?.session) {
          addLog('✅ 方法1成功！')
          setSession(data.session)
          return
        }
      } else {
        addLog('方法1不可用 (函数不存在)')
      }
    } catch (e) {
      addLog(`方法1异常: ${e.message}`)
    }
    
    // 方法2: 直接调用私有API
    try {
      addLog('尝试方法2: 直接API调用验证token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      })
      
      if (response.ok) {
        const user = await response.json()
        addLog(`✅ Token有效，用户: ${user.email}`)
        
        // 尝试设置会话
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            addLog(`setSession失败: ${error.message}`)
          } else {
            addLog('✅ 方法2: 会话设置成功！')
            setSession(data.session)
            return
          }
        } catch (e) {
          addLog(`setSession异常: ${e.message}`)
        }
      } else {
        const error = await response.text()
        addLog(`Token验证失败: ${response.status} - ${error}`)
      }
    } catch (e) {
      addLog(`方法2异常: ${e.message}`)
    }
    
    // 方法3: 使用不同的Supabase客户端实例
    try {
      addLog('尝试方法3: 创建新的客户端实例')
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
      
      // 给新客户端时间处理token
      setTimeout(async () => {
        const { data: { session } } = await newSupabase.auth.getSession()
        if (session) {
          addLog('✅ 方法3: 新客户端获取到会话')
          setSession(session)
          
          // 尝试在主客户端设置
          try {
            await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            })
            addLog('✅ 主客户端会话同步成功')
          } catch (e) {
            addLog(`主客户端同步失败: ${e.message}`)
          }
        } else {
          addLog('方法3: 新客户端也无法获取会话')
        }
      }, 1000)
    } catch (e) {
      addLog(`方法3异常: ${e.message}`)
    }
  }

  const handleGoogleLogin = async () => {
    addLog('开始Google OAuth登录...')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/test-auth-v2`,
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
      setSession(null)
    }
  }

  const checkSession = async () => {
    addLog('检查当前会话...')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      addLog(`获取会话失败: ${error.message}`)
    } else if (session) {
      addLog(`✅ 活跃会话存在`)
      addLog(`用户: ${session.user.email}`)
      setSession(session)
    } else {
      addLog('⚠️ 没有活跃会话')
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 认证流程测试 V2（多种方法尝试）</h1>
      
      {session && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>✅ 当前登录用户:</h3>
          <p>Email: {session.user.email}</p>
          <p>ID: {session.user.id}</p>
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleGoogleLogin} style={{ marginRight: '10px', padding: '10px' }}>
          🔑 Google登录
        </button>
        <button onClick={checkSession} style={{ marginRight: '10px', padding: '10px' }}>
          🔍 检查会话
        </button>
        <button onClick={handleLogout} style={{ marginRight: '10px', padding: '10px' }}>
          🚪 登出
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
        <h4>📖 V2测试说明：</h4>
        <ul>
          <li>关闭了detectSessionInUrl自动处理</li>
          <li>尝试多种方法手动处理token</li>
          <li>包括直接API验证、新客户端实例等</li>
          <li>目标是找到能成功建立会话的方法</li>
        </ul>
      </div>
    </div>
  )
}