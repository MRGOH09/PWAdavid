import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ModernCard from '../components/ModernCard'
import { SmoothTransition, PageSkeleton } from '../components/SmoothTransition'
import WebAppWrapper from '../components/WebAppWrapper'
import BrandHeader, { PageHeader } from '../components/BrandHeader'
import PWAClient from '../lib/api'
import QuickActions from '../components/QuickActions'

export default function LeaderboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'branch' | 'myscore'
  const [leaderboardData, setLeaderboardData] = useState({
    allUsers: [],
    branchUsers: [],
    branchRankings: [],
    userBranch: null,
    userRank: null,  // 添加用户排名
    currentUserId: null,  // 添加当前用户ID
    timeframe: null,
    loading: true
  })
  const [scoreData, setScoreData] = useState({
    dailyScores: [],
    summary: {},
    loading: true
  })

  useEffect(() => {
    loadLeaderboardData()
    if (activeTab === 'myscore') {
      loadScoreData()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'myscore' && scoreData.loading) {
      loadScoreData()
    }
  }, [activeTab])

  const loadLeaderboardData = async () => {
    try {
      setLeaderboardData(prev => ({ ...prev, loading: true }))

      // 使用PWA Client获取排行榜数据
      const result = await PWAClient.getLeaderboard()

      console.log('[leaderboard] PWA Client返回数据:', result)

      if (result.ok) {
        setLeaderboardData({
          allUsers: result.data.allUsers || [],
          branchUsers: result.data.branchUsers || [],
          branchRankings: result.data.branchRankings || [],
          userBranch: result.data.userBranch || null,
          userRank: result.data.userRank || null,  // 添加用户排名
          currentUserId: result.data.currentUserId || null,  // 添加当前用户ID
          timeframe: result.data.timeframe || null,
          loading: false
        })
      } else {
        throw new Error(result.error || '获取排行榜失败')
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
      setLeaderboardData(prev => ({ ...prev, loading: false }))
    }
  }

  const loadScoreData = async () => {
    try {
      setScoreData(prev => ({ ...prev, loading: true }))

      // 使用PWA Client统一API
      const result = await PWAClient.getScores()

      if (result.ok) {
        setScoreData({
          dailyScores: result.data.dailyScores || [],
          summary: result.data.summary || {},
          loading: false
        })
      } else {
        throw new Error(result.error || '获取积分数据失败')
      }
    } catch (error) {
      console.error('加载积分数据失败:', error)
      setScoreData(prev => ({ ...prev, loading: false }))
    }
  }

  const BranchRankingCard = ({ title, branches, userBranch, userRank }) => (
    <ModernCard className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🏢</span>
        {title}
      </h3>
      
      {branches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>暂无分院排行数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch, index) => {
            const isMyBranch = branch.branch_code === userBranch
            
            return (
              <div
                key={branch.branch_code}
                className={`flex items-center p-4 rounded-xl transition-all ${
                  isMyBranch 
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-400 shadow-lg ring-2 ring-blue-300 ring-opacity-50 transform scale-[1.02]' 
                    : index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' 
                    : index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200' 
                    : index === 2 ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200' 
                    : 'bg-gray-50'
                }`}
              >
              {/* 排名 */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-4">
                {index === 0 && <span className="text-xl">🥇</span>}
                {index === 1 && <span className="text-xl">🥈</span>}
                {index === 2 && <span className="text-xl">🥉</span>}
                {index > 2 && (
                  <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                )}
              </div>

              {/* 分院信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">
                        {branch.branch_name}分院
                      </p>
                      {isMyBranch && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white animate-pulse">
                          ✨ 我的分院
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {branch.active_members}/{branch.total_members} 人参与
                    </p>
                    {isMyBranch && userRank && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        👤 你的排名: 分院内第{userRank.inBranch}名 | 全国第{userRank.overall}名
                      </p>
                    )}
                  </div>
                  
                  {/* 积分信息 */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      平均{branch.avg_score}分
                    </div>
                    <div className="text-xs text-gray-500">
                      总分{branch.total_score}分
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </ModernCard>
  )

  const LeaderboardCard = ({ title, users, showBranch = true, currentUserId }) => (
    <ModernCard className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🏆</span>
        {title}
      </h3>
      
      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>暂无排行数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, index) => {
            const isCurrentUser = user.user_id === currentUserId
            
            return (
              <div
                key={user.user_id}
                className={`flex items-center p-4 rounded-xl transition-all relative ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-400 shadow-xl ring-2 ring-blue-300 ring-opacity-50 transform scale-[1.03]' 
                    : index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' 
                    : index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200' 
                    : index === 2 ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200' 
                    : 'bg-gray-50'
                }`}
              >
              {/* 排名 */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-4">
                {index === 0 && <span className="text-xl">🥇</span>}
                {index === 1 && <span className="text-xl">🥈</span>}
                {index === 2 && <span className="text-xl">🥉</span>}
                {index > 2 && (
                  <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                )}
              </div>

              {/* 添加"你"的标识 */}
              {isCurrentUser && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg">
                  👉 你在这里
                </div>
              )}
              
              {/* 用户信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">
                        {user.display_name || user.name || '匿名用户'}
                      </p>
                      {isCurrentUser && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                          YOU
                        </span>
                      )}
                    </div>
                    {showBranch && user.branch_name && (
                      <p className="text-sm text-gray-500">
                        {user.branch_name}
                      </p>
                    )}
                  </div>
                  
                  {/* 积分信息 */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {user.total_score || 0}分
                    </div>
                    <div className="text-xs text-gray-500">
                      连续{user.current_streak || 0}天
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </ModernCard>
  )

  const ScoreCard = ({ score }) => {
    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (dateStr === today.toISOString().split('T')[0]) {
        return '今天'
      } else if (dateStr === yesterday.toISOString().split('T')[0]) {
        return '昨天'
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`
      }
    }

    const getRecordTypeIcon = (recordType) => {
      return recordType === 'checkin' ? '✅' : '💰'
    }

    const getRecordTypeText = (recordType) => {
      return recordType === 'checkin' ? '每日打卡' : '开销记录'
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <span className="text-lg mr-2">{getRecordTypeIcon(score.record_type)}</span>
            <div>
              <h3 className="font-medium text-gray-900">{formatDate(score.ymd)}</h3>
              <p className="text-sm text-gray-500">{getRecordTypeText(score.record_type)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{score.total_score}分</div>
            <div className="text-xs text-gray-500">连续{score.current_streak}天</div>
          </div>
        </div>

        {/* 积分明细 */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xs text-green-600 mb-1">基础分</div>
            <div className="font-medium text-green-700">{score.base_score}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-xs text-blue-600 mb-1">连续分</div>
            <div className="font-medium text-blue-700">{score.streak_score}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <div className="text-xs text-orange-600 mb-1">奖励分</div>
            <div className="font-medium text-orange-700">{score.bonus_score}</div>
          </div>
        </div>

        {/* 里程碑成就 */}
        {score.bonus_details && score.bonus_details.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">🎉 成就：</span>
              <div className="flex flex-wrap gap-1">
                {score.bonus_details.map((bonus, index) => (
                  <span
                    key={index}
                    className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                  >
                    {bonus.name} +{bonus.score}分
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (leaderboardData.loading) {
    return (
      <Layout title="排行榜 - Learner Club">
        <PageSkeleton type="leaderboard" />
      </Layout>
    )
  }

  return (
    <WebAppWrapper>
      <Layout title="排行榜 - Learner Club">
        <BrandHeader />
        
        <SmoothTransition>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            
            <PageHeader
              title={
                <>
                  <span>🏆</span>
                  <span>LEARNER排行榜</span>
                </>
              }
              subtitle="比拼理财实力 · 激发成长动力"
              onBack={() => router.back()}
            />

            <div className="px-4 pb-8 space-y-6">
              
              {/* 切换标签 */}
              <div className="-mt-16 relative z-10">
                <ModernCard className="p-6">
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 py-2 px-2 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'all'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      🌟 全国分院
                    </button>
                    <button
                      onClick={() => setActiveTab('branch')}
                      className={`flex-1 py-2 px-2 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'branch'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      🏢 我的分院
                    </button>
                    <button
                      onClick={() => setActiveTab('myscore')}
                      className={`flex-1 py-2 px-2 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'myscore'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      ⭐ 我的积分
                    </button>
                  </div>
                </ModernCard>
              </div>

              {/* 内容区域 */}
              {activeTab === 'all' && (
                <BranchRankingCard 
                  title="全国分院排行榜" 
                  branches={leaderboardData.branchRankings}
                  userBranch={leaderboardData.userBranch}
                  userRank={leaderboardData.userRank} 
                />
              )}

              {activeTab === 'branch' && (
                <>
                  {leaderboardData.userBranch ? (
                    <LeaderboardCard 
                      title={`${leaderboardData.userBranch}分院排行`} 
                      users={leaderboardData.branchUsers} 
                      showBranch={false}
                      currentUserId={leaderboardData.currentUserId}
                    />
                  ) : (
                    <ModernCard className="p-8 text-center">
                      <div className="text-6xl mb-4">🏢</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">您还未设置分院</h3>
                      <p className="text-gray-600 mb-6">请先在个人资料中设置分院信息</p>
                      <button
                        onClick={() => router.push('/profile')}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                      >
                        前往设置
                      </button>
                    </ModernCard>
                  )}
                </>
              )}

              {activeTab === 'myscore' && (
                <>
                  {/* 积分概览 */}
                  <ModernCard className="bg-gradient-to-br from-primary to-blue-600 p-6 text-white">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">{scoreData.summary.totalScore || 0}</div>
                        <div className="text-sm opacity-90">历史总分</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">{scoreData.summary.currentStreak || 0}</div>
                        <div className="text-sm opacity-90">连续天数</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
                      <div className="text-center">
                        <div className="text-xl font-semibold mb-1">{scoreData.summary.thisMonthScore || 0}</div>
                        <div className="text-xs opacity-90">本月积分</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold mb-1">{scoreData.summary.todayScore || 0}</div>
                        <div className="text-xs opacity-90">今日积分</div>
                      </div>
                    </div>
                  </ModernCard>

                  {/* 每日积分记录 */}
                  <ModernCard className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📅</span>
                      每日积分记录
                    </h2>
                    
                    {scoreData.loading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">加载中...</p>
                      </div>
                    ) : scoreData.dailyScores.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-gray-500 mb-2">还没有积分记录</p>
                        <p className="text-sm text-gray-400">开始记录或打卡来获得积分吧！</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {scoreData.dailyScores.map((score, index) => (
                          <ScoreCard key={`${score.user_id}-${score.ymd}`} score={score} />
                        ))}
                      </div>
                    )}
                  </ModernCard>
                </>
              )}

              {/* 说明文字 */}
              <ModernCard className="bg-blue-50 p-4">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-2">📋 积分规则详解：</p>
                    <div className="space-y-1 mb-3">
                      <p>• <strong>基础分</strong>：每次记录开销获得 1分</p>
                      <p>• <strong>连续分</strong>：连续记录获得 1分（中断重新计算）</p>
                      <p>• <strong>每日总分</strong>：基础分 + 连续分 + 里程碑奖励分</p>
                    </div>
                    <p className="font-medium mb-1">🏆 里程碑奖励：</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <p>• 3天: +2分</p>
                      <p>• 5天: +3分</p>
                      <p>• 10天: +5分</p>
                      <p>• 15天: +8分</p>
                      <p>• 21天: +12分</p>
                      <p>• 31天: +20分</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 italic">
                      * 排行榜每日2点更新，基于当天积分统计
                    </p>
                  </div>
                </div>
              </ModernCard>

            </div>
          </div>
        </SmoothTransition>
        
        {/* 快速操作按钮 */}
        <QuickActions />
      </Layout>
    </WebAppWrapper>
  )
}