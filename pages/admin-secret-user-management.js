import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function AdminSecretUserManagement() {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  // 简单的密码验证
  const authenticateWithPassword = async () => {
    if (password === 'AUSTIN2025') {
      setIsAuthenticated(true)
      addLog('✅ 密码正确，认证成功', 'success')
      await loadUsers()
    } else {
      addLog('❌ 密码错误', 'error')
    }
  }

  // 加载所有用户
  const loadUsers = async () => {
    setIsLoading(true)
    addLog('📋 正在加载用户列表...', 'info')
    
    try {
      const response = await fetch('/api/pwa/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'AUSTIN2025'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'list_users' })
      })

      const result = await response.json()
      if (result.ok) {
        setUsers(result.data.users)
        addLog(`✅ 加载了 ${result.data.users.length} 个用户`, 'success')
      } else {
        addLog(`❌ 加载用户失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 加载失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 获取用户详细信息
  const getUserDetails = async (userId) => {
    setIsLoading(true)
    addLog(`🔍 正在获取用户详细信息: ${userId.slice(-6)}...`, 'info')
    
    try {
      const response = await fetch('/api/pwa/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'AUSTIN2025'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'get_user_details', userId })
      })

      const result = await response.json()
      if (result.ok) {
        setUserDetails(result.data)
        addLog(`✅ 获取用户详情成功`, 'success')
      } else {
        addLog(`❌ 获取详情失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 获取失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 删除用户
  const deleteUser = async (userId) => {
    if (!confirm('⚠️ 确定要永久删除这个用户的所有数据吗？此操作不可撤销！')) {
      return
    }

    if (!confirm('⚠️ 最后确认：这将删除用户的资料、积分记录、消费记录等所有数据！')) {
      return
    }

    setIsLoading(true)
    addLog(`🗑️ 正在删除用户: ${userId.slice(-6)}...`, 'warning')
    
    try {
      const response = await fetch('/api/pwa/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'AUSTIN2025'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete_user', userId })
      })

      const result = await response.json()
      if (result.ok) {
        addLog(`✅ 用户删除成功`, 'success')
        addLog(`📊 删除统计: ${JSON.stringify(result.data.deleteStats)}`, 'info')
        setSelectedUser(null)
        setUserDetails(null)
        // 重新加载用户列表
        loadUsers()
      } else {
        addLog(`❌ 删除失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 删除失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 过滤用户
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.includes(searchTerm) ||
    user.branch_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Access Denied</title>
        </Head>
        
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-4">🔒 管理员访问</h1>
            <p className="text-gray-300 mb-6">输入管理员密码</p>
            
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
        <title>Admin User Management</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 标题 */}
          <div className="bg-red-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">🛠️ 管理员用户管理</h1>
            <p className="text-red-100">⚠️ 危险操作区域 - 用户数据删除工具</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 用户列表 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">👥 用户列表</h2>
              
              {/* 搜索 */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索用户 (名称、ID、分院...)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 用户列表 */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      getUserDetails(user.id)
                    }}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="font-medium">{user.display_name || user.name}</div>
                    <div className="text-sm text-gray-600">{user.branch_code || '无分院'}</div>
                    <div className="text-xs text-gray-400">{user.id.slice(-12)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                显示 {filteredUsers.length} / {users.length} 个用户
              </div>
            </div>

            {/* 用户详情和操作 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">👤 用户详情</h2>
              
              {selectedUser ? (
                <div>
                  {userDetails ? (
                    <div className="space-y-4">
                      {/* 基本信息 */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium mb-2">基本信息</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>姓名:</strong> {userDetails.user.name}</div>
                          <div><strong>显示名:</strong> {userDetails.user.display_name || '无'}</div>
                          <div><strong>分院:</strong> {userDetails.user.branch_code || '无'}</div>
                          <div><strong>Telegram ID:</strong> {userDetails.user.telegram_id || '无'}</div>
                          <div className="col-span-2"><strong>用户ID:</strong> {userDetails.user.id}</div>
                        </div>
                      </div>

                      {/* 数据统计 */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium mb-2">数据统计</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>消费记录:</strong> {userDetails.stats.records_count} 条</div>
                          <div><strong>积分记录:</strong> {userDetails.stats.scores_count} 条</div>
                          <div><strong>总积分:</strong> {userDetails.stats.total_score} 分</div>
                          <div><strong>预算记录:</strong> {userDetails.stats.budgets_count} 条</div>
                        </div>
                      </div>

                      {/* 危险操作 */}
                      <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                        <h3 className="font-medium text-red-700 mb-2">⚠️ 危险操作</h3>
                        <p className="text-sm text-red-600 mb-4">
                          删除此用户将永久移除以下数据：
                          用户资料、所有消费记录、积分记录、预算设置、推送订阅等
                        </p>
                        
                        <button
                          onClick={() => deleteUser(selectedUser.id)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          {isLoading ? '删除中...' : '🗑️ 永久删除用户'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-gray-600">加载用户详情中...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  选择一个用户查看详细信息
                </div>
              )}
            </div>
          </div>

          {/* 操作日志 */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
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

            <button
              onClick={() => setLogs([])}
              className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              清空日志
            </button>
          </div>
          
        </div>
      </div>
    </>
  )
}