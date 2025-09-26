import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    // 1. 查询部分用户的分院信息（不限定代码）
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, branch_code')
      .neq('status', 'test')
      .limit(100)
    
    console.log('查询到的用户:', allUsers)
    
    // 2. 查看branch_code的实际值（包括长度和字符编码）
    const branchAnalysis = allUsers?.map(user => ({
      name: user.name,
      branch_code: user.branch_code,
      branch_code_length: user.branch_code?.length,
      branch_code_bytes: Buffer.from(user.branch_code || '').toString('hex'),
      branch_code_json: JSON.stringify(user.branch_code)
    }))
    
    // 3. 字符串比较样例（不针对特定代码）
    const testComparisons = allUsers?.map(user => ({
      name: user.name,
      original: user.branch_code,
      equals_trimmed: user.branch_code === user.branch_code?.trim(),
    }))
    
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
      users_count: Object.entries((allUsers||[]).reduce((acc,u)=>{acc[u.branch_code||'未分配']=(acc[u.branch_code||'未分配']||0)+1;return acc},{})).slice(0,10),
      branch_analysis: branchAnalysis,
      test_comparisons: testComparisons,
      scores_count: Object.entries((scores||[]).reduce((acc,s)=>{const b=s.users.branch_code||'未分配';acc[b]=(acc[b]||0)+1;return acc},{ })),
      score_analysis: scoreAnalysis,
      debug_info: {}
    })
    
  } catch (error) {
    console.error('Debug错误:', error)
    return res.status(500).json({ error: error.message })
  }
}
