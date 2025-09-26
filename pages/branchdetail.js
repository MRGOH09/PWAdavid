import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { SmoothTransition } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'

// 分院列表
const BRANCHES = [
  'PJY', 'BLS', 'OTK', 'PU', 'UKT', 'TLK', 'M2', 'BP', 
  'MTK', 'HQ', 'VIVA', 'STL', 'SRD', 'PDMR', 'KK', '小天使'
]

export default function BranchDetailPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  const [selectedBranch, setSelectedBranch] = useState('ALL')
  const [branchData, setBranchData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 排序和过滤状态
  const [sortField, setSortField] = useState('total_score')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')

  // 验证登录
  const handleLogin = (e) => {
    e.preventDefault()
    if (username === 'PIC' && password === 'Abcd1234') {
      setIsAuthenticated(true)
      setAuthError('')
      localStorage.setItem('branchDetailAuth', 'true')
      localStorage.setItem('branchDetailAuthTime', Date.now())
    } else {
      setAuthError('用户名或密码错误')
    }
  }

  // 检查认证状态
  useEffect(() => {
    const auth = localStorage.getItem('branchDetailAuth')
    const authTime = localStorage.getItem('branchDetailAuthTime')
    
    // 认证有效期24小时
    if (auth === 'true' && authTime) {
      const elapsed = Date.now() - parseInt(authTime)
      if (elapsed < 24 * 60 * 60 * 1000) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('branchDetailAuth')
        localStorage.removeItem('branchDetailAuthTime')
      }
    }
  }, [])

  // 获取分院数据
  const fetchBranchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 需要获取token进行认证
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      
      // 如果没有session，尝试匿名访问（依赖服务端的authKey验证）
      const headers = {
        'Content-Type': 'application/json',
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'branch-detail',
          branch: selectedBranch,
          authKey: 'PIC_Abcd1234'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取数据失败')
      }
      
      const data = await response.json()
      console.log('[branchdetail] 获取到数据:', data)
      setBranchData(data.users || [])
    } catch (err) {
      console.error('[branchdetail] 错误:', err)
      setError(err.message)
      setBranchData([])
    } finally {
      setLoading(false)
    }
  }

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranchData()
    }
  }, [selectedBranch, isAuthenticated])

  // 处理排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // 过滤和排序数据
  const processedData = branchData
    .filter(user => {
      if (searchTerm) {
        return user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               user.telegram_id?.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })
    .sort((a, b) => {
      let aVal = a[sortField] || 0
      let bVal = b[sortField] || 0
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  // 登录界面
  if (!isAuthenticated) {
    return (
      <WebAppWrapper>
        <Layout title="分院详情 - Learner Club">
          <BrandHeader />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
            <ModernCard className="w-full max-w-md p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🔐 分院数据查看</h2>
                <p className="text-gray-600">请输入管理员账号</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入用户名"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入密码"
                    required
                  />
                </div>
                
                {authError && (
                  <div className="text-red-500 text-sm text-center">
                    {authError}
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  登录
                </button>
              </form>
            </ModernCard>
          </div>
        </Layout>
      </WebAppWrapper>
    )
  }

  // 主界面
  return (
    <WebAppWrapper>
      <Layout title="分院详情 - Learner Club">
        <BrandHeader />
        
        <SmoothTransition>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            
            <PageHeader
              title={
                <>
                  <span>📊</span>
                  <span>分院详细数据</span>
                </>
              }
              subtitle="查看各分院成员详细信息"
              onBack={() => router.back()}
              rightButton={
                <button
                  onClick={() => {
                    localStorage.removeItem('branchDetailAuth')
                    localStorage.removeItem('branchDetailAuthTime')
                    setIsAuthenticated(false)
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  退出
                </button>
              }
            />

            <div className="px-4 pb-8">
              
              {/* 分院选择器 */}
              <div className="-mt-12 relative z-10 mb-6">
                <ModernCard className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        选择分院
                      </label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">全部分院</option>
                        {BRANCHES.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        搜索用户
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="输入姓名或Telegram ID"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={fetchBranchData}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {loading ? '加载中...' : '刷新数据'}
                      </button>
                    </div>
                  </div>
                </ModernCard>
              </div>

              {/* 统计信息 */}
              {!loading && processedData.length > 0 && (
                <ModernCard className="p-4 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">总人数</p>
                      <p className="text-2xl font-bold text-gray-900">{processedData.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">总积分</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {processedData.reduce((sum, user) => sum + (user.total_score || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">平均积分</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round(processedData.reduce((sum, user) => sum + (user.total_score || 0), 0) / processedData.length)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">活跃用户</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {processedData.filter(user => user.total_records > 0).length}
                      </p>
                    </div>
                  </div>
                </ModernCard>
              )}

              {/* 数据表格 */}
              <ModernCard className="overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载数据中...</p>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                      onClick={fetchBranchData}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      重试
                    </button>
                  </div>
                ) : processedData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>暂无数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('name')}
                          >
                            姓名 {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('branch_code')}
                          >
                            分院 {sortField === 'branch_code' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_score')}
                          >
                            总积分 {sortField === 'total_score' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('current_streak')}
                          >
                            连续天数 {sortField === 'current_streak' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_records')}
                          >
                            记录数 {sortField === 'total_records' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('last_record_date')}
                          >
                            最后记录 {sortField === 'last_record_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Telegram ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processedData.map((user, index) => (
                          <tr key={user.user_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.display_name || user.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {user.branch_code || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-600">
                                {user.total_score || 0}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {user.current_streak || 0} 天
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {user.total_records || 0}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {user.last_record_date || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs text-gray-500 font-mono">
                                {user.telegram_id || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ModernCard>

            </div>
          </div>
        </SmoothTransition>
      </Layout>
    </WebAppWrapper>
  )
}