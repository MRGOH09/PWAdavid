// Admin Data Export API - 数据导出工具
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
    const { format, type, filters } = req.body

    switch (format) {
      case 'csv':
        return await generateCSVReport(req, res, type, filters)
      case 'pdf':
        return await generatePDFReport(req, res, type, filters)
      case 'excel':
        return await generateExcelReport(req, res, type, filters)
      default:
        return res.status(400).json({ error: 'Invalid format' })
    }

  } catch (error) {
    console.error('[Admin Export] 错误:', error)
    res.status(500).json({ 
      error: '数据导出失败',
      details: error.message 
    })
  }
}

// PDF报告生成（临时禁用，需要修复导入问题）
async function generatePDFReport(req, res, type, filters) {
  console.log(`[Admin Export] PDF功能暂时禁用，正在修复中...`)
  
  return res.status(501).json({ 
    error: 'PDF导出功能正在维护中，请使用CSV格式',
    suggestion: '建议选择CSV格式进行数据导出'
  })
}

// 分院汇总PDF
async function generateBranchSummaryPDF(doc, filters) {
  doc.addPage()
  
  // 标题
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('分院积分汇总', 20, 30)

  // 获取分院数据
  const { data: users } = await supabase
    .from('users')
    .select('id, name, branch_code, status')
    .neq('status', 'test')

  const { data: scores } = await supabase
    .from('user_daily_scores')
    .select('user_id, total_score, current_streak, ymd')

  // 计算分院统计
  const branchStats = {}
  users?.forEach(user => {
    if (!branchStats[user.branch_code]) {
      branchStats[user.branch_code] = {
        name: user.branch_code,
        totalMembers: 0,
        activeMembers: 0,
        totalScore: 0,
        avgScore: 0,
        maxStreak: 0
      }
    }
    branchStats[user.branch_code].totalMembers++
  })

  // 计算积分和连续天数
  scores?.forEach(score => {
    const user = users?.find(u => u.id === score.user_id)
    if (user && branchStats[user.branch_code]) {
      branchStats[user.branch_code].totalScore += score.total_score
      branchStats[user.branch_code].maxStreak = Math.max(
        branchStats[user.branch_code].maxStreak, 
        score.current_streak || 0
      )
    }
  })

  // 计算平均分和活跃成员
  Object.values(branchStats).forEach(branch => {
    branch.avgScore = branch.totalMembers > 0 ? 
      Math.round(branch.totalScore / branch.totalMembers * 100) / 100 : 0
    branch.activeMembers = branch.totalMembers // 简化处理
  })

  // 生成表格数据
  const tableData = Object.values(branchStats)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((branch, index) => [
      index + 1,
      branch.name,
      branch.totalMembers,
      branch.activeMembers,
      branch.totalScore,
      branch.avgScore,
      branch.maxStreak
    ])

  // 绘制表格
  doc.autoTable({
    startY: 40,
    head: [['排名', '分院', '总人数', '活跃人数', '总积分', '平均积分', '最高连续天数']],
    body: tableData,
    theme: 'striped',
    styles: { 
      font: 'NotoSans',
      fontSize: 9
    },
    headStyles: {
      fillColor: [31, 81, 255],
      textColor: [255, 255, 255]
    }
  })

  // 添加汇总信息
  const totalUsers = Object.values(branchStats).reduce((sum, b) => sum + b.totalMembers, 0)
  const totalScore = Object.values(branchStats).reduce((sum, b) => sum + b.totalScore, 0)
  const totalBranches = Object.keys(branchStats).length

  doc.setFontSize(10)
  doc.text(`汇总信息：`, 20, doc.lastAutoTable.finalY + 20)
  doc.text(`• 分院总数：${totalBranches} 个`, 25, doc.lastAutoTable.finalY + 30)
  doc.text(`• 用户总数：${totalUsers} 人`, 25, doc.lastAutoTable.finalY + 40)
  doc.text(`• 总积分：${totalScore} 分`, 25, doc.lastAutoTable.finalY + 50)
  doc.text(`• 平均每人积分：${Math.round(totalScore / totalUsers * 100) / 100} 分`, 25, doc.lastAutoTable.finalY + 60)
}

