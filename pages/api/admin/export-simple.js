// 简化版数据导出API - 只支持CSV格式
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { format, type, filters } = req.body
    console.log(`[Admin Export Simple] 请求导出: ${format} - ${type}`)

    // 暂时只支持CSV格式
    if (format !== 'csv') {
      return res.status(400).json({ 
        error: `${format.toUpperCase()}格式正在开发中，请使用CSV格式`,
        suggestion: '建议选择CSV格式进行数据导出'
      })
    }

    return await generateCSVReport(req, res, type, filters)

  } catch (error) {
    console.error('[Admin Export Simple] 错误:', error)
    res.status(500).json({ 
      error: '数据导出失败',
      details: error.message 
    })
  }
}

// CSV报告生成
async function generateCSVReport(req, res, type, filters) {
  console.log(`[Admin Export Simple] 生成CSV报告: ${type}`)

  try {
    // 获取基础数据
    const { data: users } = await supabase
      .from('users')
      .select('id, name, branch_code, status, created_at')
      .neq('status', 'test')

    const { data: scores } = await supabase
      .from('user_daily_scores')
      .select('user_id, total_score, base_score, streak_score, bonus_score, current_streak, ymd')

    console.log(`[Admin Export Simple] 获取到 ${users?.length || 0} 个用户，${scores?.length || 0} 条积分记录`)

    let csvContent = '\uFEFF' // BOM for UTF-8
    
    switch (type) {
      case 'branch-summary':
        csvContent += generateBranchSummaryCSV(users, scores)
        break
      case 'user-details':
        csvContent += generateUserDetailsCSV(users, scores, filters)
        break
      case 'score-analysis':
        csvContent += generateScoreAnalysisCSV(scores)
        break
      default:
        csvContent += generateComprehensiveCSV(users, scores)
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="LEARNER_CLUB_${type}_${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csvContent)

  } catch (error) {
    console.error('[Admin Export Simple] CSV生成失败:', error)
    throw error
  }
}

// 生成分院汇总CSV
function generateBranchSummaryCSV(users, scores) {
  let csv = '排名,分院,总人数,活跃人数,总积分,平均积分,最高连续天数\n'
  
  // 计算分院统计
  const branchStats = {}
  users?.forEach(user => {
    if (!branchStats[user.branch_code]) {
      branchStats[user.branch_code] = {
        branch: user.branch_code,
        totalMembers: 0,
        totalScore: 0,
        maxStreak: 0
      }
    }
    branchStats[user.branch_code].totalMembers++
  })

  scores?.forEach(score => {
    const user = users?.find(u => u.id === score.user_id)
    if (user && branchStats[user.branch_code]) {
      branchStats[user.branch_code].totalScore += score.total_score
      branchStats[user.branch_code].maxStreak = Math.max(
        branchStats[user.branch_code].maxStreak, 
        score.current_streak || 0
      )
    }
  })

  // 生成CSV行
  const sortedBranches = Object.values(branchStats)
    .sort((a, b) => b.totalScore - a.totalScore)

  sortedBranches.forEach((branch, index) => {
    const avgScore = branch.totalMembers > 0 ? 
      Math.round(branch.totalScore / branch.totalMembers * 100) / 100 : 0
    
    csv += `${index + 1},${branch.branch},${branch.totalMembers},${branch.totalMembers},${branch.totalScore},${avgScore},${branch.maxStreak}\n`
  })

  return csv
}

// 生成用户详情CSV
function generateUserDetailsCSV(users, scores, filters) {
  let filteredUsers = users
  if (filters?.branch && filters.branch !== 'all') {
    filteredUsers = users?.filter(u => u.branch_code === filters.branch)
  }

  let csv = '姓名,分院,总积分,活跃天数,最高连续,基础积分,连续积分,奖励积分,加入时间\n'
  
  filteredUsers?.forEach(user => {
    const userScores = scores?.filter(s => s.user_id === user.id) || []
    const totalScore = userScores.reduce((sum, s) => sum + s.total_score, 0)
    const activeDays = userScores.length
    const maxStreak = userScores.length > 0 ? Math.max(...userScores.map(s => s.current_streak)) : 0
    const baseScore = userScores.reduce((sum, s) => sum + s.base_score, 0)
    const streakScore = userScores.reduce((sum, s) => sum + (s.streak_score || 0), 0)
    const bonusScore = userScores.reduce((sum, s) => sum + (s.bonus_score || 0), 0)
    const joinDate = new Date(user.created_at).toLocaleDateString('zh-CN')

    csv += `${user.name},${user.branch_code},${totalScore},${activeDays},${maxStreak},${baseScore},${streakScore},${bonusScore},${joinDate}\n`
  })

  return csv
}

// 生成积分分析CSV
function generateScoreAnalysisCSV(scores) {
  let csv = '日期,活跃用户,总积分,平均积分,基础分,连续分,奖励分\n'
  
  // 按日期汇总
  const dailyStats = {}
  scores?.forEach(score => {
    if (!dailyStats[score.ymd]) {
      dailyStats[score.ymd] = {
        totalUsers: 0,
        totalScore: 0,
        baseScore: 0,
        streakScore: 0,
        bonusScore: 0
      }
    }
    dailyStats[score.ymd].totalUsers++
    dailyStats[score.ymd].totalScore += score.total_score
    dailyStats[score.ymd].baseScore += score.base_score
    dailyStats[score.ymd].streakScore += score.streak_score || 0
    dailyStats[score.ymd].bonusScore += score.bonus_score || 0
  })

  // 生成CSV行
  Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .reverse()
    .forEach(([date, stats]) => {
      const avgScore = Math.round(stats.totalScore / stats.totalUsers * 100) / 100
      csv += `${date},${stats.totalUsers},${stats.totalScore},${avgScore},${stats.baseScore},${stats.streakScore},${stats.bonusScore}\n`
    })

  return csv
}

// 生成综合CSV
function generateComprehensiveCSV(users, scores) {
  let csv = '# LEARNER CLUB 综合数据报告\n'
  csv += `# 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`
  
  csv += '## 分院汇总\n'
  csv += generateBranchSummaryCSV(users, scores)
  
  csv += '\n## 用户详情\n'
  csv += generateUserDetailsCSV(users, scores, {})
  
  csv += '\n## 积分分析\n'
  csv += generateScoreAnalysisCSV(scores)
  
  return csv
}