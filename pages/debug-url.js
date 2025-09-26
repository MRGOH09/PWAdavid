export default function DebugURL() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 URL调试信息</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>当前环境信息：</h3>
        <p><strong>当前URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
        <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
        <p><strong>Host:</strong> {typeof window !== 'undefined' ? window.location.host : 'N/A'}</p>
        <p><strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>环境变量：</h3>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p><strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '已设置' : '未设置'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>测试链接：</h3>
        <div style={{ marginBottom: '10px' }}>
          <a href="/test-auth-flow" style={{ 
            display: 'inline-block',
            padding: '10px 15px',
            backgroundColor: '#1677ff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            marginRight: '10px'
          }}>
            🧪 认证测试页面
          </a>
          
          <a href="/auth" style={{ 
            display: 'inline-block',
            padding: '10px 15px',
            backgroundColor: '#52c41a',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}>
            🔑 认证页面
          </a>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <h4>🎯 检查清单：</h4>
        <ol>
          <li>确认当前访问的域名是否为 pwagoogle.vercel.app</li>
          <li>如果不是，请直接访问 https://pwagoogle.vercel.app/debug-url</li>
          <li>检查Supabase控制台的Site URL设置</li>
          <li>检查Google OAuth Console的重定向URI配置</li>
        </ol>
      </div>
    </div>
  )
}