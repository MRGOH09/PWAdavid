// Admin Scores API - 安全的积分数据查看和分析
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, action = 'user-scores' } = req.query

    switch (action) {
      case 'user-scores':
        return await getUserScores(req, res, userId)
      case 'analyze-issues':
        return await analyzeScoreIssues(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[Admin Scores] 错误:', error)
    res.status(500).json({ 
      error: '积分数据获取失败',
      details: error.message 
    })
  }
}

// 获取特定用户的积分历史
async function getUserScores(req, res, userId) {
  if (!userId) {
    return res.status(400).json({ error: '需要提供用户ID' })
  }

  console.log(`[Admin Scores] 获取用户 ${userId} 的积分历史`)

  // 获取用户基本信息
  const { data: user } = await supabase
    .from('users')
    .select('id, name, telegram_id, branch_code, status, created_at')
    .eq('id', userId)
    .single()

  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  // 获取用户积分历史（最近30天）
  const { data: scores } = await supabase
    .from('user_daily_scores')
    .select('*')
    .eq('user_id', userId)
    .order('ymd', { ascending: false })
    .limit(30)

  // 获取用户记录历史
  const { data: records } = await supabase
    .from('records')
    .select('ymd, category_group, category_code, amount, note')
    .eq('user_id', userId)
    .order('ymd', { ascending: false })
    .limit(50)

  // 统计分析
  const analysis = {
    totalScore: scores?.reduce((sum, s) => sum + s.total_score, 0) || 0,
    totalDays: scores?.length || 0,
    maxStreak: Math.max(...(scores?.map(s => s.current_streak) || [0])),
    totalBonus: scores?.reduce((sum, s) => sum + (s.bonus_score || 0), 0) || 0,
    averageScore: scores?.length > 0 ? 
      Math.round((scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length) * 100) / 100 : 0
  }

  res.status(200).json({
    user,
    scores: scores || [],
    records: records || [],
    analysis,
    lastUpdated: new Date().toISOString()
  })
}

// 分析积分系统问题（只读分析，不修复）
async function analyzeScoreIssues(req, res) {
  console.log('[Admin Scores] 开始分析积分系统问题...')

  const issues = []

  try {
    // 1. 检查缺失的积分记录
    console.log('检查缺失的积分记录...')
    
    // 获取最近7天的所有records
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString().slice(0, 10)

    const { data: recentRecords } = await supabase
      .from('records')
      .select('user_id, ymd')
      .gte('ymd', startDate)

    const { data: recentScores } = await supabase
      .from('user_daily_scores')
      .select('user_id, ymd')
      .gte('ymd', startDate)

    // 创建积分记录的映射
    const scoresMap = new Set()
    recentScores?.forEach(score => {
      scoresMap.add(`${score.user_id}-${score.ymd}`)
    })

    // 检查哪些记录没有对应的积分
    const missingScores = []
    recentRecords?.forEach(record => {
      const key = `${record.user_id}-${record.ymd}`
      if (!scoresMap.has(key)) {
        missingScores.push(record)
      }
    })

    if (missingScores.length > 0) {
      issues.push({
        type: 'missing_scores',
        severity: 'medium',
        count: missingScores.length,
        description: `发现 ${missingScores.length} 条记录缺少对应的积分`,
        sample: missingScores.slice(0, 5),
        suggestion: '可以运行积分修复工具为这些记录补充积分'
      })
    }

    // 2. 检查重复的积分记录
    console.log('检查重复的积分记录...')
    
    const { data: duplicateCheck } = await supabase
      .from('user_daily_scores')
      .select('user_id, ymd')
      .gte('ymd', startDate)
      .order('user_id, ymd')

    const duplicates = []
    const seen = new Set()
    duplicateCheck?.forEach(score => {
      const key = `${score.user_id}-${score.ymd}`
      if (seen.has(key)) {
        duplicates.push(key)
      } else {
        seen.add(key)
      }
    })

    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_scores',
        severity: 'high',
        count: duplicates.length,
        description: `发现 ${duplicates.length} 组重复的积分记录`,
        sample: duplicates.slice(0, 5),
        suggestion: '建议清理重复的积分记录以保持数据一致性'
      })
    }

    // 3. 检查异常高的连续天数
    console.log('检查异常的连续天数...')
    
    const { data: highStreaks } = await supabase
      .from('user_daily_scores')
      .select('user_id, ymd, current_streak')
      .gt('current_streak', 50) // 连续超过50天
      .limit(10)

    if (highStreaks && highStreaks.length > 0) {
      issues.push({
        type: 'high_streaks',
        severity: 'low',
        count: highStreaks.length,
        description: `发现 ${highStreaks.length} 个用户连续天数超过50天`,
        sample: highStreaks.slice(0, 3),
        suggestion: '建议检查这些用户的连续天数是否计算正确'
      })
    }

    console.log(`[Admin Scores] 分析完成，发现 ${issues.length} 类问题`)

    res.status(200).json({
      issues,
      summary: {
        totalIssues: issues.length,
        highSeverity: issues.filter(i => i.severity === 'high').length,
        mediumSeverity: issues.filter(i => i.severity === 'medium').length,
        lowSeverity: issues.filter(i => i.severity === 'low').length
      },
      analyzedAt: new Date().toISOString(),
      recommendation: issues.length > 0 ? 
        '发现一些问题，建议联系技术管理员进行修复' : 
        '积分系统运行正常，未发现明显问题'
    })

  } catch (error) {
    console.error('[Admin Scores] 分析失败:', error)
    res.status(500).json({
      error: '积分问题分析失败',
      details: error.message
    })
  }
}