// 用户详情PDF
async function generateUserDetailsPDF(doc, filters) {
  doc.addPage()
  
  doc.setFontSize(16)
  doc.text('用户积分详情', 20, 30)

  // 获取用户数据
  let query = supabase
    .from('users')
    .select(`
      id, name, branch_code, status, created_at,
      user_daily_scores (total_score, current_streak, ymd)
    `)
    .neq('status', 'test')
    .order('created_at')

  if (filters?.branch && filters.branch !== 'all') {
    query = query.eq('branch_code', filters.branch)
  }

  const { data: users } = await query

  // 生成用户表格
  const userData = users?.slice(0, 50).map(user => { // 限制50个用户避免页面过长
    const totalScore = user.user_daily_scores?.reduce((sum, s) => sum + s.total_score, 0) || 0
    const maxStreak = Math.max(...(user.user_daily_scores?.map(s => s.current_streak) || [0]))
    const activeDays = user.user_daily_scores?.length || 0

    return [
      user.name,
      user.branch_code,
      totalScore,
      activeDays,
      maxStreak,
      new Date(user.created_at).toLocaleDateString('zh-CN')
    ]
  }) || []

  doc.autoTable({
    startY: 40,
    head: [['姓名', '分院', '总积分', '活跃天数', '最高连续', '加入时间']],
    body: userData,
    theme: 'striped',
    styles: { 
      font: 'NotoSans',
      fontSize: 8
    },
    headStyles: {
      fillColor: [31, 81, 255],
      textColor: [255, 255, 255]
    }
  })

  if (users && users.length > 50) {
    doc.text(`注：显示前50名用户，总共${users.length}名用户`, 20, doc.lastAutoTable.finalY + 10)
  }
}

// 积分分析PDF
async function generateScoreAnalysisPDF(doc, filters) {
  doc.addPage()
  
  doc.setFontSize(16)
  doc.text('积分分析报告', 20, 30)

  // 获取积分趋势数据
  const { data: scores } = await supabase
    .from('user_daily_scores')
    .select('ymd, total_score, base_score, streak_score, bonus_score')
    .order('ymd')

  if (!scores || scores.length === 0) {
    doc.text('暂无积分数据', 20, 50)
    return
  }

  // 按日期汇总
  const dailyStats = {}
  scores.forEach(score => {
    if (!dailyStats[score.ymd]) {
      dailyStats[score.ymd] = {
        totalUsers: 0,
        totalScore: 0,
        baseScore: 0,
        streakScore: 0,
        bonusScore: 0
      }
    }
    dailyStats[score.ymd].totalUsers++
    dailyStats[score.ymd].totalScore += score.total_score
    dailyStats[score.ymd].baseScore += score.base_score
    dailyStats[score.ymd].streakScore += score.streak_score || 0
    dailyStats[score.ymd].bonusScore += score.bonus_score || 0
  })

  // 取最近30天数据
  const recentData = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .reverse()

  const tableData = recentData.map(([date, stats]) => [
    date,
    stats.totalUsers,
    stats.totalScore,
    Math.round(stats.totalScore / stats.totalUsers * 100) / 100,
    stats.baseScore,
    stats.streakScore,
    stats.bonusScore
  ])

  doc.autoTable({
    startY: 40,
    head: [['日期', '活跃用户', '总积分', '平均积分', '基础分', '连续分', '奖励分']],
    body: tableData,
    theme: 'striped',
    styles: { 
      font: 'NotoSans',
      fontSize: 8
    },
    headStyles: {
      fillColor: [31, 81, 255],
      textColor: [255, 255, 255]
    }
  })

  // 添加统计摘要
  const totalDays = recentData.length
  const avgUsers = Math.round(recentData.reduce((sum, [, stats]) => sum + stats.totalUsers, 0) / totalDays)
  const avgDailyScore = Math.round(recentData.reduce((sum, [, stats]) => sum + stats.totalScore, 0) / totalDays)

  doc.setFontSize(10)
  doc.text(`最近${totalDays}天统计：`, 20, doc.lastAutoTable.finalY + 20)
  doc.text(`• 日均活跃用户：${avgUsers} 人`, 25, doc.lastAutoTable.finalY + 30)
  doc.text(`• 日均总积分：${avgDailyScore} 分`, 25, doc.lastAutoTable.finalY + 40)
  doc.text(`• 单用户日均积分：${Math.round(avgDailyScore / avgUsers * 100) / 100} 分`, 25, doc.lastAutoTable.finalY + 50)
}

