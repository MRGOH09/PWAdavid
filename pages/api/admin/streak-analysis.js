// Admin Streak Analysis API - 连续天数分析工具
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action = 'list' } = req.method === 'GET' ? req.query : req.body

    switch (action) {
      case 'list':
        return await getStreakData(req, res)
      case 'analyze':
        return await analyzeStreaks(req, res)
      case 'fix':
        return await fixStreaks(req, res)
      case 'adjust':
        return await adjustStreak(req, res)
      default:
        return await getStreakData(req, res)
    }

  } catch (error) {
    console.error('[Admin Streak Analysis] 错误:', error)
    res.status(500).json({ 
      error: '连续天数分析失败',
      details: error.message 
    })
  }
}

// 获取用户连续天数数据
async function getStreakData(req, res) {
  try {
    console.log('[Admin Streak] 获取用户连续天数数据')
    
    // 获取所有用户基本信息
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, telegram_id, branch_code, created_at')
      .order('name')
    
    if (usersError) throw usersError
    
    // 处理每个用户的连续天数数据
    const processedUsers = []
    const issues = []
    
    for (const user of users) {
      // 获取该用户最新的积分记录中的连续天数
      const { data: latestScore } = await supabase
        .from('user_daily_scores')
        .select('current_streak, ymd, total_score')
        .eq('user_id', user.id)
        .order('ymd', { ascending: false })
        .limit(1)
        .single()
      
      const currentStreak = latestScore?.current_streak || 0
      const lastRecordDate = latestScore?.ymd || null
      
      // 获取历史最长连续天数
      const { data: allScores } = await supabase
        .from('user_daily_scores')
        .select('current_streak')
        .eq('user_id', user.id)
        .order('current_streak', { ascending: false })
        .limit(1)
        .single()
      
      const maxStreak = allScores?.current_streak || 0
      
      // 计算实际连续天数（基于记录）- 使用简化逻辑
      const actualStreak = await calculateActualStreak(user.id)
      const streakAnalysis = { 
        actualStreak,
        issueReason: actualStreak !== currentStreak ? 
          (actualStreak > currentStreak ? '实际连续天数高于记录值' : '实际连续天数低于记录值') : '',
        issueDetails: { difference: Math.abs(actualStreak - currentStreak) },
        hasAnyRecords: true
      }
      
      // 只有当真的有不合理的情况才报告异常
      // 关键逻辑：如果用户有积分记录（lastRecordDate存在），说明他一定有过有效记录
      const hasScoreRecord = lastRecordDate !== null
      
      const shouldReportIssue = (actualStreak !== currentStreak) && (
        // 情况1：用户有积分记录，说明有过有效记录，连续天数不对就是异常
        hasScoreRecord ||
        // 情况2：用户没有积分记录但显示有连续天数 > 0
        (!hasScoreRecord && currentStreak > 0)
      )
      
      if (shouldReportIssue && streakAnalysis.issueReason) {
        issues.push({
          userId: user.id,
          userName: user.name,
          currentStreak,
          actualStreak,
          difference: actualStreak - currentStreak,
          lastRecordDate,
          reason: streakAnalysis.issueReason,
          details: streakAnalysis.issueDetails
        })
      }
      
      // 获取总记录数
      const { data: records, count } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('category_code', 'daily_checkin')
        .not('description', 'like', '%自动生成%')
        .not('description', 'like', '%测试%')
      
      processedUsers.push({
        id: user.id,
        name: user.name,
        telegram_id: user.telegram_id,
        branch_code: user.branch_code || '未分配',
        currentStreak,
        maxStreak,
        actualStreak,
        lastRecordDate,
        totalRecords: count || 0,
        hasIssue: actualStreak !== currentStreak
      })
    }
    
    console.log(`[Admin Streak] 处理了 ${processedUsers.length} 个用户，发现 ${issues.length} 个问题`)
    
    res.status(200).json({
      users: processedUsers,
      issues,
      summary: {
        totalUsers: processedUsers.length,
        totalIssues: issues.length,
        averageStreak: Math.round(processedUsers.reduce((sum, u) => sum + u.currentStreak, 0) / processedUsers.length)
      }
    })
    
  } catch (error) {
    console.error('[Admin Streak] 获取数据失败:', error)
    res.status(500).json({
      error: '获取连续天数数据失败',
      details: error.message
    })
  }
}

