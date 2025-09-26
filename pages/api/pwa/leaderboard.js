import { createClient } from '@supabase/supabase-js'
import { validateJWTToken } from '../../../lib/auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // JWT Token验证 - 与现有PWA API保持一致
    const user = await validateJWTToken(req)
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const userId = user.id
    const userBranch = user.branch_code // 直接从认证用户获取分院信息

    console.log(`[leaderboard] 用户 ${userId} 分院: ${userBranch}`)

    // 1. 获取今日日期
    const today = new Date().toISOString().split('T')[0]

    // 2. 获取全部用户历史总积分排行（完整排行榜） - 修复JOIN问题
    // 分别查询，然后合并数据（避免表关系问题）
    const { data: allScores, error: allError } = await supabase
      .from('user_daily_scores')
      .select('*')
    
    if (allError) {
      console.error('获取积分记录失败:', allError)
      return res.status(500).json({ ok: false, error: '获取积分记录失败' })
    }
    
    // 获取相关用户信息
    const userIds = [...new Set(allScores?.map(s => s.user_id) || [])]
    
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, branch_code')
      .in('id', userIds)
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profile')
      .select('user_id, display_name, max_streak, current_streak')
      .in('user_id', userIds)
    
    // 合并数据
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])
    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || [])
    
    const mergedScores = allScores?.map(score => ({
      ...score,
      users: usersMap.get(score.user_id),
      user_profile: profilesMap.get(score.user_id)
    })) || []
    
    // 按用户汇总总积分，并获取当前连续天数
    const userTotalScores = new Map()
    
    if (mergedScores) {
      mergedScores.forEach(score => {
        const userId = score.user_id
        
        if (!userTotalScores.has(userId)) {
          userTotalScores.set(userId, {
            user_id: userId,
            total_score: 0,
            current_streak: 0, // 改为当前连续天数
            latest_record_date: null,
            users: score.users,
            user_profile: score.user_profile
          })
        }
        
        const userTotal = userTotalScores.get(userId)
        userTotal.total_score += score.total_score || 0
        
        // 🔧 修复：获取最新记录的连续天数（而不是最大值）
        if (!userTotal.latest_record_date || score.ymd > userTotal.latest_record_date) {
          userTotal.latest_record_date = score.ymd
          userTotal.current_streak = score.current_streak || 0
        }
        
        console.log(`[leaderboard] 用户 ${userId} 记录日期: ${score.ymd}, 连续天数: ${score.current_streak}`)
      })
    }
    
    // 转换为数组并排序
    const allUsersScores = Array.from(userTotalScores.values())
      .sort((a, b) => b.total_score - a.total_score)

    console.log(`[leaderboard] 积分数据: ${allUsersScores?.length || 0} 条用户记录`)

    // 3. 获取同分院用户排行（如果用户有分院）
    let branchUsers = []

    if (userBranch) {
      console.log(`[leaderboard] 查询 ${userBranch} 分院排行`)

      // 获取同分院用户历史总积分排行
      branchUsers = allUsersScores.filter(user => 
        user.users?.branch_code === userBranch
      )
      console.log(`[leaderboard] ${userBranch} 分院有 ${branchUsers.length} 个用户参与积分`)
    }

    // 5. 格式化全部用户数据
    const formattedAllUsers = (allUsersScores || []).map((score, index) => ({
      user_id: score.user_id,
      name: score.users?.name,
      display_name: score.user_profile?.display_name,
      branch_name: score.users?.branch_code,
      total_score: score.total_score,
      current_streak: score.current_streak, // 🔧 修复：使用当前连续天数
      rank: index + 1
    }))

    // 6. 格式化分院用户数据
    const formattedBranchUsers = branchUsers.map((score, index) => ({
      user_id: score.user_id,
      name: score.users?.name,
      display_name: score.user_profile?.display_name,
      total_score: score.total_score,
      current_streak: score.current_streak, // 🔧 修复：使用当前连续天数
      rank: index + 1
    }))

    // 7. 实时计算全国分院排行榜（基于历史总积分）
    console.log(`[leaderboard] 开始实时计算分院排行榜`)
    
    // 获取所有有分行的用户
    const { data: allBranchUsers } = await supabase
      .from('users')
      .select('id, branch_code')
      .not('branch_code', 'is', null)
    
    // 按分行统计积分
    const branchStatsMap = new Map()
    
    // 初始化分行统计
    if (allBranchUsers) {
      allBranchUsers.forEach(user => {
        if (!branchStatsMap.has(user.branch_code)) {
          branchStatsMap.set(user.branch_code, {
            branch_code: user.branch_code,
            total_members: 0,
            active_members: 0,
            total_score: 0,
            avg_score: 0
          })
        }
        branchStatsMap.get(user.branch_code).total_members++
      })
    }
    
    // 统计历史总积分（使用已计算的allUsersScores）
    const userTotalScoreMap = new Map(allUsersScores.map(user => [user.user_id, user.total_score]))
    
    if (allBranchUsers) {
      allBranchUsers.forEach(user => {
        const totalScore = userTotalScoreMap.get(user.id) || 0
        const stats = branchStatsMap.get(user.branch_code)
        if (stats) {
          if (totalScore > 0) {
            stats.active_members++
          }
          stats.total_score += totalScore
        }
      })
    }
    
    // 计算平均分并排序
    const branchRankings = Array.from(branchStatsMap.values())
      .map(branch => ({
        ...branch,
        avg_score: branch.total_members > 0 
          ? Math.round((branch.total_score / branch.total_members) * 100) / 100 
          : 0
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 20)
    
    console.log(`[leaderboard] 实时分院排行数据: ${branchRankings.length} 条记录`)

    // 8. 格式化分院排行数据
    const formattedBranchRankings = (branchRankings || []).map((branch, index) => ({
      branch_code: branch.branch_code,
      branch_name: branch.branch_code, // 分院代码作为名称
      total_members: branch.total_members,
      active_members: branch.active_members,
      total_score: branch.total_score,
      avg_score: branch.avg_score,
      rank: index + 1
    }))

    return res.status(200).json({
      ok: true,
      data: {
        allUsers: formattedAllUsers,
        branchUsers: formattedBranchUsers,
        branchRankings: formattedBranchRankings,
        userBranch: userBranch
      }
    })

  } catch (error) {
    console.error('排行榜API错误:', error)
    return res.status(500).json({
      ok: false,
      error: error.message || '获取排行榜失败'
    })
  }
}