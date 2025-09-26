import { useState, useEffect } from 'react'

export default function DebugJWT() {
  const [results, setResults] = useState([])
  
  const addResult = (title, content) => {
    setResults(prev => [...prev, { title, content }])
  }

  useEffect(() => {
    debugJWT()
  }, [])

  const debugJWT = () => {
    // 检查环境变量
    addResult('环境变量检查', {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置',
      ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 30)}...` : '未设置'
    })

    // 解码ANON_KEY（这是一个JWT）
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const parts = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          addResult('ANON_KEY JWT内容', payload)
        }
      } catch (e) {
        addResult('ANON_KEY解码失败', e.message)
      }
    }

    // 检查URL中的token
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      
      if (accessToken) {
        try {
          const parts = accessToken.split('.')
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]))
            const payload = JSON.parse(atob(parts[1]))
            addResult('OAuth Token Header', header)
            addResult('OAuth Token Payload', payload)
            
            // 比较关键字段
            const anonKeyParts = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.split('.')
            if (anonKeyParts?.length === 3) {
              const anonPayload = JSON.parse(atob(anonKeyParts[1]))
              addResult('关键字段对比', {
                'ANON_KEY ref': anonPayload.ref,
                'OAuth Token iss': payload.iss,
                '匹配状态': payload.iss?.includes(anonPayload.ref) ? '✅ 匹配' : '❌ 不匹配'
              })
            }
          }
        } catch (e) {
          addResult('Token解码失败', e.message)
        }
      } else {
        addResult('URL检查', '没有在URL中找到access_token')
      }
    }
  }

  const testDirectAPICall = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })
      
      const data = await response.json()
      addResult('直接API调用测试', {
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (error) {
      addResult('API调用错误', error.message)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 JWT调试工具</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testDirectAPICall}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          测试直接API调用
        </button>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '5px' }}>
        {results.map((result, index) => (
          <div key={index} style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#333' }}>{result.title}:</h3>
            <pre style={{ 
              backgroundColor: 'white', 
              padding: '10px', 
              borderRadius: '3px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result.content, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
        <h4>📝 说明:</h4>
        <ul>
          <li>此页面用于诊断JWT配置问题</li>
          <li>检查ANON_KEY是否正确</li>
          <li>比较OAuth返回的token与ANON_KEY的配置</li>
          <li>如果有token在URL中，会自动解析并对比</li>
        </ul>
      </div>
    </div>
  )
}