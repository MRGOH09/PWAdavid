export default function DebugEnv() {
  // 获取当前环境变量（只显示前后部分）
  const maskKey = (key) => {
    if (!key) return '未设置'
    if (key.length < 40) return key
    return `${key.substring(0, 30)}...${key.substring(key.length - 10)}`
  }
  
  const envInfo = {
    'SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置',
    'ANON_KEY（前30字符...后10字符）': maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    'ANON_KEY长度': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    'NODE_ENV': process.env.NODE_ENV,
    '部署环境': typeof window !== 'undefined' ? window.location.hostname : 'N/A'
  }
  
  // 如果有ANON_KEY，解析它
  let anonKeyInfo = null
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const parts = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        anonKeyInfo = {
          'issuer': payload.iss,
          'ref': payload.ref,
          'role': payload.role,
          'iat': new Date(payload.iat * 1000).toISOString(),
          'exp': payload.exp ? new Date(payload.exp * 1000).toISOString() : '无过期时间'
        }
      }
    } catch (e) {
      anonKeyInfo = { error: '解析失败: ' + e.message }
    }
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 环境变量调试</h1>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h3>当前环境变量：</h3>
        <pre>{JSON.stringify(envInfo, null, 2)}</pre>
      </div>
      
      {anonKeyInfo && (
        <div style={{ 
          backgroundColor: '#e8f4fd', 
          padding: '20px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>ANON_KEY JWT内容：</h3>
          <pre>{JSON.stringify(anonKeyInfo, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '20px', 
        borderRadius: '5px',
        border: '1px solid #ffc107'
      }}>
        <h3>⚠️ 需要检查的事项：</h3>
        <ol>
          <li>登录 Supabase Dashboard</li>
          <li>进入 Settings → API</li>
          <li>复制 <strong>anon public</strong> key（不是service_role key）</li>
          <li>对比上面显示的ANON_KEY是否一致</li>
          <li>检查Vercel环境变量设置是否正确</li>
        </ol>
        
        <h4>正确的Supabase Dashboard位置：</h4>
        <p>
          <a 
            href="https://supabase.com/dashboard/project/ezrpmrnfdvtfxwnyekzi/settings/api" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0066cc' }}
          >
            https://supabase.com/dashboard/project/ezrpmrnfdvtfxwnyekzi/settings/api
          </a>
        </p>
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#d4edda',
        borderRadius: '5px',
        border: '1px solid #28a745'
      }}>
        <h4>✅ 如果需要更新ANON_KEY：</h4>
        <ol>
          <li>从Supabase Dashboard复制正确的anon key</li>
          <li>在Vercel项目设置中更新 NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>重新部署项目</li>
        </ol>
      </div>
    </div>
  )
}