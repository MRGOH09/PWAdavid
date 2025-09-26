// Admin Score Fix API - 积分修复工具
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
    const { action, userIds } = req.body

    switch (action) {
      case 'analyze':
        return await analyzeScoreErrors(req, res)
      case 'fix-selected':
        return await fixSelectedUsers(req, res, userIds)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[Admin Fix Scores] 错误:', error)
    res.status(500).json({ 
      error: '积分修复操作失败',
      details: error.message 
    })
  }
}

// 分析积分计算错误
async function analyzeScoreErrors(req, res) {
  console.log('[Admin Fix Scores] 开始分析积分错误...')

  try {
    // 获取所有用户的记录和积分
    const { data: users } = await supabase
      .from('users')
      .select('id, name, branch_code')

    if (!users) {
      return res.status(200).json({ errorUsers: [], summary: { total: 0, errors: 0 } })
    }

    const errorUsers = []

    for (const user of users) {
      // 获取用户所有记录（按日期分组，排除测试和自动生成数据）
      const { data: records } = await supabase
        .from('records')
        .select('ymd, category_group, category_code, amount, description')
        .eq('user_id', user.id)
        .neq('category_code', 'daily_checkin') // 排除签到记录
        .not('description', 'like', '%自动生成%') // 排除自动生成的测试数据
        .not('description', 'like', '%测试%') // 排除测试数据
        .order('ymd')

      // 获取用户当前积分
      const { data: scores } = await supabase
        .from('user_daily_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('ymd')

      if (!records || records.length === 0) continue

      // 按日期分组记录
      const recordsByDate = {}
      records.forEach(record => {
        if (!recordsByDate[record.ymd]) {
          recordsByDate[record.ymd] = []
        }
        recordsByDate[record.ymd].push(record)
      })

      // 按日期分组积分
      const scoresByDate = {}
      scores?.forEach(score => {
        scoresByDate[score.ymd] = score
      })

      // 检查每一天的积分计算
      const errors = []
      let streak = 0
      const dates = Object.keys(recordsByDate).sort()
      
      // 过滤出有有效记录的日期，用于连续天数计算
      const validDates = []
      for (const date of dates) {
        const dayRecords = recordsByDate[date]
        const validRecords = dayRecords.filter(record => {
          return record.category_code !== 'daily_checkin' && 
                 !record.description?.includes('自动生成') && 
                 !record.description?.includes('测试') &&
                 record.amount && record.amount !== 0
        })
        if (validRecords.length > 0) {
          validDates.push(date)
        }
      }

      for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const dayRecords = recordsByDate[date]
        const currentScore = scoresByDate[date]

        if (!currentScore) {
          // 只有有有效记录的日期才报告缺少积分记录的错误
          const validRecords = dayRecords.filter(record => {
            return record.category_code !== 'daily_checkin' && 
                   !record.description?.includes('自动生成') && 
                   !record.description?.includes('测试') &&
                   record.amount && record.amount !== 0
          })
          
          if (validRecords.length > 0) {
            errors.push({
              date,
              type: 'missing_score',
              description: `缺少积分记录 (有效记录: ${validRecords.length})`,
              records: dayRecords.length
            })
          }
          continue
        }

        // 计算预期积分 - 只有有效的财务记录才给基础分
        const validRecords = dayRecords.filter(record => {
          // 排除签到记录、测试数据、自动生成数据
          return record.category_code !== 'daily_checkin' && 
                 !record.description?.includes('自动生成') && 
                 !record.description?.includes('测试') &&
                 record.amount && record.amount !== 0
        })
        const expectedBaseScore = validRecords.length > 0 ? 1 : 0
        
        // 计算连续天数 - 基于有效日期
        const validDateIndex = validDates.indexOf(date)
        if (validDateIndex >= 0) {
          if (validDateIndex === 0) {
            streak = 1
          } else {
            const prevValidDate = new Date(validDates[validDateIndex - 1])
            const currDate = new Date(date)
            const dayDiff = Math.floor((currDate - prevValidDate) / (1000 * 60 * 60 * 24))
            
            if (dayDiff === 1) {
              streak++
            } else {
              streak = 1
            }
          }
        } else {
          // 如果当前日期没有有效记录，streak应该为0
          streak = 0
        }

        const expectedStreakScore = streak > 1 ? 1 : 0
        
        // 计算奖励积分
        let expectedBonusScore = 0
        if (streak === 3) expectedBonusScore = 2  // 坚持三天
        if (streak === 5) expectedBonusScore = 3  // 持续五天
        if (streak === 7) expectedBonusScore = 5  // 连续一周
        if (streak === 15) expectedBonusScore = 10 // 半月坚持
        if (streak === 30) expectedBonusScore = 20 // 满月奖励

        const expectedTotalScore = expectedBaseScore + expectedStreakScore + expectedBonusScore

        // 检查计算错误
        if (currentScore.base_score !== expectedBaseScore ||
            currentScore.streak_score !== expectedStreakScore ||
            currentScore.bonus_score !== expectedBonusScore ||
            currentScore.total_score !== expectedTotalScore ||
            currentScore.current_streak !== streak) {
          
          errors.push({
            date,
            type: 'calculation_error',
            description: '积分计算错误',
            current: {
              base: currentScore.base_score,
              streak: currentScore.streak_score,
              bonus: currentScore.bonus_score,
              total: currentScore.total_score,
              current_streak: currentScore.current_streak
            },
            expected: {
              base: expectedBaseScore,
              streak: expectedStreakScore,
              bonus: expectedBonusScore,
              total: expectedTotalScore,
              current_streak: streak
            },
            records: dayRecords.length
          })
        }
      }

      if (errors.length > 0) {
        errorUsers.push({
          user,
          errors,
          totalErrors: errors.length,
          totalRecords: records.length,
          totalScores: scores?.length || 0
        })
      }
    }

    console.log(`[Admin Fix Scores] 分析完成，发现 ${errorUsers.length} 个用户有积分错误`)

    res.status(200).json({
      errorUsers,
      summary: {
        total: users.length,
        errors: errorUsers.length,
        totalErrorCount: errorUsers.reduce((sum, u) => sum + u.totalErrors, 0)
      },
      analyzedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Admin Fix Scores] 分析失败:', error)
    res.status(500).json({
      error: '积分错误分析失败',
      details: error.message
    })
  }
}

// 修复选定用户的积分
async function fixSelectedUsers(req, res, userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: '请选择要修复的用户' })
  }

  console.log(`[Admin Fix Scores] 开始修复 ${userIds.length} 个用户的积分...`)

  const results = []
  let successCount = 0
  let errorCount = 0

  try {
    for (const userId of userIds) {
      try {
        const result = await fixUserScores(userId)
        results.push({
          userId,
          success: true,
          ...result
        })
        successCount++
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        })
        errorCount++
        console.error(`[Admin Fix Scores] 修复用户 ${userId} 失败:`, error)
      }
    }

    res.status(200).json({
      results,
      summary: {
        total: userIds.length,
        success: successCount,
        errors: errorCount
      },
      fixedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Admin Fix Scores] 批量修复失败:', error)
    res.status(500).json({
      error: '批量修复失败',
      details: error.message
    })
  }
}

