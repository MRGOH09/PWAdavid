import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function AdminBranchStats() {
  const [stats, setStats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [logs, setLogs] = useState([])

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  // 简单的密码验证
  const authenticateWithPassword = async () => {
    if (password === 'AUSTIN2025') {
      setIsAuthenticated(true)
      addLog('✅ 密码正确，认证成功', 'success')
      await loadStats()
    } else {
      addLog('❌ 密码错误', 'error')
    }
  }

  // 分院信息配置 - 包含新增的小天使分院
  const branchConfig = {
    'PU': { name: 'PU分院', color: '#3B82F6', icon: '🏛️' },
    'MM': { name: 'MM分院', color: '#EF4444', icon: '🏢' },
    'KL': { name: 'KL分院', color: '#10B981', icon: '🏙️' },
    'JB': { name: 'JB分院', color: '#F59E0B', icon: '🌉' },
    'PG': { name: 'PG分院', color: '#8B5CF6', icon: '🏝️' },
    'KK': { name: 'KK分院', color: '#06B6D4', icon: '🏔️' },
    'KC': { name: 'KC分院', color: '#84CC16', icon: '🌾' },
    '小天使': { name: '小天使分院', color: '#EC4899', icon: '👼' },
    'PJY': { name: 'PJY分院', color: '#F97316', icon: '🏭' },
    'BLS': { name: 'BLS分院', color: '#14B8A6', icon: '🏪' },
    'OTK': { name: 'OTK分院', color: '#6366F1', icon: '🏬' }
  }

  const loadStats = async () => {
    setIsLoading(true)
    addLog('📊 正在加载分院统计数据...', 'info')
    
    try {
      const response = await fetch('/api/pwa/branch-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'AUSTIN2025'
        },
        body: JSON.stringify({ action: 'get_stats' })
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
        addLog(`✅ 加载了 ${data.stats.length} 个分院的统计数据`, 'success')
      } else {
        addLog(`❌ 加载失败: HTTP ${response.status}`, 'error')
      }
    } catch (error) {
      console.error('加载分院统计失败:', error)
      addLog(`❌ 加载失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
      // 每30秒自动刷新
      const interval = setInterval(loadStats, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const maxCount = Math.max(...stats.map(s => s.count), 1)

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Admin - 分院统计</title>
        </Head>
        
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-blue-400 mb-4">🔒 管理员访问 - 分院统计</h1>
            <p className="text-gray-300 mb-6">输入管理员密码查看分院统计</p>
            
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticateWithPassword()}
                placeholder="管理员密码"
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              
              <button
                onClick={authenticateWithPassword}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white p-3 rounded-lg transition-colors"
              >
                {isLoading ? '验证中...' : '🔓 验证访问'}
              </button>

              <div className="flex gap-2">
                <a
                  href="/admin-secret-user-management"
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors text-center"
                >
                  👥 用户管理
                </a>
                <a
                  href="/branch-stats"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors text-center"
                >
                  📊 公开统计
                </a>
              </div>
            </div>

            {/* 日志显示 */}
            {logs.length > 0 && (
              <div className="mt-6 bg-black text-green-400 p-3 rounded-lg font-mono text-sm max-h-32 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Admin - 分院统计管理</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* 管理员标题区域 */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-6">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-1">🛠️ 管理员 - 分院统计</h1>
                <p className="text-red-100 text-sm">
                  实时更新 • 最后刷新: {lastUpdate || '加载中...'}
                </p>
              </div>
              <div className="space-x-2">
                <a
                  href="/admin-secret-user-management"
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  👥 用户管理
                </a>
                <a
                  href="/branch-stats"
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  📊 公开版本
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 统计内容 */}
        <div className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="mt-4 text-gray-600">正在加载分院数据...</p>
            </div>
          ) : (
            <>
              {/* 总计卡片 - 管理员增强版 */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">📊 总注册人数</h3>
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.reduce((sum, branch) => sum + branch.count, 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">🏢 活跃分院数</h3>
                    <div className="text-3xl font-bold text-green-600">
                      {stats.filter(s => s.count > 0).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">👑 最大分院</h3>
                    <div className="text-xl font-bold text-purple-600">
                      {stats.length > 0 ? stats.sort((a,b) => b.count - a.count)[0].branch_code : '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {stats.length > 0 ? stats.sort((a,b) => b.count - a.count)[0].count + ' 人' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* 分院统计表格 - 管理员详细版 */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 bg-gray-50 border-b">
                  <h2 className="text-xl font-bold text-gray-800">📋 详细分院统计</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分院</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">人数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats
                        .sort((a, b) => b.count - a.count)
                        .map((branch, index) => {
                          const config = branchConfig[branch.branch_code] || { 
                            name: branch.branch_code, 
                            color: '#6B7280', 
                            icon: '🏫' 
                          }
                          const percentage = (branch.count / maxCount) * 100
                          const totalPercentage = (branch.count / stats.reduce((sum, s) => sum + s.count, 0)) * 100

                          return (
                            <tr key={branch.branch_code} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-2">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">{config.icon}</span>
                                  <div>
                                    <div className="text-lg font-medium text-gray-900">{config.name}</div>
                                    <div className="text-sm text-gray-500">{branch.branch_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div 
                                  className="text-2xl font-bold"
                                  style={{ color: config.color }}
                                >
                                  {branch.count}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-center">
                                  {branch.count >= 50 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      🔥 超活跃 ({branch.count})
                                    </span>
                                  )}
                                  {branch.count >= 20 && branch.count < 50 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      ⚡ 活跃 ({branch.count})
                                    </span>
                                  )}
                                  {branch.count >= 5 && branch.count < 20 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      🌱 成长中 ({branch.count})
                                    </span>
                                  )}
                                  {branch.count < 5 && branch.count > 0 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      🆕 新起步 ({branch.count})
                                    </span>
                                  )}
                                  {branch.count === 0 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      ⏸️ 未启动 (0)
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="text-center mt-6 space-x-4">
                <button
                  onClick={loadStats}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
                >
                  {isLoading ? '刷新中...' : '🔄 立即刷新'}
                </button>
                
                <button
                  onClick={() => setLogs([])}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
                >
                  🗑️ 清空日志
                </button>
              </div>
            </>
          )}

          {/* 操作日志 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">📋 操作日志</h2>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待操作...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}