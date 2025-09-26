import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body

    switch (action) {
      case 'get_stats':
        return await getBranchStats(res)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[branch-stats] 错误:', error)
    return res.status(500).json({
      error: error.message || '操作失败'
    })
  }
}

async function getBranchStats(res) {
  console.log('[branch-stats] 获取分院统计数据')

  // 预设报名目标人数 - 不包含小天使
  const TARGET_REGISTRATIONS = {
    'BLS': 26,
    'BP': 29,
    'HQ': 25,
    'KK': 11,
    'M2': 19,
    'MTK': 29,
    'OTK': 10,
    'PDMR': 6,
    'PJY': 32,
    'PU': 21,
    'SRD': 11,
    'STL': 22,
    'TLK': 13,
    'UKT': 13,
    'VIVA': 21
    // 注意：小天使不在目标计算中
  }

  try {
    // 获取所有用户的分院统计
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('branch_code')
      .not('branch_code', 'is', null)

    if (usersError) {
      console.error('获取用户分院数据失败:', usersError)
      return res.status(500).json({ error: '获取数据失败' })
    }

    // 统计各分院人数
    const branchCounts = {}
    users.forEach(user => {
      const branch = user.branch_code || '未分配'
      branchCounts[branch] = (branchCounts[branch] || 0) + 1
    })

    // 计算目标相关统计
    const totalTarget = Object.values(TARGET_REGISTRATIONS).reduce((sum, target) => sum + target, 0)
    let totalActual = 0
    let targetBranchesActual = 0

    // 为每个分院计算统计数据
    const stats = Object.entries(branchCounts)
      .map(([branch_code, count]) => {
        const target = TARGET_REGISTRATIONS[branch_code] || null
        const isTargetBranch = target !== null
        
        if (isTargetBranch) {
          targetBranchesActual += count
        }
        totalActual += count

        return {
          branch_code,
          count,
          target,
          isTargetBranch,
          completion: target ? ((count / target) * 100).toFixed(1) : null
        }
      })
      .sort((a, b) => {
        // 优先显示目标分院，然后按人数排序
        if (a.isTargetBranch && !b.isTargetBranch) return -1
        if (!a.isTargetBranch && b.isTargetBranch) return 1
        return b.count - a.count
      })

    // 整体目标完成度
    const overallCompletion = ((targetBranchesActual / totalTarget) * 100).toFixed(1)
    const targetProgress = {
      totalTarget,
      targetBranchesActual,
      overallCompletion: parseFloat(overallCompletion),
      isTargetMet: parseFloat(overallCompletion) >= 80,
      remaining: Math.max(0, Math.ceil(totalTarget * 0.8) - targetBranchesActual)
    }

    console.log(`[branch-stats] 目标进度: ${targetBranchesActual}/${totalTarget} (${overallCompletion}%)`)
    console.log(`[branch-stats] 返回 ${stats.length} 个分院统计`, stats)

    return res.status(200).json({
      ok: true,
      stats: stats,
      total: totalActual,
      targetProgress: targetProgress,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[branch-stats] 统计计算失败:', error)
    return res.status(500).json({ 
      error: '统计计算失败',
      details: error.message 
    })
  }
}