// 修复单个用户的积分
async function fixUserScores(userId) {
  // 获取用户所有记录，排除测试和自动生成数据
  const { data: records } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .neq('category_code', 'daily_checkin') // 排除签到记录
    .not('description', 'like', '%自动生成%') // 排除自动生成的测试数据
    .not('description', 'like', '%测试%') // 排除测试数据
    .order('ymd')

  if (!records || records.length === 0) {
    return { message: '用户无有效记录，无需修复' }
  }

  // 删除现有积分记录
  await supabase
    .from('user_daily_scores')
    .delete()
    .eq('user_id', userId)

  // 按日期分组记录
  const recordsByDate = {}
  records.forEach(record => {
    if (!recordsByDate[record.ymd]) {
      recordsByDate[record.ymd] = []
    }
    recordsByDate[record.ymd].push(record)
  })

  const dates = Object.keys(recordsByDate).sort()
  const newScores = []
  let streak = 0
  
  // 过滤出有有效记录的日期
  const validDates = []
  for (const date of dates) {
    const dayRecords = recordsByDate[date]
    const validRecords = dayRecords.filter(record => {
      return record.category_code !== 'daily_checkin' && 
             !record.description?.includes('自动生成') && 
             !record.description?.includes('测试') &&
             record.amount && record.amount !== 0
    })
    if (validRecords.length > 0) {
      validDates.push(date)
    }
  }

  // 重新计算每日积分
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dayRecords = recordsByDate[date]

    // 基础分 - 只有有效记录才给分
    const validRecords = dayRecords.filter(record => {
      return record.category_code !== 'daily_checkin' && 
             !record.description?.includes('自动生成') && 
             !record.description?.includes('测试') &&
             record.amount && record.amount !== 0
    })
    const baseScore = validRecords.length > 0 ? 1 : 0

    // 计算连续天数 - 基于有效日期
    const validDateIndex = validDates.indexOf(date)
    if (validDateIndex >= 0) {
      if (validDateIndex === 0) {
        streak = 1
      } else {
        const prevValidDate = new Date(validDates[validDateIndex - 1])
        const currDate = new Date(date)
        const dayDiff = Math.floor((currDate - prevValidDate) / (1000 * 60 * 60 * 24))
        
        if (dayDiff === 1) {
          streak++
        } else {
          streak = 1
        }
      }
    } else {
      // 如果当前日期没有有效记录，不生成积分记录
      continue
    }

    // 连续分
    const streakScore = streak > 1 ? 1 : 0

    // 奖励分和详情
    let bonusScore = 0
    const bonusDetails = []

    if (streak === 3) {
      bonusScore = 2
      bonusDetails.push({ name: '坚持三天', score: 2 })
    }
    if (streak === 5) {
      bonusScore = 3
      bonusDetails.push({ name: '持续五天', score: 3 })
    }
    if (streak === 7) {
      bonusScore = 5
      bonusDetails.push({ name: '连续一周', score: 5 })
    }
    if (streak === 15) {
      bonusScore = 10
      bonusDetails.push({ name: '半月坚持', score: 10 })
    }
    if (streak === 30) {
      bonusScore = 20
      bonusDetails.push({ name: '满月奖励', score: 20 })
    }

    const totalScore = baseScore + streakScore + bonusScore

    // 确定记录类型
    const recordType = dayRecords.some(r => r.category_code === 'daily_checkin') ? 'checkin' : 'record'

    newScores.push({
      user_id: userId,
      ymd: date,
      base_score: baseScore,
      streak_score: streakScore,
      bonus_score: bonusScore,
      total_score: totalScore,
      current_streak: streak,
      record_type: recordType,
      bonus_details: bonusDetails
    })
  }

  // 批量插入新积分记录
  const { error } = await supabase
    .from('user_daily_scores')
    .insert(newScores)

  if (error) {
    throw error
  }

  return {
    message: '修复成功',
    totalDays: newScores.length,
    totalScore: newScores.reduce((sum, s) => sum + s.total_score, 0),
    maxStreak: Math.max(...newScores.map(s => s.current_streak))
  }
}