// 分析用户连续天数并返回异常原因
async function analyzeUserStreak(userId, currentStreak, lastRecordDate) {
  try {
    const result = {
      actualStreak: 0,
      issueReason: '',
      issueDetails: {},
      hasAnyRecords: false
    }

    // 获取用户所有有效记录的日期
    const { data: records } = await supabase
      .from('records')
      .select('ymd, category_code, note, amount')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('ymd', { ascending: false })
    
    if (!records || records.length === 0) {
      result.hasAnyRecords = false
      if (currentStreak > 0) {
        result.issueReason = '无有效记录但显示有连续天数'
        result.issueDetails = {
          type: 'NO_RECORDS_BUT_HAS_STREAK',
          currentStreak,
          expectedStreak: 0
        }
      }
      return result
    }

    result.hasAnyRecords = true

    // 过滤出有效记录 - 更宽松的条件，主要排除明显的测试数据
    const validRecords = records.filter(record => {
      // 排除明显的自动生成测试数据
      if (record.note?.includes('自动生成')) return false
      
      // 其他所有记录都认为是有效的，包括：
      // - 签到记录 (daily_checkin)
      // - 有金额的财务记录
      // - 手动添加的记录（即使金额为0）
      return true
    })

    if (validRecords.length === 0) {
      if (currentStreak > 0) {
        result.issueReason = '只有测试数据，不应计算连续天数'
        result.issueDetails = {
          type: 'ONLY_TEST_DATA',
          totalRecords: records.length,
          testRecords: records.filter(r => r.description?.includes('测试') || r.description?.includes('自动生成')).length,
          currentStreak,
          expectedStreak: 0
        }
      }
      return result
    }

    // 获取唯一的有效日期并排序
    const dates = [...new Set(validRecords.map(r => r.ymd))].sort().reverse()
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    
    // 检查最近记录日期
    const lastValidDate = dates[0]
    
    // 使用简单的字符串比较来计算日期差异，避免时区问题
    const todayString = today
    const daysDiff = calculateDateDifference(lastValidDate, todayString)
    
    // 如果最近的记录超过1天，连续天数应该归零
    if (daysDiff > 1) {
      result.actualStreak = 0
      if (currentStreak > 0) {
        result.issueReason = '连续记录已中断，应重置为0'
        result.issueDetails = {
          type: 'STREAK_BROKEN',
          lastRecordDate: lastValidDate,
          daysSinceLastRecord: daysDiff,
          currentStreak,
          expectedStreak: 0
        }
      }
      return result
    }

    // 计算实际连续天数
    let streak = 1
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i])
      const prevDate = new Date(dates[i - 1])
      const diff = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24))
      
      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    result.actualStreak = streak

    // 分析差异原因
    if (result.actualStreak !== currentStreak) {
      if (result.actualStreak > currentStreak) {
        result.issueReason = '实际连续天数高于记录值，可能漏算'
        result.issueDetails = {
          type: 'UNDERCOUNT',
          validDates: dates.slice(0, streak),
          currentStreak,
          actualStreak: result.actualStreak,
          difference: result.actualStreak - currentStreak
        }
      } else {
        result.issueReason = '记录的连续天数高于实际，可能误算'
        result.issueDetails = {
          type: 'OVERCOUNT',
          validDates: dates.slice(0, streak),
          currentStreak,
          actualStreak: result.actualStreak,
          difference: currentStreak - result.actualStreak
        }
      }
    }

    return result

  } catch (error) {
    console.error(`[analyzeUserStreak] 分析用户 ${userId} 失败:`, error)
    return {
      actualStreak: 0,
      issueReason: '分析失败: ' + error.message,
      issueDetails: { type: 'ERROR', error: error.message }
    }
  }
}

// 计算用户的实际连续天数
async function calculateActualStreak(userId) {
  try {
    // 获取用户所有记录的日期 - 使用正确的列名
    const { data: records } = await supabase
      .from('records')
      .select('ymd, category_code, note, amount')
      .eq('user_id', userId)
      .eq('is_voided', false)  // 只查询未作废的记录
      .order('ymd', { ascending: false })
    
    if (!records || records.length === 0) {
      return 0
    }
    
    // 过滤出有效记录 - 更宽松的条件，主要排除明显的测试数据
    const validRecords = records.filter(record => {
      // 排除明显的自动生成测试数据
      if (record.note?.includes('自动生成')) return false
      
      // 其他所有记录都认为是有效的，包括：
      // - 签到记录 (daily_checkin)
      // - 有金额的财务记录
      // - 手动添加的记录（即使金额为0）
      return true
    })
    
    if (validRecords.length === 0) {
      return 0
    }
    
    // 获取唯一日期并排序
    const dates = [...new Set(validRecords.map(r => r.ymd))].sort().reverse()
    
    if (dates.length === 0) {
      return 0
    }
    
    // 从最近的日期开始计算连续天数
    let streak = 1
    const today = new Date().toISOString().slice(0, 10)
    
    // 如果最近的记录不是今天或昨天，连续天数为0
    const daysDiff = calculateDateDifference(dates[0], today)
    
    if (daysDiff > 1) {
      return 0
    }
    
    // 计算连续天数
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i])
      const prevDate = new Date(dates[i - 1])
      const diff = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24))
      
      if (diff === 1) {
        streak++
      } else {
        break
      }
    }
    
    return streak
    
  } catch (error) {
    console.error(`[calculateActualStreak] 计算用户 ${userId} 连续天数失败:`, error)
    return 0
  }
}

