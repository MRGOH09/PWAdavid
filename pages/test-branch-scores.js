import { useState } from 'react'
import Head from 'next/head'

export default function TestBranchScores() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  const clearLogs = () => {
    setLogs([])
  }

  // 测试分院积分计算
  const testBranchScores = async () => {
    addLog('🏢 测试分院积分计算...', 'info')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/pwa/test-branch-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      const result = await response.json()
      
      addLog(`响应状态: ${response.status}`, response.ok ? 'success' : 'error')
      
      if (result.debug) {
        addLog('=== 调试信息 ===', 'info')
        
        // 显示用户历史积分数据
        if (result.debug.userScores) {
          addLog(`用户历史积分汇总: ${result.debug.userScores.length} 个用户`, 'info')
          result.debug.userScores.slice(0, 5).forEach(user => {
            addLog(`  - 用户${user.user_id.slice(-6)}: ${user.total_score}分 (分院: ${user.users?.branch_code || '无'})`, 'info')
          })
        }
        
        // 显示分院统计
        if (result.debug.branchStats) {
          addLog(`分院统计:`, 'info')
          Object.entries(result.debug.branchStats).forEach(([branchCode, stats]) => {
            addLog(`  - ${branchCode}: 总人数${stats.total_members}, 总积分${stats.total_score}, 平均${stats.avg_score}分`, 'info')
          })
        }
        
        // 显示原始数据
        if (result.debug.allScores) {
          addLog(`原始积分记录: ${result.debug.allScores.length} 条`, 'info')
        }
        
        if (result.debug.allBranchUsers) {
          addLog(`分院用户: ${result.debug.allBranchUsers.length} 人`, 'info')
        }
      }
      
      addLog(`完整响应: ${JSON.stringify(result, null, 2)}`, 'info')
      
    } catch (error) {
      addLog(`❌ 测试失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 测试排行榜API
  const testLeaderboardAPI = async () => {
    addLog('📊 测试排行榜API...', 'info')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/pwa/leaderboard', {
        credentials: 'include'
      })

      const result = await response.json()
      
      addLog(`排行榜响应状态: ${response.status}`, response.ok ? 'success' : 'error')
      
      if (result.ok && result.data) {
        addLog(`全部用户: ${result.data.allUsers.length} 人`, 'success')
        addLog(`分院排行: ${result.data.branchRankings.length} 个分院`, 'success')
        
        // 显示前几名用户
        result.data.allUsers.slice(0, 3).forEach((user, index) => {
          addLog(`  ${index + 1}. ${user.display_name || user.name} (${user.branch_name}): ${user.total_score}分`, 'success')
        })
        
        // 显示分院排行
        result.data.branchRankings.slice(0, 3).forEach((branch, index) => {
          addLog(`  ${index + 1}. ${branch.branch_code}: 平均${branch.avg_score}分 (总分${branch.total_score}/总人数${branch.total_members})`, 'success')
        })
        
        addLog(`用户分院: ${result.data.userBranch}`, 'info')
      } else {
        addLog(`❌ 排行榜API失败: ${result.error}`, 'error')
      }
      
    } catch (error) {
      addLog(`❌ 排行榜测试失败: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>分院积分计算测试</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 标题 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">🏢 分院积分计算测试</h1>
            <p className="text-gray-600">调试分院排行榜积分计算逻辑</p>
          </div>

          {/* 控制面板 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🎮 测试控制面板</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={testBranchScores}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? '测试中...' : '🏢 测试分院积分'}
              </button>
              
              <button 
                onClick={testLeaderboardAPI}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? '测试中...' : '📊 测试排行榜API'}
              </button>
              
              <button 
                onClick={clearLogs}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🗑️ 清空日志
              </button>
            </div>
          </div>

          {/* 日志显示 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">📋 调试日志 ({logs.length}条)</h2>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待测试操作...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-2">
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

          {/* 使用说明 */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <h3 className="font-semibold mb-2">📝 测试说明</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>点击"测试分院积分"查看详细计算过程</li>
              <li>点击"测试排行榜API"查看最终排行榜结果</li>
              <li>对比两个结果找出问题所在</li>
              <li>查看调试日志了解数据流转过程</li>
            </ol>
          </div>
          
        </div>
      </div>
    </>
  )
}