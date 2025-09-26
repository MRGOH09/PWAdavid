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

    // 1. 获取用户最近30天的积分记录
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: dailyScores, error: scoresError } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .gte('ymd', thirtyDaysAgoStr)
      .order('ymd', { ascending: false })
      .limit(30)

    if (scoresError) {
      console.error('获取积分记录失败:', scoresError)
      return res.status(500).json({ ok: false, error: '获取积分记录失败' })
    }

    console.log(`[scores] 用户 ${userId} 积分记录: ${dailyScores?.length || 0} 条`)

    // 2. 计算积分统计
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    let totalScore = 0
    let currentStreak = 0
    let thisMonthScore = 0
    let todayScore = 0

    // 获取最新的连续天数（优先今日记录，备选最近记录）
    const todayRecord = dailyScores?.find(score => score.ymd === today)
    if (todayRecord) {
      // 如果今天有记录，使用今天的连续天数
      currentStreak = todayRecord.current_streak || 0
    } else if (dailyScores && dailyScores.length > 0) {
      // 如果今天没记录，使用最近的连续天数
      currentStreak = dailyScores[0].current_streak || 0
    }

    // 计算各项统计
    dailyScores?.forEach(score => {
      totalScore += score.total_score || 0
      
      if (score.ymd.startsWith(thisMonth)) {
        thisMonthScore += score.total_score || 0
      }
      
      if (score.ymd === today) {
        todayScore = score.total_score || 0
      }
    })

    // 3. 格式化每日积分数据
    const formattedDailyScores = (dailyScores || []).map(score => ({
      ...score,
      bonus_details: Array.isArray(score.bonus_details) ? score.bonus_details : 
                     score.bonus_details ? JSON.parse(score.bonus_details) : []
    }))

    return res.status(200).json({
      ok: true,
      data: {
        dailyScores: formattedDailyScores,
        summary: {
          totalScore,
          currentStreak,
          thisMonthScore,
          todayScore
        }
      }
    })

  } catch (error) {
    console.error('积分API错误:', error)
    return res.status(500).json({
      ok: false,
      error: error.message || '获取积分数据失败'
    })
  }
}