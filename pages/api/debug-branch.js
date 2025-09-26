import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    // 1. 直接查询数据库中所有用户的branch_code
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, branch_code')
      .neq('status', 'test')
      .in('branch_code', ['PU', '小天使'])
    
    console.log('查询到的用户:', allUsers)
    
    // 2. 查看branch_code的实际值（包括长度和字符编码）
    const branchAnalysis = allUsers?.map(user => ({
      name: user.name,
      branch_code: user.branch_code,
      branch_code_length: user.branch_code?.length,
      branch_code_bytes: Buffer.from(user.branch_code || '').toString('hex'),
      branch_code_json: JSON.stringify(user.branch_code)
    }))
    
    // 3. 测试字符串比较
    const testComparisons = allUsers?.map(user => {
      const tests = {
        name: user.name,
        original: user.branch_code,
        equals_PU: user.branch_code === 'PU',
        equals_PU_trim: user.branch_code?.trim() === 'PU',
        equals_angel: user.branch_code === '小天使',
        equals_angel_trim: user.branch_code?.trim() === '小天使',
        toString_equals_PU: String(user.branch_code) === 'PU',
        toString_equals_angel: String(user.branch_code) === '小天使'
      }
      return tests
    })
    
    // 4. 获取有积分的用户
    const { data: scores } = await supabase
      .from('user_daily_scores')
      .select(`
        user_id,
        total_score,
        users!inner (
          name,
          branch_code
        )
      `)
      .in('users.branch_code', ['PU', '小天使'])
      .gt('total_score', 0)
    
    // 5. 分析积分数据中的branch_code
    const scoreAnalysis = scores?.map(score => ({
      name: score.users.name,
      branch_code: score.users.branch_code,
      total_score: score.total_score,
      branch_equals_PU: score.users.branch_code === 'PU',
      branch_equals_angel: score.users.branch_code === '小天使'
    }))
    
    return res.json({
      users_count: {
        PU: allUsers?.filter(u => u.branch_code === 'PU').length || 0,
        小天使: allUsers?.filter(u => u.branch_code === '小天使').length || 0
      },
      branch_analysis: branchAnalysis,
      test_comparisons: testComparisons,
      scores_count: {
        PU: scores?.filter(s => s.users.branch_code === 'PU').length || 0,
        小天使: scores?.filter(s => s.users.branch_code === '小天使').length || 0
      },
      score_analysis: scoreAnalysis,
      debug_info: {
        PU_string: JSON.stringify('PU'),
        angel_string: JSON.stringify('小天使'),
        PU_bytes: Buffer.from('PU').toString('hex'),
        angel_bytes: Buffer.from('小天使').toString('hex')
      }
    })
    
  } catch (error) {
    console.error('Debug错误:', error)
    return res.status(500).json({ error: error.message })
  }
}