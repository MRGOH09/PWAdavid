import { useState, useEffect } from 'react'
import Head from 'next/head'

// 管理员面板 - 最后更新: 2025-09-04

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adminData, setAdminData] = useState({
    totalUsers: 0,
    totalScores: 0,
    recentIssues: [],
    systemHealth: 'good'
  })

  // 检查是否已登录
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token')
    if (adminToken === 'admin_logged_in') {
      setIsLoggedIn(true)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      loadAdminData()
    }
  }, [isLoggedIn])

  const loadAdminData = async () => {
    try {
      console.log('[Admin] 加载仪表板数据...')
      
      // 调用真实的仪表板API
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[Admin] 仪表板数据加载成功:', data)
      
      setAdminData({
        totalUsers: data.totalUsers,
        totalScores: data.totalScores,
        recentIssues: data.issues || [],
        systemHealth: data.systemHealth,
        milestones: data.milestones || [],
        recentStats: data.recentStats || [],
        lastUpdated: data.lastUpdated
      })
      
    } catch (error) {
      console.error('加载管理员数据失败:', error)
      // 设置错误状态
      setAdminData(prev => ({
        ...prev,
        systemHealth: 'error',
        recentIssues: [{
          type: 'api_error',
          description: '无法加载仪表板数据: ' + error.message
        }]
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <AdminLoginForm setIsLoggedIn={setIsLoggedIn} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>LEARNER CLUB - 管理面板</title>
      </Head>

      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LEARNER CLUB 管理面板</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">👋 管理员</span>
              <button
                onClick={() => window.open('/admin/papers/latest', '_blank')}
                className="text-sm bg-green-100 hover:bg-green-200 px-3 py-1 rounded text-green-700"
              >
                最新方案
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token')
                  setIsLoggedIn(false)
                }}
                className="text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded text-red-700"
              >
                退出登录
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                返回应用
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: '概览', icon: '📊' },
                { id: 'users', name: '用户管理', icon: '👥' },
                { id: 'branches', name: '分院管理', icon: '🏢' },
                { id: 'branch-stats', name: '分院统计', icon: '📈' },
                { id: 'scores', name: '积分管理', icon: '🏆' },
                { id: 'streaks', name: '连续天数管理', icon: '📅' },
                { id: 'milestones', name: '里程碑配置', icon: '⚡' },
                { id: 'tools', name: '修复工具', icon: '🛠️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        {activeTab === 'overview' && <OverviewPanel adminData={adminData} />}
        {activeTab === 'users' && <UserManagementPanel />}
        {activeTab === 'branches' && <BranchManagementPanel />}
        {activeTab === 'branch-stats' && <BranchStatsPanel />}
        {activeTab === 'scores' && <ScoreManagementPanel />}
        {activeTab === 'streaks' && <StreakManagementPanel />}
        {activeTab === 'milestones' && <MilestoneConfigPanel />}
        {activeTab === 'tools' && <RepairToolsPanel />}
      </div>
    </div>
  )
}

// 概览面板
function OverviewPanel({ adminData }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">系统概览</h2>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={adminData.totalUsers || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="总积分记录"
          value={adminData.totalScores || 0}
          icon="🏆"
          color="green"
        />
        <StatCard
          title="系统状态"
          value={adminData.systemHealth === 'good' ? '正常' : '异常'}
          icon={adminData.systemHealth === 'good' ? '✅' : '⚠️'}
          color={adminData.systemHealth === 'good' ? 'green' : 'yellow'}
        />
        <StatCard
          title="待处理问题"
          value={adminData.recentIssues?.length || 0}
          icon="🔧"
          color="orange"
        />
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="检测积分问题"
            description="扫描并检测积分系统异常"
            icon="🔍"
            onClick={() => window.open('/admin-score-repair.js', '_blank')}
          />
          <QuickAction
            title="备份数据"
            description="创建积分数据备份"
            icon="💾"
            onClick={() => alert('备份功能开发中')}
          />
          <QuickAction
            title="系统日志"
            description="查看系统操作日志"
            icon="📋"
            onClick={() => alert('日志功能开发中')}
          />
        </div>
      </div>

      {/* 近期问题 */}
      {adminData.recentIssues && adminData.recentIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">近期问题</h3>
          <div className="space-y-3">
            {adminData.recentIssues.map((issue, index) => (
              <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-600 mr-3">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{issue.type}</p>
                  <p className="text-xs text-gray-600">{issue.description}</p>
                </div>
                <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                  处理
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 用户管理面板
function UserManagementPanel() {
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // 加载分院列表
  const loadBranches = async () => {
    try {
      const response = await fetch('/api/admin/users?action=branches')
      if (!response.ok) {
        throw new Error(`获取分院列表失败: ${response.status}`)
      }
      
      const data = await response.json()
      setBranches(data.branches || [])
      
    } catch (error) {
      console.error('获取分院列表失败:', error)
    }
  }

  // 加载用户列表
  const loadUsers = async (branch = 'all') => {
    setLoading(true)
    try {
      console.log('[Admin] 加载用户列表:', branch)
      
      const url = branch === 'all' 
        ? '/api/admin/users' 
        : `/api/admin/users?branch=${encodeURIComponent(branch)}`
        
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`加载用户失败: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[Admin] 用户列表:', data)
      
      setUsers(data.users || [])
      
    } catch (error) {
      console.error('加载用户失败:', error)
      alert('加载用户失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 处理分院选择变化
  const handleBranchChange = (branch) => {
    setSelectedBranch(branch)
    loadUsers(branch)
  }

  // 组件加载时自动加载数据
  useEffect(() => {
    loadBranches()
    loadUsers('all')
  }, [])

  const viewUserScores = async (userId, username) => {
    try {
      console.log('[Admin] 查看用户积分:', userId)
      
      const response = await fetch(`/api/admin/scores?userId=${userId}&action=user-scores`)
      if (!response.ok) {
        throw new Error(`获取用户积分失败: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[Admin] 用户积分数据:', data)
      
      setSelectedUser({
        ...data,
        username
      })
      
    } catch (error) {
      console.error('获取用户积分失败:', error)
      alert('获取用户积分失败: ' + error.message)
    }
  }

  // 删除用户
  const deleteUser = async (userId, userName) => {
    if (!confirm(`⚠️ 确定要删除用户 "${userName}" 吗？\n\n此操作将：\n- 删除用户账户和资料\n- 删除所有记录和积分数据\n- 此操作不可撤销！`)) {
      return
    }

    try {
      console.log('[Admin] 删除用户:', userId)
      
      const response = await fetch('/api/pwa/admin-user-management', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': 'AUSTIN2025'
        },
        body: JSON.stringify({ 
          action: 'delete_user',
          userId: userId
        })
      })
      
      if (!response.ok) {
        throw new Error(`删除用户失败: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('[Admin] 删除结果:', result)
      
      alert(`✅ 用户 "${userName}" 已成功删除`)
      
      // 重新加载用户列表
      loadUsers(selectedBranch)
      
    } catch (error) {
      console.error('删除用户失败:', error)
      alert('删除用户失败: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
      
      {/* 分院筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">按分院筛选:</label>
          <select
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            disabled={loading}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {branches.map(branch => (
              <option key={branch.code} value={branch.code}>
                {branch.name} ({branch.userCount}人)
              </option>
            ))}
          </select>
          <button
            onClick={() => loadUsers(selectedBranch)}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            用户列表 {users.length > 0 && `(${users.length} 个用户)`}
          </h3>
          
          {users.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {loading ? '加载中...' : '暂无用户数据'}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {user.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            ID: {user.id.slice(0, 8)}... | 分行: {user.branch_code || '未设置'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Telegram ID: {user.telegram_id || '未绑定'} | 状态: {user.status}
                          </p>
                          <p className="text-xs text-gray-400">
                            注册时间: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-900 font-medium">
                            总积分: {user.stats.totalScore}
                          </div>
                          <div className="text-gray-600">
                            最大连续: {user.stats.maxStreak}天
                          </div>
                          <div className="text-gray-500 text-xs">
                            活跃天数: {user.stats.activeDays}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewUserScores(user.id, user.name)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        查看积分
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.name)}
                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                        title="删除用户"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 用户积分详情弹窗 */}
      {selectedUser && (
        <UserScoreModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  )
}

// 连续天数管理面板
function StreakManagementPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editingStreak, setEditingStreak] = useState(false)
  const [newStreakValue, setNewStreakValue] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [streakIssues, setStreakIssues] = useState([])
  const [fixingStreaks, setFixingStreaks] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  
  // 加载用户连续天数数据
  const loadStreakData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/streak-analysis')
      if (!response.ok) {
        // 如果专用API不存在，使用现有数据API
        const fallbackResponse = await fetch('/api/pwa/data?action=admin-streak-data')
        if (!fallbackResponse.ok) throw new Error('获取连续天数数据失败')
        const data = await fallbackResponse.json()
        setUsers(data.users || [])
        setStreakIssues(data.issues || [])
        return
      }
      const data = await response.json()
      setUsers(data.users || [])
      setStreakIssues(data.issues || [])
    } catch (error) {
      console.error('加载失败:', error)
      alert('加载失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  // 分析连续天数问题
  const analyzeStreaks = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/pwa/data?action=analyze-streaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('分析失败')
      const data = await response.json()
      setStreakIssues(data.issues || [])
      alert(`分析完成！发现 ${data.issues.length} 个连续天数问题`)
    } catch (error) {
      console.error('分析失败:', error)
      alert('分析失败: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }
  
  // 批量修复连续天数
  const fixAllStreaks = async () => {
    if (!confirm('确定要批量修复所有连续天数问题吗？此操作不可撤销！')) return
    
    setFixingStreaks(true)
    try {
      const response = await fetch('/api/pwa/data?action=fix-all-streaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userIds: streakIssues.map(issue => issue.userId)
        })
      })
      if (!response.ok) throw new Error('修复失败')
      const data = await response.json()
      alert(`成功修复 ${data.fixed} 个用户的连续天数`)
      await loadStreakData()
    } catch (error) {
      console.error('修复失败:', error)
      alert('修复失败: ' + error.message)
    } finally {
      setFixingStreaks(false)
    }
  }
  
  // 手动调整用户连续天数
  const adjustUserStreak = async (userId) => {
    if (!newStreakValue || !adjustmentReason) {
      alert('请输入新的连续天数和调整原因')
      return
    }
    
    try {
      const response = await fetch('/api/pwa/data?action=adjust-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newStreak: parseInt(newStreakValue),
          reason: adjustmentReason
        })
      })
      if (!response.ok) throw new Error('调整失败')
      alert('连续天数已调整')
      setEditingStreak(false)
      setSelectedUser(null)
      setNewStreakValue('')
      setAdjustmentReason('')
      await loadStreakData()
    } catch (error) {
      console.error('调整失败:', error)
      alert('调整失败: ' + error.message)
    }
  }
  
  // 修复单个用户连续天数
  const fixSingleUserStreak = async (userId, userName) => {
    if (!confirm(`确定要重新计算用户 ${userName} 的连续天数吗？`)) return
    
    try {
      const response = await fetch('/api/pwa/data?action=fix-user-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('修复失败')
      const data = await response.json()
      alert(`用户 ${userName} 的连续天数已重新计算: ${data.newStreak} 天`)
      await loadStreakData()
    } catch (error) {
      console.error('修复失败:', error)
      alert('修复失败: ' + error.message)
    }
  }
  
  useEffect(() => {
    loadStreakData()
  }, [])
  
  // 过滤用户列表
  const filteredUsers = selectedBranch === 'all' 
    ? users 
    : users.filter(u => u.branch === selectedBranch)
  
  // 获取所有分院
  const branches = [...new Set(users.map(u => u.branch).filter(Boolean))]
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">连续天数管理</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b pb-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            📅 连续签到天数监控与修复
          </h3>
          <p className="text-gray-600">
            管理和修复用户的连续签到天数，确保积分计算准确。系统会自动检测连续天数异常并提供修复工具。
          </p>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={loadStreakData}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? '加载中...' : '🔄 刷新数据'}
            </button>
            
            <button
              onClick={analyzeStreaks}
              disabled={analyzing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing ? '分析中...' : '🔍 检测问题'}
            </button>
            
            {streakIssues.length > 0 && (
              <button
                onClick={fixAllStreaks}
                disabled={fixingStreaks}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {fixingStreaks ? '修复中...' : `🔧 批量修复 (${streakIssues.length})`}
              </button>
            )}
          </div>
          
          {/* 分院筛选 */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">所有分院 ({users.length})</option>
            {branches.map(branch => {
              const count = users.filter(u => u.branch === branch).length
              return (
                <option key={branch} value={branch}>
                  {branch} ({count})
                </option>
              )
            })}
          </select>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {filteredUsers.length}
            </div>
            <div className="text-sm text-gray-600">总用户数</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredUsers.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-gray-600">活跃用户</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(filteredUsers.reduce((sum, u) => sum + (u.currentStreak || 0), 0) / filteredUsers.length) || 0}
            </div>
            <div className="text-sm text-gray-600">平均连续天数</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {streakIssues.filter(issue => filteredUsers.some(u => u.id === issue.userId)).length}
            </div>
            <div className="text-sm text-gray-600">异常用户</div>
          </div>
        </div>
        
        {/* 问题用户列表 */}
        {streakIssues.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-3 flex items-center">
              ⚠️ 发现连续天数异常 ({streakIssues.length} 个)
              <button 
                onClick={() => setStreakIssues([])}
                className="ml-2 text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {streakIssues.map(issue => (
                <div key={issue.userId} className="bg-white p-3 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div>
                        <span className="font-medium text-gray-800">
                          {issue.userName}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({issue.branch || '未分配'})
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-gray-600">连续天数: </span>
                        <span className="text-red-600 font-medium">
                          当前 {issue.currentStreak}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-medium">
                          实际 {issue.actualStreak || issue.expectedStreak || 0}
                        </span>
                      </div>
                      {issue.reason && (
                        <div className="mt-2 text-sm bg-red-50 p-2 rounded">
                          <span className="text-gray-600">❌ 异常原因: </span>
                          <span className="text-red-700">{issue.reason}</span>
                        </div>
                      )}
                      {issue.lastRecordDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          最后记录日期: {issue.lastRecordDate}
                        </div>
                      )}
                      {issue.details && issue.details.daysSinceLastRecord > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ 已{issue.details.daysSinceLastRecord}天未记录，连续已中断
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fixSingleUserStreak(issue.userId, issue.userName)}
                      className="ml-3 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                    >
                      修复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 用户列表 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  分院
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  当前连续
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  历史最长
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  最后记录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const hasIssue = streakIssues.some(issue => issue.userId === user.id)
                return (
                  <tr key={user.id} className={hasIssue ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.telegram_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.branch || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-blue-600">
                        {user.currentStreak || 0}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">天</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="font-medium">{user.maxStreak || 0}</span>
                      <span className="text-xs text-gray-500 ml-1">天</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastRecordDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasIssue ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          ⚠️ 异常
                        </span>
                      ) : user.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          ✅ 正常
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          💤 未激活
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setEditingStreak(true)
                          setNewStreakValue(user.currentStreak?.toString() || '0')
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        手动调整
                      </button>
                      <button
                        onClick={() => fixSingleUserStreak(user.id, user.name)}
                        className="text-green-600 hover:text-green-900"
                      >
                        重新计算
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* 手动调整弹窗 */}
        {editingStreak && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">
                调整连续天数 - {selectedUser.name}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600 mb-1">用户信息</div>
                  <div className="text-sm">
                    <span className="font-medium">{selectedUser.name}</span>
                    <span className="text-gray-500 ml-2">{selectedUser.branch}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    当前连续天数
                  </label>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedUser.currentStreak || 0} 天
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新的连续天数 *
                  </label>
                  <input
                    type="number"
                    value={newStreakValue}
                    onChange={(e) => setNewStreakValue(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                    max="365"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    调整原因 *
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    rows="3"
                    placeholder="请详细说明调整原因，如：数据迁移、系统错误修正、用户申诉等..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingStreak(false)
                    setSelectedUser(null)
                    setNewStreakValue('')
                    setAdjustmentReason('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => adjustUserStreak(selectedUser.id)}
                  disabled={!newStreakValue || !adjustmentReason}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  确认调整
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📋 使用说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>检测问题</strong>：自动分析所有用户的连续天数计算是否正确</li>
            <li>• <strong>批量修复</strong>：一键修复所有检测到的连续天数异常</li>
            <li>• <strong>重新计算</strong>：根据用户的记录历史重新计算连续天数</li>
            <li>• <strong>手动调整</strong>：直接设置用户的连续天数（需要填写调整原因）</li>
            <li>• <strong>数据同步</strong>：修复后的连续天数会立即影响积分计算</li>
            <li>• ⚠️ <strong>注意</strong>：手动调整会覆盖系统计算结果，请谨慎操作</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// 积分管理面板
function ScoreManagementPanel() {
  const [analyzing, setAnalyzing] = useState(false)
  const [errorUsers, setErrorUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [fixing, setFixing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  // 分析积分错误
  const analyzeScoreErrors = async () => {
    setAnalyzing(true)
    try {
      console.log('[Admin] 开始分析积分错误...')
      
      const response = await fetch('/api/admin/fix-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })
      })

      if (!response.ok) {
        throw new Error(`分析失败: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Admin] 分析结果:', data)
      
      setErrorUsers(data.errorUsers || [])
      setAnalysisResult(data.summary)
      setSelectedUsers([]) // 重置选择

      if (data.errorUsers.length === 0) {
        alert('🎉 恭喜！没有发现积分计算错误')
      } else {
        alert(`发现 ${data.errorUsers.length} 个用户存在积分错误，请检查并选择需要修复的用户`)
      }

    } catch (error) {
      console.error('分析积分错误失败:', error)
      alert('分析失败: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // 选择/取消选择用户
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  // 全选/全不选
  const toggleAllSelection = () => {
    if (selectedUsers.length === errorUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(errorUsers.map(u => u.user.id))
    }
  }

  // 修复选定用户
  const fixSelectedUsers = async () => {
    if (selectedUsers.length === 0) {
      alert('请选择要修复的用户')
      return
    }

    const confirmed = confirm(`确认修复选定的 ${selectedUsers.length} 个用户的积分？\n\n⚠️ 注意：这将删除现有积分记录并重新计算，此操作不可撤销！`)
    
    if (!confirmed) return

    setFixing(true)
    try {
      console.log('[Admin] 开始修复积分:', selectedUsers)
      
      const response = await fetch('/api/admin/fix-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'fix-selected',
          userIds: selectedUsers 
        })
      })

      if (!response.ok) {
        throw new Error(`修复失败: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Admin] 修复结果:', data)
      
      alert(`修复完成！\n成功: ${data.summary.success} 个用户\n失败: ${data.summary.errors} 个用户`)
      
      // 重新分析以更新列表
      if (data.summary.success > 0) {
        await analyzeScoreErrors()
      }

    } catch (error) {
      console.error('修复积分失败:', error)
      alert('修复失败: ' + error.message)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">积分修复工具</h2>
      
      {/* 操作控制 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">积分错误检测与修复</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-4">
            <button
              onClick={analyzeScoreErrors}
              disabled={analyzing}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing ? '分析中...' : '🔍 分析积分错误'}
            </button>
            
            {errorUsers.length > 0 && (
              <button
                onClick={fixSelectedUsers}
                disabled={fixing || selectedUsers.length === 0}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {fixing ? '修复中...' : `🔧 修复选定用户 (${selectedUsers.length})`}
              </button>
            )}
          </div>
          
          {analysisResult && (
            <div className="text-sm text-gray-600">
              共 {analysisResult.total} 用户，发现 {analysisResult.errors} 个错误用户
            </div>
          )}
        </div>

        {/* 分析结果 */}
        {errorUsers.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">
                发现 {errorUsers.length} 个用户存在积分计算错误
              </h4>
              <button
                onClick={toggleAllSelection}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedUsers.length === errorUsers.length ? '全不选' : '全选'}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {errorUsers.map(errorUser => (
                <div key={errorUser.user.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(errorUser.user.id)}
                        onChange={() => toggleUserSelection(errorUser.user.id)}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{errorUser.user.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {errorUser.user.branch_code} | {errorUser.totalErrors} 个错误
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      记录: {errorUser.totalRecords} | 积分: {errorUser.totalScores}
                    </div>
                  </div>

                  {/* 错误详情 */}
                  <div className="ml-6 text-xs text-gray-600 space-y-1">
                    {errorUser.errors.slice(0, 3).map((error, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-red-500">•</span>
                        <span>{error.date}: {error.description}</span>
                        {error.type === 'calculation_error' && (
                          <span className="text-gray-500">
                            (当前: {error.current.total} → 应为: {error.expected.total})
                          </span>
                        )}
                      </div>
                    ))}
                    {errorUser.errors.length > 3 && (
                      <div className="text-gray-500">
                        还有 {errorUser.errors.length - 3} 个错误...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ 使用说明</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. 点击"分析积分错误"检测所有用户的积分计算是否正确</li>
            <li>2. 仔细检查发现的错误用户，确认需要修复的用户</li>
            <li>3. 选择要修复的用户，点击"修复选定用户"</li>
            <li>4. <strong>修复操作会删除现有积分记录并重新计算，不可撤销！</strong></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// 里程碑配置面板
function MilestoneConfigPanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">里程碑配置</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">当前里程碑配置</h3>
        <div className="space-y-3">
          {[
            { days: 3, score: 2, name: '坚持三天' },
            { days: 5, score: 3, name: '持续五天' },
            { days: 10, score: 5, name: '稳定十天' },
            { days: 15, score: 8, name: '半月坚持' },
            { days: 21, score: 12, name: '三周习惯' }
          ].map(milestone => (
            <div key={milestone.days} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="font-medium">{milestone.name}</span>
                <span className="text-sm text-gray-600 ml-2">({milestone.days}天)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600 font-medium">{milestone.score}分</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          添加新里程碑
        </button>
      </div>
    </div>
  )
}

// 修复工具面板
function RepairToolsPanel() {
  const [repairLog, setRepairLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const runRepairTool = async () => {
    setIsRunning(true)
    try {
      // 运行修复工具
      const response = await fetch('/admin-score-repair.js')
      const result = await response.text()
      setRepairLog(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'repair',
        message: '积分修复工具执行完成',
        details: result
      }])
    } catch (error) {
      setRepairLog(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'error',
        message: '修复工具执行失败',
        details: error.message
      }])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">修复工具</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">积分修复工具</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            检测并自动修复积分系统中的常见问题：缺失积分、重复记录、连续天数异常、遗漏奖励等
          </p>
          
          <button
            onClick={runRepairTool}
            disabled={isRunning}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isRunning ? '运行中...' : '🛠️ 运行修复工具'}
          </button>
          
          {repairLog.length > 0 && (
            <div className="mt-6 border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">执行日志</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {repairLog.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    log.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'
                  }`}>
                    <div className="font-medium">[{new Date(log.timestamp).toLocaleString()}] {log.message}</div>
                    {log.details && <div className="mt-1 opacity-75">{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 统计卡片组件
function StatCard({ title, value, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600'
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color]} p-3 rounded-lg`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

// 快速操作组件
function QuickAction({ title, description, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
    >
      <div className="flex items-center mb-2">
        <span className="text-xl mr-2">{icon}</span>
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  )
}

// Admin登录表单组件
function AdminLoginForm({ setIsLoggedIn }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: credentials.username, password: credentials.password })
      })
      if (!r.ok) {
        setError('用户名或密码错误')
        setIsLoading(false)
        return
      }
      setIsLoggedIn(true)
    } catch (error) {
      setError('登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>管理员登录 - LEARNER CLUB</title>
      </Head>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">🛡️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LEARNER CLUB
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            管理员登录
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="用户名"
                value={credentials.username}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={credentials.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              ❌ {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  登录中...
                </>
              ) : (
                '登录管理面板'
              )}
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>🔐 安全提示：请使用授权的管理员账户登录</p>
          </div>
        </form>
      </div>
    </div>
  )
}

// 用户积分详情弹窗
function UserScoreModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.username || '未知用户'} - 积分详情
              </h2>
              <p className="text-sm text-gray-600">{user.user?.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {user.analysis?.totalScore || 0}
              </div>
              <div className="text-sm text-gray-600">总积分</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {user.analysis?.totalDays || 0}
              </div>
              <div className="text-sm text-gray-600">活跃天数</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {user.analysis?.maxStreak || 0}
              </div>
              <div className="text-sm text-gray-600">最长连续</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {user.analysis?.totalBonus || 0}
              </div>
              <div className="text-sm text-gray-600">奖励积分</div>
            </div>
          </div>

          {/* 积分历史 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">积分历史（最近30天）</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      总分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      基础分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      连续分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      奖励分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      连续天数
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {user.scores?.slice(0, 10).map((score, index) => (
                    <tr key={index} className={score.bonus_score > 0 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.ymd}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {score.total_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {score.base_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {score.streak_score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {score.bonus_score || 0}
                        {score.bonus_score > 0 && score.bonus_details && (
                          <div className="text-xs text-gray-500">
                            {score.bonus_details.map(b => b.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {score.current_streak}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 分院管理面板 - 选择分院查看和修改用户
function BranchManagementPanel() {
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [branchUsers, setBranchUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [newBranchForUser, setNewBranchForUser] = useState('')

  // 加载分院列表
  const loadBranches = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users?action=branches')
      if (!response.ok) throw new Error('获取分院列表失败')
      
      const data = await response.json()
      setBranches(data.branches || [])
      
    } catch (error) {
      console.error('加载分院失败:', error)
      alert('加载分院失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 加载指定分院的用户
  const loadBranchUsers = async (branchCode) => {
    if (!branchCode) return
    
    setUsersLoading(true)
    try {
      const branchParam = branchCode === 'null' ? '' : branchCode
      const response = await fetch(`/api/admin/users?action=list&branch=${branchParam}&limit=100`)
      
      if (!response.ok) throw new Error('获取分院用户失败')
      
      const data = await response.json()
      setBranchUsers(data.users || [])
      
    } catch (error) {
      console.error('加载分院用户失败:', error)
      alert('加载分院用户失败: ' + error.message)
    } finally {
      setUsersLoading(false)
    }
  }

  // 修改用户的分院
  const changeUserBranch = async (userId, userName, currentBranch, newBranchCode) => {
    if (!newBranchCode || newBranchCode === currentBranch) return

    const newBranchName = branches.find(b => b.code === newBranchCode)?.name || newBranchCode

    if (!confirm(`确定要将用户 "${userName}" 从 "${currentBranch}" 转移到 "${newBranchName}" 吗？`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'change-branch',
          userId: userId,
          newBranch: newBranchCode
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '修改用户分院失败')
      }
      
      alert(`✅ 用户 "${userName}" 已转移到 "${newBranchName}"`)
      setEditingUserId(null)
      setNewBranchForUser('')
      // 重新加载当前分院的用户列表
      loadBranchUsers(selectedBranch)
      
    } catch (error) {
      console.error('修改用户分院失败:', error)
      alert('修改用户分院失败: ' + error.message)
    }
  }

  // 处理分院选择变化
  const handleBranchChange = async (branchCode) => {
    setSelectedBranch(branchCode)
    setBranchUsers([])
    setEditingUserId(null)
    
    if (branchCode) {
      await loadBranchUsers(branchCode)
    }
  }

  // 更新分院信息
  const updateBranch = async (branchId) => {
    if (!editingBranch.name.trim()) {
      alert('请填写分院名称')
      return
    }

    try {
      const response = await fetch('/api/pwa/data?action=update-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branchId,
          name: editingBranch.name.trim(),
          description: editingBranch.description.trim()
        })
      })
      
      if (!response.ok) throw new Error('更新分院失败')
      
      alert('✅ 分院信息已更新')
      setEditingBranch(null)
      loadBranches()
      
    } catch (error) {
      console.error('更新分院失败:', error)
      alert('更新分院失败: ' + error.message)
    }
  }

  // 删除分院
  const deleteBranch = async (branchId, branchName) => {
    if (!confirm(`⚠️ 确定要删除分院 "${branchName}" 吗？\n\n注意：如果有用户属于该分院，删除操作会失败。`)) {
      return
    }

    try {
      const response = await fetch('/api/pwa/data?action=delete-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: branchId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '删除分院失败')
      }
      
      alert(`✅ 分院 "${branchName}" 已删除`)
      loadBranches()
      
    } catch (error) {
      console.error('删除分院失败:', error)
      alert('删除分院失败: ' + error.message)
    }
  }

  useEffect(() => {
    loadBranches()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">分院管理</h2>
        <div className="text-sm text-gray-500">
          选择分院查看用户，然后可以修改用户的分院归属
        </div>
      </div>

      {/* 分院选择器 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">选择分院：</label>
          <select
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- 请选择分院 --</option>
            {branches.map((branch) => (
              <option key={branch.code} value={branch.code}>
                {branch.name || branch.code} ({branch.code})
              </option>
            ))}
          </select>
          {loading && <div className="text-gray-500">加载分院中...</div>}
        </div>
      </div>

      {/* 分院用户列表 */}
      {selectedBranch && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {branches.find(b => b.code === selectedBranch)?.name || selectedBranch} - 用户列表
            </h3>
          </div>
          
          {usersLoading ? (
            <div className="p-6 text-center text-gray-500">
              加载用户中...
            </div>
          ) : branchUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              该分院暂无用户
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前分院</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branchUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.telegram_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.branch_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newBranchForUser}
                              onChange={(e) => setNewBranchForUser(e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">选择新分院</option>
                              {branches.filter(b => b.code !== user.branch_code).map((branch) => (
                                <option key={branch.code} value={branch.code}>
                                  {branch.name || branch.code}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => changeUserBranch(user.id, user.name, user.branch_code, newBranchForUser)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => {
                                setEditingUserId(null)
                                setNewBranchForUser('')
                              }}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingUserId(user.id)
                              setNewBranchForUser('')
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            修改分院
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">📋 分院管理说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>选择分院</strong>：从下拉菜单选择要管理的分院</li>
          <li>• <strong>查看用户</strong>：显示该分院下的所有用户信息</li>
          <li>• <strong>修改分院</strong>：点击"修改分院"可以将用户转移到其他分院</li>
          <li>• <strong>确认操作</strong>：修改前会弹出确认对话框，确保操作正确</li>
        </ul>
      </div>
    </div>
  )
}

// 分院统计面板 - 显示各分院登录用户情况
function BranchStatsPanel() {
  const [branchStats, setBranchStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  // 分院信息配置
  const { BRANCHES, branchConfigFor } = require('../lib/branches.js')
  const branchConfig = Object.fromEntries(BRANCHES.map((b, i) => [b, branchConfigFor(b, i)]))
  branchConfig['未分配'] = { name: '未分配', color: '#6B7280', icon: '❓' }

  // 加载分院统计数据
  const loadBranchStats = async () => {
    setLoading(true)
    try {
      // 使用现有的用户API获取分院数据
      const response = await fetch('/api/admin/users?action=branches')
      if (!response.ok) throw new Error('获取分院数据失败')
      
      const data = await response.json()
      setBranchStats(data.branches || [])
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
    } catch (error) {
      console.error('加载分院统计失败:', error)
      if (error.message && error.message.includes('403')) {
        alert('权限不足，请先在 管理页 登录')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranchStats()
    // 每30秒自动刷新
    const interval = setInterval(loadBranchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalUsers = branchStats.reduce((sum, branch) => 
    branch.code !== 'all' ? sum + branch.userCount : sum, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">分院统计</h2>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              最后更新: {lastUpdate}
            </span>
          )}
          <button
            onClick={loadBranchStats}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div>
              <p className="text-blue-100">总登录用户</p>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                👥
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div>
              <p className="text-green-100">活跃分院</p>
              <p className="text-3xl font-bold">{branchStats.filter(b => b.code !== 'all' && b.userCount > 0).length}</p>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                🏢
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div>
              <p className="text-purple-100">最大分院</p>
              <p className="text-3xl font-bold">
                {Math.max(...branchStats.filter(b => b.code !== 'all').map(b => b.userCount), 0)}
              </p>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center">
                👑
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div>
              <p className="text-orange-100">平均用户数</p>
              <p className="text-3xl font-bold">
                {Math.round(totalUsers / Math.max(branchStats.filter(b => b.code !== 'all' && b.userCount > 0).length, 1))}
              </p>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                📊
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分院详细统计 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">各分院登录情况</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {branchStats
                .filter(branch => branch.code !== 'all')
                .sort((a, b) => b.userCount - a.userCount)
                .map((branch) => {
                  const config = branchConfig[branch.code] || branchConfig['未分配']
                  const maxUsers = Math.max(...branchStats.filter(b => b.code !== 'all').map(b => b.userCount), 1)
                  const percentage = Math.round((branch.userCount / totalUsers) * 100)
                  
                  return (
                    <div key={branch.code} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{config.name}</h4>
                            <p className="text-sm text-gray-500">代码: {branch.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: config.color }}>
                            {branch.userCount}
                          </div>
                          <div className="text-sm text-gray-500">{percentage}%</div>
                        </div>
                      </div>
                      
                      {/* 进度条 */}
                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>用户数量</span>
                          <span>{branch.userCount} / {totalUsers}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${(branch.userCount / maxUsers) * 100}%`,
                              backgroundColor: config.color
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">📋 分院统计说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>实时统计</strong>：显示各分院已登录PWA-Google系统的用户数量</li>
          <li>• <strong>自动刷新</strong>：数据每30秒自动更新，也可手动刷新</li>
          <li>• <strong>排序显示</strong>：按用户数量从多到少排列</li>
          <li>• <strong>百分比</strong>：显示各分院用户占总用户的比例</li>
          <li>• <strong>进度条</strong>：可视化显示各分院的用户数量对比</li>
        </ul>
      </div>
    </div>
  )
}