// 分析所有用户的连续天数问题
async function analyzeStreaks(req, res) {
  try {
    console.log('[Admin Streak] 分析所有用户的连续天数')
    
    // 获取所有用户
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
    
    const issues = []
    let fixedCount = 0
    
    for (const user of users) {
      const actualStreak = await calculateActualStreak(user.id)
      
      // 获取当前记录的连续天数
      const { data: latestScore } = await supabase
        .from('user_daily_scores')
        .select('current_streak')
        .eq('user_id', user.id)
        .order('ymd', { ascending: false })
        .limit(1)
        .single()
      
      const currentStreak = latestScore?.current_streak || 0
      
      if (actualStreak !== currentStreak) {
        issues.push({
          userId: user.id,
          userName: user.name,
          currentStreak,
          actualStreak,
          needsFix: true
        })
      }
    }
    
    res.status(200).json({
      issues,
      summary: {
        totalUsers: users.length,
        issuesFound: issues.length,
        percentageWithIssues: Math.round((issues.length / users.length) * 100)
      }
    })
    
  } catch (error) {
    console.error('[Admin Streak] 分析失败:', error)
    res.status(500).json({
      error: '分析连续天数失败',
      details: error.message
    })
  }
}

// 修复连续天数问题
async function fixStreaks(req, res) {
  const { userIds } = req.body
  
  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ error: '请提供要修复的用户ID列表' })
  }
  
  try {
    console.log(`[Admin Streak] 修复 ${userIds.length} 个用户的连续天数`)
    
    const results = []
    
    for (const userId of userIds) {
      try {
        const actualStreak = await calculateActualStreak(userId)
        
        // 更新最新的积分记录
        const { data: latestScore } = await supabase
          .from('user_daily_scores')
          .select('*')
          .eq('user_id', userId)
          .order('ymd', { ascending: false })
          .limit(1)
          .single()
        
        if (latestScore) {
          const { error } = await supabase
            .from('user_daily_scores')
            .update({ current_streak: actualStreak })
            .eq('user_id', userId)
            .eq('ymd', latestScore.ymd)
          
          if (error) throw error
          
          results.push({
            userId,
            success: true,
            oldStreak: latestScore.current_streak,
            newStreak: actualStreak
          })
        }
        
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    
    res.status(200).json({
      results,
      summary: {
        total: userIds.length,
        success: successCount,
        failed: userIds.length - successCount
      }
    })
    
  } catch (error) {
    console.error('[Admin Streak] 修复失败:', error)
    res.status(500).json({
      error: '修复连续天数失败',
      details: error.message
    })
  }
}

// 手动调整用户连续天数
async function adjustStreak(req, res) {
  const { userId, newStreak, reason } = req.body
  
  if (!userId || newStreak === undefined) {
    return res.status(400).json({ error: '请提供用户ID和新的连续天数' })
  }
  
  try {
    console.log(`[Admin Streak] 调整用户 ${userId} 的连续天数到 ${newStreak}`)
    
    // 获取最新的积分记录
    const { data: latestScore, error: fetchError } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .order('ymd', { ascending: false })
      .limit(1)
      .single()
    
    if (fetchError || !latestScore) {
      return res.status(404).json({ error: '未找到用户的积分记录' })
    }
    
    const oldStreak = latestScore.current_streak
    
    // 更新连续天数
    const { error: updateError } = await supabase
      .from('user_daily_scores')
      .update({ current_streak: newStreak })
      .eq('user_id', userId)
      .eq('ymd', latestScore.ymd)
    
    if (updateError) throw updateError
    
    // 记录调整日志（如果有日志表的话）
    console.log(`[Admin Streak] 成功调整: ${oldStreak} → ${newStreak}, 原因: ${reason || '未说明'}`)
    
    res.status(200).json({
      success: true,
      userId,
      oldStreak,
      newStreak,
      reason,
      adjustedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Admin Streak] 调整失败:', error)
    res.status(500).json({
      error: '调整连续天数失败',
      details: error.message
    })
  }
}
// 计算两个日期字符串之间的天数差异
function calculateDateDifference(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  // 重置为UTC午夜，避免时区问题
  d1.setUTCHours(0, 0, 0, 0)
  d2.setUTCHours(0, 0, 0, 0)
  
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
}
