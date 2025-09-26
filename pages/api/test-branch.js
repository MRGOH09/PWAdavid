import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. 获取所有分院的用户数量
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, branch_code, status')
      .neq('status', 'test')
    
    // 统计各分院人数
    const branchStats = {}
    allUsers?.forEach(user => {
      if (user.branch_code) {
        if (!branchStats[user.branch_code]) {
          branchStats[user.branch_code] = {
            branch_code: user.branch_code,
            total_users: 0,
            users: []
          }
        }
        branchStats[user.branch_code].total_users++
        branchStats[user.branch_code].users.push({
          id: user.id,
          name: user.name
        })
      }
    })

    // 2. 获取有积分记录的用户
    const { data: scoreUsers } = await supabase
      .from('user_daily_scores')
      .select('user_id')
      .gt('total_score', 0)
    
    const scoreUserIds = [...new Set(scoreUsers?.map(s => s.user_id) || [])]
    
    // 3. 获取有积分用户的分院信息
    const { data: usersWithScores } = await supabase
      .from('users')
      .select('id, name, branch_code')
      .in('id', scoreUserIds)
    
    // 统计有积分的分院用户
    const branchScoreStats = {}
    usersWithScores?.forEach(user => {
      if (user.branch_code) {
        if (!branchScoreStats[user.branch_code]) {
          branchScoreStats[user.branch_code] = {
            branch_code: user.branch_code,
            users_with_scores: 0,
            score_users: []
          }
        }
        branchScoreStats[user.branch_code].users_with_scores++
        branchScoreStats[user.branch_code].score_users.push({
          id: user.id,
          name: user.name
        })
      }
    })

    // 4. 特别检查PU和小天使分院
    const { data: puUsers } = await supabase
      .from('users')
      .select('id, name, branch_code, created_at')
      .eq('branch_code', 'PU')
      .neq('status', 'test')
    
    const { data: angelUsers } = await supabase
      .from('users')
      .select('id, name, branch_code, created_at')
      .eq('branch_code', '小天使')
      .neq('status', 'test')

    // 5. 检查当前用户的邮箱对应的分院
    const userEmail = req.headers['x-user-email']
    let currentUserInfo = null
    
    if (userEmail) {
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select(`
          user_id,
          email,
          users!inner (
            id,
            name,
            branch_code
          )
        `)
        .eq('email', userEmail)
        .single()
      
      currentUserInfo = userProfile
    }

    return res.json({
      branch_stats: branchStats,
      branch_score_stats: branchScoreStats,
      pu_branch: {
        total_users: puUsers?.length || 0,
        users: puUsers || []
      },
      angel_branch: {
        total_users: angelUsers?.length || 0,
        users: angelUsers || []
      },
      current_user: currentUserInfo,
      summary: {
        total_branches: Object.keys(branchStats).length,
        branches_with_scores: Object.keys(branchScoreStats).length,
        pu_in_stats: branchStats['PU'] ? 'YES' : 'NO',
        pu_in_score_stats: branchScoreStats['PU'] ? 'YES' : 'NO',
        angel_in_stats: branchStats['小天使'] ? 'YES' : 'NO',
        angel_in_score_stats: branchScoreStats['小天使'] ? 'YES' : 'NO'
      }
    })
    
  } catch (error) {
    console.error('测试分院API错误:', error)
    return res.status(500).json({ error: error.message })
  }
}