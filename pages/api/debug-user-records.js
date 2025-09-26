// Debug User Records API - 调试用户记录
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { userId } = req.query
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' })
  }

  try {
    // 获取用户基本信息
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // 获取用户所有记录
    const { data: records } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('ymd', { ascending: false })

    // 获取用户积分记录
    const { data: scores } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .order('ymd', { ascending: false })

    res.status(200).json({
      user,
      records: records || [],
      scores: scores || [],
      recordsCount: records?.length || 0,
      scoresCount: scores?.length || 0,
      analysis: {
        allRecords: records?.map(r => ({
          ymd: r.ymd,
          category_code: r.category_code,
          description: r.description,
          amount: r.amount
        })) || [],
        validRecords: records?.filter(record => {
          // 排除明显的自动生成测试数据
          if (record.description?.includes('自动生成')) return false
          
          // 其他所有记录都认为是有效的
          return true
        }).map(r => ({
          ymd: r.ymd,
          category_code: r.category_code,
          description: r.description,
          amount: r.amount
        })) || [],
        
        // 连续天数计算详情
        streakCalculation: (() => {
          const validRecords = records?.filter(record => {
            if (record.description?.includes('自动生成')) return false
            return true
          }) || []
          
          if (validRecords.length === 0) return { step: 'no_valid_records', streak: 0 }
          
          const dates = [...new Set(validRecords.map(r => r.ymd))].sort().reverse()
          const today = new Date().toISOString().slice(0, 10)
          const lastValidDate = dates[0]
          const daysSinceLastRecord = Math.floor((new Date(today) - new Date(lastValidDate)) / (1000 * 60 * 60 * 24))
          
          if (daysSinceLastRecord > 1) {
            return { 
              step: 'streak_broken', 
              streak: 0, 
              today,
              lastValidDate,
              daysSinceLastRecord,
              dates
            }
          }
          
          let streak = 1
          const calculations = []
          
          for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i])
            const prevDate = new Date(dates[i - 1])
            const diff = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24))
            
            calculations.push({
              i,
              currentDate: dates[i],
              prevDate: dates[i - 1],
              diff,
              continued: diff === 1
            })
            
            if (diff === 1) {
              streak++
            } else {
              break
            }
          }
          
          return {
            step: 'calculated',
            streak,
            today,
            lastValidDate,
            daysSinceLastRecord,
            dates,
            calculations
          }
        })()
      }
    })

  } catch (error) {
    console.error('[Debug User Records] 错误:', error)
    res.status(500).json({
      error: '查询用户记录失败',
      details: error.message
    })
  }
}