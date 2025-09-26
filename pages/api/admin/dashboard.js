// Admin Dashboard API - 安全的只读数据查看
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // 只允许GET请求，确保只读操作
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[Admin Dashboard] 获取仪表板数据...')

    // 1. 获取用户总数
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    // 2. 获取积分记录总数
    const { count: totalScores } = await supabase
      .from('user_daily_scores')
      .select('*', { count: 'exact', head: true })

    // 3. 获取最近7天的积分发放情况
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString().slice(0, 10)

    const { data: recentScores } = await supabase
      .from('user_daily_scores')
      .select('ymd, total_score, bonus_score')
      .gte('ymd', startDate)
      .order('ymd', { ascending: false })

    // 4. 获取里程碑配置
    const { data: milestones } = await supabase
      .from('score_milestones')
      .select('*')
      .order('streak_days')

    // 5. 统计每日积分发放
    const dailyStats = {}
    recentScores?.forEach(score => {
      if (!dailyStats[score.ymd]) {
        dailyStats[score.ymd] = {
          date: score.ymd,
          totalScores: 0,
          totalBonus: 0,
          userCount: 0
        }
      }
      dailyStats[score.ymd].totalScores += score.total_score
      dailyStats[score.ymd].totalBonus += score.bonus_score || 0
      dailyStats[score.ymd].userCount++
    })

    // 6. 检测潜在问题（只读检查，不修复）
    const issues = []
    
    // 检查是否有用户连续天数异常（简单检查）
    const { data: suspiciousStreaks } = await supabase
      .from('user_daily_scores')
      .select('user_id, ymd, current_streak')
      .gt('current_streak', 30) // 连续超过30天的记录
      .limit(5)

    if (suspiciousStreaks && suspiciousStreaks.length > 0) {
      issues.push({
        type: 'suspicious_streaks',
        count: suspiciousStreaks.length,
        description: '检测到连续天数可能异常的记录'
      })
    }

    // 7. 构建响应数据
    const dashboardData = {
      // 基本统计
      totalUsers: totalUsers || 0,
      totalScores: totalScores || 0,
      
      // 里程碑信息
      milestones: milestones || [],
      
      // 最近7天统计
      recentStats: Object.values(dailyStats).slice(0, 7),
      
      // 系统健康状态
      systemHealth: issues.length === 0 ? 'good' : 'warning',
      
      // 发现的问题
      issues: issues,
      
      // 最后更新时间
      lastUpdated: new Date().toISOString()
    }

    console.log('[Admin Dashboard] 数据获取成功:', {
      totalUsers: dashboardData.totalUsers,
      totalScores: dashboardData.totalScores,
      issuesCount: issues.length
    })

    res.status(200).json(dashboardData)

  } catch (error) {
    console.error('[Admin Dashboard] 错误:', error)
    res.status(500).json({ 
      error: '获取仪表板数据失败',
      details: error.message 
    })
  }
}