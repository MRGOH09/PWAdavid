import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function AdminBatchDelete() {
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [filterBranch, setFilterBranch] = useState('')

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  // 服务器校验口令，设置 HttpOnly 管理员会话
  const authenticateWithPassword = async () => {
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      })
      if (!r.ok) {
        addLog('❌ 登录失败', 'error')
        return
      }
      setIsAuthenticated(true)
      addLog('✅ 登录成功', 'success')
      await loadUsers()
    } catch (e) {
      addLog('❌ 登录异常: ' + e.message, 'error')
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
          'Content-Type': 'application/json'
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

  // 批量删除用户
  const batchDeleteUsers = async () => {
    if (selectedUsers.size === 0) {
      addLog('⚠️ 请先选择要删除的用户', 'warning')
      return
    }

    const userIds = Array.from(selectedUsers)
    const userNames = userIds.map(id => {
      const user = users.find(u => u.id === id)
      return user?.display_name || user?.name || id.slice(-6)
    })

    if (!confirm(`⚠️ 确定要批量删除这 ${userIds.length} 个用户吗？\n\n用户列表：\n${userNames.join('\n')}\n\n此操作不可撤销！`)) {
      return
    }

    if (!confirm(`⚠️ 最后确认：这将删除所选用户的所有数据（资料、积分记录、消费记录等）！\n\n删除数量：${userIds.length} 个用户`)) {
      return
    }

    setIsDeleting(true)
    addLog(`🗑️ 开始批量删除 ${userIds.length} 个用户...`, 'warning')
    
    try {
      const response = await fetch('/api/pwa/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'batch_delete_users', 
          userIds: userIds 
        })
      })

      const result = await response.json()
      if (result.ok) {
        addLog(`✅ 批量删除成功！删除了 ${result.data.deletedCount} 个用户`, 'success')
        addLog(`📊 删除统计: ${JSON.stringify(result.data.totalStats)}`, 'info')
        
        // 清除选择并重新加载用户列表
        setSelectedUsers(new Set())
        loadUsers()
      } else {
        addLog(`❌ 批量删除失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 批量删除失败: ${error.message}`, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理用户选择
  const handleUserSelect = (userId) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)))
    }
  }

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id?.includes(searchTerm) ||
                         user.branch_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBranch = filterBranch === '' || user.branch_code === filterBranch
    
    return matchesSearch && matchesBranch
  })

  // 获取所有分院列表
  const allBranches = [...new Set(users.map(user => user.branch_code).filter(Boolean))].sort()

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Admin - 批量删除用户</title>
        </Head>
        
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-4">🔒 管理员访问 - 批量删除</h1>
            <p className="text-gray-300 mb-6">服务器校验，不在页面保存口令</p>
            
            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="管理员用户名"
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticateWithPassword()}
                placeholder="管理员密码"
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
              />
              
              <button
                onClick={authenticateWithPassword}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white p-3 rounded-lg transition-colors"
              >
                {isLoading ? '验证中...' : '🔓 验证访问'}
              </button>

              <div className="flex gap-2">
                <a
                  href="/admin-secret-user-management"
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors text-center text-sm"
                >
                  👤 单个删除
                </a>
                <a
                  href="/admin-branch-stats"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors text-center text-sm"
                >
                  📊 分院统计
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
        <title>Admin - 批量删除用户</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          
          {/* 标题 */}
          <div className="bg-red-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">⚠️ 批量删除用户管理</h1>
            <p className="text-red-100">危险操作区域 - 批量删除用户数据工具</p>
            <div className="flex gap-2 mt-4">
              <a
                href="/admin-secret-user-management"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                👤 单个删除
              </a>
              <a
                href="/admin-branch-stats"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                📊 分院统计
              </a>
            </div>
          </div>

          {/* 操作面板 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 items-center flex-1">
                {/* 搜索框 */}
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索用户 (名称、ID、分院...)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 分院筛选 */}
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">所有分院</option>
                  {allBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              {/* 选择状态 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  已选择 {selectedUsers.size} / {filteredUsers.length} 个用户
                </span>
                <button
                  onClick={handleSelectAll}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {selectedUsers.size === filteredUsers.length ? '取消全选' : '全选'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 用户列表 */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">👥 用户列表 ({filteredUsers.length})</h2>
              
              {/* 用户列表 */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border-b flex items-center gap-3 hover:bg-gray-50 ${
                      selectedUsers.has(user.id) ? 'bg-red-50 border-red-200' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{user.display_name || user.name}</div>
                      <div className="text-sm text-gray-600">{user.branch_code || '无分院'}</div>
                      <div className="text-xs text-gray-400">{user.id.slice(-12)}</div>
                    </div>
                    {selectedUsers.has(user.id) && (
                      <span className="text-red-500 text-sm">✓ 已选择</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 操作面板 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🚨 危险操作</h2>
              
              {selectedUsers.size > 0 ? (
                <div className="space-y-4">
                  <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                    <h3 className="font-medium text-red-700 mb-2">⚠️ 批量删除确认</h3>
                    <p className="text-sm text-red-600 mb-4">
                      即将删除 <strong>{selectedUsers.size}</strong> 个用户的所有数据：
                      用户资料、消费记录、积分记录、预算设置、推送订阅等
                    </p>
                    
                    <div className="bg-red-100 rounded p-3 mb-4">
                      <p className="text-xs text-red-800 font-medium">选中的用户：</p>
                      <div className="max-h-32 overflow-y-auto mt-2">
                        {Array.from(selectedUsers).slice(0, 10).map(userId => {
                          const user = users.find(u => u.id === userId)
                          return (
                            <div key={userId} className="text-xs text-red-700">
                              • {user?.display_name || user?.name} ({user?.branch_code || '无分院'})
                            </div>
                          )
                        })}
                        {selectedUsers.size > 10 && (
                          <div className="text-xs text-red-700">... 还有 {selectedUsers.size - 10} 个用户</div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={batchDeleteUsers}
                      disabled={isDeleting}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      {isDeleting ? (
                        <>
                          <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                          删除中... ({selectedUsers.size} 个用户)
                        </>
                      ) : (
                        `🗑️ 批量删除 (${selectedUsers.size} 个用户)`
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">📋 请从左侧选择要删除的用户</p>
                  <p className="text-sm">可以使用搜索和筛选功能快速找到目标用户</p>
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
