// Admin Users API - 安全的用户数据查看
import { createClient } from '@supabase/supabase-js'
import { hasValidAdminSession } from '../../../lib/admin-auth'
import { BRANCHES } from '../../../lib/branches.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
    || process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_ANON_KEY 
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (!hasValidAdminSession(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (req.method === 'GET') {
    return await handleGet(req, res)
  } else if (req.method === 'POST') {
    return await handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res) {
  try {
    const { action = 'list', branch, search, limit = 50 } = req.query

    if (action === 'branches') {
      // 获取所有分行列表
      return await getBranches(req, res)
    }

    console.log(`[Admin Users] 获取用户列表 - 分行: ${branch || '全部'}, 搜索: ${search || '无'}`)

    // 先获取所有字段看看表结构
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    // 按分行筛选
    if (branch && branch !== 'all') {
      query = query.eq('branch_code', branch)
    }

    // 如果有搜索关键词，添加搜索条件
    if (search && search.trim().length >= 2) {
      query = query.or(`email.ilike.%${search}%,id.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      throw error
    }

    // 为每个用户获取积分统计
    const usersWithStats = []
    
    for (const user of users || []) {
      // 获取用户积分统计
      const { data: scores } = await supabase
        .from('user_daily_scores')
        .select('total_score, current_streak, ymd')
        .eq('user_id', user.id)
        .order('ymd', { ascending: false })
        .limit(30)

      // 计算统计数据
      const totalScore = scores?.reduce((sum, s) => sum + (s.total_score || 0), 0) || 0
      const maxStreak = Math.max(...(scores?.map(s => s.current_streak || 0) || [0]))
      const recentActivity = scores?.[0]?.ymd || null
      const activeDays = scores?.length || 0

      usersWithStats.push({
        ...user,
        stats: {
          totalScore,
          maxStreak,
          recentActivity,
          activeDays
        }
      })
    }

    console.log(`[Admin Users] 找到 ${usersWithStats.length} 个用户`)

    res.status(200).json({
      users: usersWithStats,
      total: usersWithStats.length,
      filters: {
        branch: branch || 'all',
        search: search || null
      }
    })

  } catch (error) {
    console.error('[Admin Users] 错误:', error)
    res.status(500).json({ 
      error: '获取用户列表失败',
      details: error.message 
    })
  }
}

async function handlePost(req, res) {
  try {
    const { action, userId, newBranch } = req.body

    if (action === 'change-branch') {
      return await changeUserBranch(req, res, userId, newBranch)
    }

    return res.status(400).json({ error: 'Invalid action' })

  } catch (error) {
    console.error('[Admin Users] POST错误:', error)
    res.status(500).json({
      error: '操作失败',
      details: error.message
    })
  }
}

// 获取所有分行列表
async function getBranches(req, res) {
  try {
    console.log('[Admin Users] 获取分行列表')

    // 获取所有用户的分行信息
    const { data: allUsers } = await supabase
      .from('users')
      .select('branch_code')

    // 统计每个分行的用户数
    const branchStats = new Map()
    allUsers?.forEach(user => {
      const branch = user.branch_code || '未分配'
      branchStats.set(branch, (branchStats.get(branch) || 0) + 1)
    })

    // 构建分行列表：先给“全部分行”，再给固定清单中的所有分行（即使当前没有用户）
    const branchList = [
      { code: 'all', name: '全部分行', userCount: allUsers?.length || 0 }
    ]

    BRANCHES.forEach((code) => {
      branchList.push({
        code,
        name: code,
        userCount: branchStats.get(code) || 0
      })
    })

    // 添加未分配
    const unassignedCount = branchStats.get('未分配') || (allUsers?.filter(u => !u.branch_code).length || 0)
    if (unassignedCount > 0) {
      branchList.push({ code: 'null', name: '未分配', userCount: unassignedCount })
    }

    console.log(`[Admin Users] 找到 ${branchList.length} 个分行`)

    res.status(200).json({ branches: branchList })

  } catch (error) {
    console.error('[Admin Users] 获取分行列表失败:', error)
    res.status(500).json({
      error: '获取分行列表失败',
      details: error.message
    })
  }
}

// 修改用户分行
async function changeUserBranch(req, res, userId, newBranch) {
  try {
    console.log(`[Admin Users] 修改用户分行 - 用户ID: ${userId}, 新分行: ${newBranch}`)

    // 更新用户分行
    const { data, error } = await supabase
      .from('users')
      .update({ branch_code: newBranch === 'null' ? null : newBranch })
      .eq('id', userId)
      .select()

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: '用户不存在'
      })
    }

    console.log(`[Admin Users] 成功修改用户分行: ${userId} -> ${newBranch}`)

    res.status(200).json({
      success: true,
      message: '分行修改成功',
      user: data[0]
    })

  } catch (error) {
    console.error('[Admin Users] 修改用户分行失败:', error)
    res.status(500).json({
      error: '修改分行失败',
      details: error.message
    })
  }
}