// Excel报告生成（临时禁用，需要修复导入问题）
async function generateExcelReport(req, res, type, filters) {
  console.log(`[Admin Export] Excel功能暂时禁用，正在修复中...`)
  
  return res.status(501).json({ 
    error: 'Excel导出功能正在维护中，请使用CSV格式',
    suggestion: '建议选择CSV格式进行数据导出'
  })

  // 获取基础数据
  const { data: users } = await supabase
    .from('users')
    .select('id, name, branch_code, status, created_at')
    .neq('status', 'test')

  const { data: scores } = await supabase
    .from('user_daily_scores')
    .select('user_id, total_score, base_score, streak_score, bonus_score, current_streak, ymd')

  // 根据类型生成不同工作表
  switch (type) {
    case 'branch-summary':
      await createBranchSummarySheet(workbook, users, scores)
      break
    case 'user-details':
      await createUserDetailsSheet(workbook, users, scores, filters)
      break
    case 'score-analysis':
      await createScoreAnalysisSheet(workbook, scores)
      break
    default:
      await createComprehensiveSheet(workbook, users, scores)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="LEARNER_CLUB_数据_${type}_${new Date().toISOString().slice(0, 10)}.xlsx"`)
  res.send(buffer)
}

// 创建分院汇总工作表
async function createBranchSummarySheet(workbook, users, scores) {
  const sheet = workbook.addWorksheet('分院汇总')
  
  // 设置列宽
  sheet.columns = [
    { header: '排名', key: 'rank', width: 8 },
    { header: '分院', key: 'branch', width: 15 },
    { header: '总人数', key: 'totalMembers', width: 12 },
    { header: '活跃人数', key: 'activeMembers', width: 12 },
    { header: '总积分', key: 'totalScore', width: 12 },
    { header: '平均积分', key: 'avgScore', width: 12 },
    { header: '最高连续天数', key: 'maxStreak', width: 15 }
  ]

  // 设置标题样式
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F51FF' } }

  // 计算分院统计
  const branchStats = {}
  users?.forEach(user => {
    if (!branchStats[user.branch_code]) {
      branchStats[user.branch_code] = {
        branch: user.branch_code,
        totalMembers: 0,
        activeMembers: 0,
        totalScore: 0,
        avgScore: 0,
        maxStreak: 0
      }
    }
    branchStats[user.branch_code].totalMembers++
  })

  scores?.forEach(score => {
    const user = users?.find(u => u.id === score.user_id)
    if (user && branchStats[user.branch_code]) {
      branchStats[user.branch_code].totalScore += score.total_score
      branchStats[user.branch_code].maxStreak = Math.max(
        branchStats[user.branch_code].maxStreak, 
        score.current_streak || 0
      )
    }
  })

  // 计算平均分
  Object.values(branchStats).forEach(branch => {
    branch.avgScore = branch.totalMembers > 0 ? 
      Math.round(branch.totalScore / branch.totalMembers * 100) / 100 : 0
    branch.activeMembers = branch.totalMembers
  })

  // 添加数据
  const sortedBranches = Object.values(branchStats)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((branch, index) => ({
      rank: index + 1,
      ...branch
    }))

  sheet.addRows(sortedBranches)
  
  // 添加汇总行
  const totalUsers = Object.values(branchStats).reduce((sum, b) => sum + b.totalMembers, 0)
  const totalScore = Object.values(branchStats).reduce((sum, b) => sum + b.totalScore, 0)
  
  sheet.addRow({})
  sheet.addRow({
    rank: '汇总',
    branch: `${Object.keys(branchStats).length} 个分院`,
    totalMembers: totalUsers,
    activeMembers: totalUsers,
    totalScore: totalScore,
    avgScore: Math.round(totalScore / totalUsers * 100) / 100,
    maxStreak: Math.max(...Object.values(branchStats).map(b => b.maxStreak))
  })

  const lastRow = sheet.lastRow
  lastRow.font = { bold: true }
  lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
}

// 创建用户详情工作表
async function createUserDetailsSheet(workbook, users, scores, filters) {
  let filteredUsers = users
  if (filters?.branch && filters.branch !== 'all') {
    filteredUsers = users?.filter(u => u.branch_code === filters.branch)
  }

  const sheet = workbook.addWorksheet('用户详情')
  
  sheet.columns = [
    { header: '姓名', key: 'name', width: 15 },
    { header: '分院', key: 'branch', width: 15 },
    { header: '总积分', key: 'totalScore', width: 12 },
    { header: '活跃天数', key: 'activeDays', width: 12 },
    { header: '最高连续', key: 'maxStreak', width: 12 },
    { header: '基础积分', key: 'baseScore', width: 12 },
    { header: '连续积分', key: 'streakScore', width: 12 },
    { header: '奖励积分', key: 'bonusScore', width: 12 },
    { header: '加入时间', key: 'joinDate', width: 15 }
  ]

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F51FF' } }

  const userData = filteredUsers?.map(user => {
    const userScores = scores?.filter(s => s.user_id === user.id) || []
    return {
      name: user.name,
      branch: user.branch_code,
      totalScore: userScores.reduce((sum, s) => sum + s.total_score, 0),
      activeDays: userScores.length,
      maxStreak: Math.max(...userScores.map(s => s.current_streak), 0),
      baseScore: userScores.reduce((sum, s) => sum + s.base_score, 0),
      streakScore: userScores.reduce((sum, s) => sum + (s.streak_score || 0), 0),
      bonusScore: userScores.reduce((sum, s) => sum + (s.bonus_score || 0), 0),
      joinDate: new Date(user.created_at).toLocaleDateString('zh-CN')
    }
  }) || []

  sheet.addRows(userData)
}

// 创建积分分析工作表
async function createScoreAnalysisSheet(workbook, scores) {
  const sheet = workbook.addWorksheet('积分分析')
  
  // 按日期汇总
  const dailyStats = {}
  scores?.forEach(score => {
    if (!dailyStats[score.ymd]) {
      dailyStats[score.ymd] = {
        date: score.ymd,
        totalUsers: 0,
        totalScore: 0,
        baseScore: 0,
        streakScore: 0,
        bonusScore: 0
      }
    }
    dailyStats[score.ymd].totalUsers++
    dailyStats[score.ymd].totalScore += score.total_score
    dailyStats[score.ymd].baseScore += score.base_score
    dailyStats[score.ymd].streakScore += score.streak_score || 0
    dailyStats[score.ymd].bonusScore += score.bonus_score || 0
  })

  sheet.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '活跃用户', key: 'totalUsers', width: 12 },
    { header: '总积分', key: 'totalScore', width: 12 },
    { header: '平均积分', key: 'avgScore', width: 12 },
    { header: '基础分', key: 'baseScore', width: 12 },
    { header: '连续分', key: 'streakScore', width: 12 },
    { header: '奖励分', key: 'bonusScore', width: 12 }
  ]

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F51FF' } }

  const analysisData = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .reverse()
    .map(([date, stats]) => ({
      ...stats,
      avgScore: Math.round(stats.totalScore / stats.totalUsers * 100) / 100
    }))

  sheet.addRows(analysisData)
}

// 创建综合工作表
async function createComprehensiveSheet(workbook, users, scores) {
  // 创建多个工作表
  await createBranchSummarySheet(workbook, users, scores)
  await createUserDetailsSheet(workbook, users, scores, {})
  await createScoreAnalysisSheet(workbook, scores)
}

// CSV报告生成
async function generateCSVReport(req, res, type, filters) {
  console.log(`[Admin Export] 生成CSV报告: ${type}`)

  // 获取基础数据
  const { data: users } = await supabase
    .from('users')
    .select('id, name, branch_code, status, created_at')
    .neq('status', 'test')

  const { data: scores } = await supabase
    .from('user_daily_scores')
    .select('user_id, total_score, base_score, streak_score, bonus_score, current_streak, ymd')

  let csvContent = '\uFEFF' // BOM for UTF-8
  
  switch (type) {
    case 'branch-summary':
      csvContent += generateBranchSummaryCSV(users, scores)
      break
    case 'user-details':
      csvContent += generateUserDetailsCSV(users, scores, filters)
      break
    case 'score-analysis':
      csvContent += generateScoreAnalysisCSV(scores)
      break
    default:
      csvContent += generateComprehensiveCSV(users, scores)
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="LEARNER_CLUB_数据_${type}_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csvContent)
}

// 生成分院汇总CSV
function generateBranchSummaryCSV(users, scores) {
  let csv = '排名,分院,总人数,活跃人数,总积分,平均积分,最高连续天数\n'
  
  // 计算分院统计
  const branchStats = {}
  users?.forEach(user => {
    if (!branchStats[user.branch_code]) {
      branchStats[user.branch_code] = {
        branch: user.branch_code,
        totalMembers: 0,
        totalScore: 0,
        maxStreak: 0
      }
    }
    branchStats[user.branch_code].totalMembers++
  })

  scores?.forEach(score => {
    const user = users?.find(u => u.id === score.user_id)
    if (user && branchStats[user.branch_code]) {
      branchStats[user.branch_code].totalScore += score.total_score
      branchStats[user.branch_code].maxStreak = Math.max(
        branchStats[user.branch_code].maxStreak, 
        score.current_streak || 0
      )
    }
  })

  // 生成CSV行
  const sortedBranches = Object.values(branchStats)
    .sort((a, b) => b.totalScore - a.totalScore)

  sortedBranches.forEach((branch, index) => {
    const avgScore = branch.totalMembers > 0 ? 
      Math.round(branch.totalScore / branch.totalMembers * 100) / 100 : 0
    
    csv += `${index + 1},${branch.branch},${branch.totalMembers},${branch.totalMembers},${branch.totalScore},${avgScore},${branch.maxStreak}\n`
  })

  return csv
}

// 生成用户详情CSV
function generateUserDetailsCSV(users, scores, filters) {
  let filteredUsers = users
  if (filters?.branch && filters.branch !== 'all') {
    filteredUsers = users?.filter(u => u.branch_code === filters.branch)
  }

  let csv = '姓名,分院,总积分,活跃天数,最高连续,基础积分,连续积分,奖励积分,加入时间\n'
  
  filteredUsers?.forEach(user => {
    const userScores = scores?.filter(s => s.user_id === user.id) || []
    const totalScore = userScores.reduce((sum, s) => sum + s.total_score, 0)
    const activeDays = userScores.length
    const maxStreak = Math.max(...userScores.map(s => s.current_streak), 0)
    const baseScore = userScores.reduce((sum, s) => sum + s.base_score, 0)
    const streakScore = userScores.reduce((sum, s) => sum + (s.streak_score || 0), 0)
    const bonusScore = userScores.reduce((sum, s) => sum + (s.bonus_score || 0), 0)
    const joinDate = new Date(user.created_at).toLocaleDateString('zh-CN')

    csv += `${user.name},${user.branch_code},${totalScore},${activeDays},${maxStreak},${baseScore},${streakScore},${bonusScore},${joinDate}\n`
  })

  return csv
}

// 生成积分分析CSV
function generateScoreAnalysisCSV(scores) {
  let csv = '日期,活跃用户,总积分,平均积分,基础分,连续分,奖励分\n'
  
  // 按日期汇总
  const dailyStats = {}
  scores?.forEach(score => {
    if (!dailyStats[score.ymd]) {
      dailyStats[score.ymd] = {
        totalUsers: 0,
        totalScore: 0,
        baseScore: 0,
        streakScore: 0,
        bonusScore: 0
      }
    }
    dailyStats[score.ymd].totalUsers++
    dailyStats[score.ymd].totalScore += score.total_score
    dailyStats[score.ymd].baseScore += score.base_score
    dailyStats[score.ymd].streakScore += score.streak_score || 0
    dailyStats[score.ymd].bonusScore += score.bonus_score || 0
  })

  // 生成CSV行
  Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .reverse()
    .forEach(([date, stats]) => {
      const avgScore = Math.round(stats.totalScore / stats.totalUsers * 100) / 100
      csv += `${date},${stats.totalUsers},${stats.totalScore},${avgScore},${stats.baseScore},${stats.streakScore},${stats.bonusScore}\n`
    })

  return csv
}

// 生成综合CSV
function generateComprehensiveCSV(users, scores) {
  let csv = '# LEARNER CLUB 综合数据报告\n'
  csv += `# 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`
  
  csv += '## 分院汇总\n'
  csv += generateBranchSummaryCSV(users, scores)
  
  csv += '\n## 用户详情\n'
  csv += generateUserDetailsCSV(users, scores, {})
  
  csv += '\n## 积分分析\n'
  csv += generateScoreAnalysisCSV(scores)
  
  return csv
}