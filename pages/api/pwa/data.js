import { createClient } from '@supabase/supabase-js'
import { formatYMD, getYYYYMM, getEndOfMonth } from '../../../lib/auth'

// 分院代码到名称的映射（保持原始代码）
import { BRANCHES, BRANCH_MAP } from '../../../lib/branches.js'
const BRANCH_NAMES = BRANCH_MAP

// KISS: 使用Vercel-Supabase集成环境变量
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  // Prefer service key; fall back to any available anon key
  process.env.SUPABASE_SERVICE_KEY 
    || process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_SERVICE_ROLE 
    || process.env.SUPABASE_SERVICE 
    || process.env.SUPABASE_ANON_KEY 
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 创建或更新月度自动记录（幂等操作）
async function createMonthlyAutoRecords(userId, profile) {
  const today = new Date()
  const ymd = `${today.toISOString().slice(0,7)}-01` // 月初
  
  const autoRecords = [
    { 
      group: 'B', 
      code: 'travel_auto', 
      amount: profile?.travel_budget_annual ? Math.round((profile.travel_budget_annual / 12) * 100) / 100 : 0 
    },
    { 
      group: 'C', 
      code: 'ins_med_auto', 
      amount: profile?.annual_medical_insurance ? Math.round((profile.annual_medical_insurance / 12) * 100) / 100 : 0 
    },
    { 
      group: 'C', 
      code: 'ins_car_auto', 
      amount: profile?.annual_car_insurance ? Math.round((profile.annual_car_insurance / 12) * 100) / 100 : 0 
    }
  ].filter(r => r.amount > 0)
  
  for (const record of autoRecords) {
    try {
      // 先尝试更新（大多数情况下记录已存在）
      const { data: updated, error: updateErr } = await supabase
        .from('records')
        .update({ amount: record.amount, is_voided: false, note: 'Auto-generated monthly' })
        .eq('user_id', userId)
        .eq('ymd', ymd)
        .eq('category_code', record.code)
        .select('id')

      if (!updateErr && updated && updated.length > 0) {
        console.log(`[createMonthlyAutoRecords] 更新自动记录: ${record.code} = ${record.amount}`)
        continue
      }

      // 不存在则插入；若唯一索引冲突，转为更新
      const { error: insertErr } = await supabase.from('records').insert([{
        user_id: userId,
        category_group: record.group,
        category_code: record.code,
        amount: record.amount,
        note: 'Auto-generated monthly',
        ymd
      }])

      if (insertErr) {
        // 23505 = unique_violation（由我们建议的唯一索引保护）
        if (insertErr.code === '23505') {
          await supabase
            .from('records')
            .update({ amount: record.amount, is_voided: false })
            .eq('user_id', userId)
            .eq('ymd', ymd)
            .eq('category_code', record.code)
          console.log(`[createMonthlyAutoRecords] 冲突后更新: ${record.code} = ${record.amount}`)
        } else {
          console.warn('[createMonthlyAutoRecords] 插入失败:', insertErr)
        }
      } else {
        console.log(`[createMonthlyAutoRecords] 创建自动记录: ${record.code} = ${record.amount}`)
      }
    } catch (e) {
      console.error('[createMonthlyAutoRecords] 异常:', e)
    }
  }
}

export default async function handler(req, res) {
  console.log(`[PWA Data API] 收到请求: ${req.method} ${req.url}`)
  console.log(`[PWA Data API] Headers:`, Object.keys(req.headers))
  
  try {
    // CORS和缓存控制处理
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma, Authorization')
    
    // 强制无缓存 - 特别针对Safari PWA
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Last-Modified', new Date().toUTCString())
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }
    
    // 允许 GET 作为兼容：通过 query.action 支持只读查询
    const isPost = req.method === 'POST'
    const isGet = req.method === 'GET'
    if (!isPost && !isGet) {
      return res.status(405).json({ error: 'Method not allowed' })
    }
    
    // KISS: Supabase原生认证验证
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: '请先登录'
      })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: '认证失败'
      })
    }
    
    console.log(`[PWA Data] 认证用户: ${user.id} (${user.email})`)
    
    // 获取用户在数据库中的信息
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select(`
        user_id,
        email,
        display_name,
        users!inner (
          id,
          name,
          branch_code,
          status
        )
      `)
      .eq('email', user.email)
      .single()
      
    if (profileError) {
      console.error('[PWA Data] 用户资料查询失败:', profileError)
      return res.status(404).json({ 
        error: 'User not found',
        message: '用户资料不存在'
      })
    }
    
    const dbUser = {
      id: userProfile.users.id,
      email: userProfile.email,
      name: userProfile.users.name,
      branch_code: userProfile.users.branch_code
    }
    
    console.log(`[PWA Data] 用户信息: id=${dbUser.id}, name=${dbUser.name}, branch_code=${dbUser.branch_code}`)
    
    let { action, ...params } = isPost ? req.body : { action: req.query.action || 'dashboard', ...req.query }

    // 兼容旧的预取/预加载动作名称
    const originalAction = action
    const actionMap = {
      'getDashboard': 'dashboard',
      'getProfile': 'profile',
      'getRecentRecords': 'history'
    }
    action = actionMap[action] || action
    // 对于 getRecentRecords 预取，提供默认分页
    if (originalAction === 'getRecentRecords') {
      if (!params.limit) params.limit = 10
      if (!params.offset) params.offset = 0
    }
    console.log(`[PWA Data] 收到body:`, req.body)
    console.log(`[PWA Data] 处理请求: action=${action}, user=${dbUser.id}`)
    
    switch (action) {
      case 'dashboard':
        return await getDashboardData(dbUser.id, res)
        
      case 'profile':
        return await getProfileData(dbUser.id, res)
        
      case 'update-profile':
        return await updateProfileData(dbUser.id, params, res)
        
      case 'history':
        return await getHistoryData(dbUser.id, params, res)
        
      case 'check-auth':
        return res.json({ authenticated: true, user: { id: dbUser.id, name: dbUser.name, branch: dbUser.branch_code } })
        
      case 'subscribe-push':
        return await subscribePushNotification(dbUser.id, params, res)
        
      case 'unsubscribe-push':
        return await unsubscribePushNotification(dbUser.id, res)
        
      case 'test-push-notification':
        return await sendTestPushNotification(dbUser.id, res)
        
      case 'verify-subscription':
        return await verifyPushSubscription(dbUser.id, res)
        
      case 'add-record':
        return await addRecordPWA(dbUser.id, params, res)
        
      case 'batch-add-records':
        return await batchAddRecords(dbUser.id, params, res)
        
      case 'delete-record':
        return await deleteRecord(dbUser.id, params, res)
        
      case 'update-record':
        return await updateRecord(dbUser.id, params, res)
        
      // 🚀 原生PWA-Google数据库操作 - 不调用主系统
      case 'delete-record-native':
        return await deleteRecordNative(dbUser.id, params, res)
        
      case 'update-record-native':
        return await updateRecordNative(dbUser.id, params, res)
        
      case 'checkin':
        return await simpleCheckIn(dbUser.id, res)
        
      case 'check-checkin-status':
        return await checkCheckInStatus(dbUser.id, res)
        
      case 'leaderboard':
        return await getLeaderboardData(dbUser.id, dbUser.branch_code, res)
        
      case 'scores':
        return await getScoresData(dbUser.id, res)
        
      // 管理员连续天数管理功能
      case 'admin-streak-data':
        return await getAdminStreakData(res)
        
      case 'analyze-streaks':
        return await analyzeStreaks(res)
        
      case 'fix-all-streaks':
        return await fixAllStreaks(params.userIds, res)
        
      case 'fix-user-streak':
        return await fixUserStreak(params.userId, res)
        
      case 'adjust-streak':
        return await adjustUserStreak(params.userId, params.newStreak, params.reason, res)
        
      // 分院管理功能
      case 'branch-list':
        return await getBranchList(res)
        
      case 'add-branch':
        return await addBranch(params.name, params.code, params.description, res)
        
      case 'update-branch':
        return await updateBranch(params.branchId, params.name, params.description, res)
        
      case 'delete-branch':
        return await deleteBranch(params.branchId, res)
        
      // 用户管理功能
      case 'delete-user':
        return await deleteUser(params.userId, params.reason, params.adminUser, res)
        
      // 新的分院管理功能
      case 'get-all-branches':
        return await getAllBranches(res)
        
      case 'get-branch-users':
        return await getBranchUsers(params.branchCode, res)
        
      case 'change-user-branch':
        return await changeUserBranch(params.userId, params.newBranchCode, res)
        
      case 'branch-detail':
        return await getBranchDetail(params.branch, params.authKey, res)
        
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('[PWA Data] API错误:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// 获取仪表板数据
async function getDashboardData(userId, res) {
  try {
    console.log(`[getDashboardData] 获取用户 ${userId} 的仪表板数据`)
    
    // 获取用户资料
    const { data: profile } = await supabase
      .from('user_profile')
      .select('display_name, monthly_income, a_pct, travel_budget_annual, annual_medical_insurance, annual_car_insurance, current_streak, total_records')
      .eq('user_id', userId)
      .single()
    
    // 确保当月的自动记录存在
    if (profile) {
      await createMonthlyAutoRecords(userId, profile)
    }
      
    // 获取用户分行
    const { data: user } = await supabase
      .from('users')
      .select('branch_code')
      .eq('id', userId)
      .single()
      
    console.log(`[getDashboardData] 用户资料:`, { profile, user })
      
    // 获取当月预算
    const yyyymm = getYYYYMM()
    const { data: budget } = await supabase
      .from('user_month_budget')
      .select('*')
      .eq('user_id', userId)
      .eq('yyyymm', yyyymm)
      .maybeSingle()
      
    console.log(`[getDashboardData] 当月预算:`, budget)
      
    // 获取当月支出统计（包含详细分类）
    const startOfMonth = `${yyyymm}-01`
    const endOfMonth = getEndOfMonth(yyyymm)
    
    const { data: records } = await supabase
      .from('records')
      .select('category_group, category_code, amount, ymd')
      .eq('user_id', userId)
      .gte('ymd', startOfMonth)
      .lte('ymd', endOfMonth)
      .eq('is_voided', false)
      
    console.log(`[getDashboardData] 当月记录数: ${records?.length || 0}`)
      
    // 使用与 /my 命令完全相同的计算逻辑
    const groupStats = {
      A: { total: 0, count: 0 }, // 开销
      B: { total: 0, count: 0 }, // 学习  
      C: { total: 0, count: 0 }  // 储蓄
    }
    const categoryDetails = {}
    const recordDays = new Set()
    
    records?.forEach(record => {
      const amount = Number(record.amount || 0)  // 使用原始值，不取绝对值
      const group = record.category_group
      const code = record.category_code
      
      // 汇总分组支出（与/my命令一致）
      if (groupStats[group]) {
        groupStats[group].total += amount
        groupStats[group].count += 1
      }
      
      // 详细分类统计（使用绝对值用于显示）
      if (!categoryDetails[group]) {
        categoryDetails[group] = {}
      }
      categoryDetails[group][code] = (categoryDetails[group][code] || 0) + Math.abs(amount)
      
      // 记录天数统计
      recordDays.add(record.ymd)
    })
    
    // 注意：自动记录已通过createMonthlyAutoRecords()创建在数据库中
    // 数据库查询已经包含了travel_auto, ins_med_auto, ins_car_auto记录
    // 因此不需要手动添加到categoryDetails或groupStats
    
    // 按 /my 命令逻辑计算最终金额
    const income = budget?.income || profile?.monthly_income || 0
    
    // A类：开销（直接使用统计值）
    const aTotal = groupStats.A.total
    
    // B类：学习 = B类记录总和（已包含travel_auto自动记录）
    // 不需要手动添加旅游基金，因为createMonthlyAutoRecords已经创建了travel_auto记录
    const bTotal = Math.round(groupStats.B.total * 100) / 100
    
    // 计算年度保险的月度分摊
    const medicalMonthly = Math.round((profile?.annual_medical_insurance || 0) / 12 * 100) / 100
    const carMonthly = Math.round((profile?.annual_car_insurance || 0) / 12 * 100) / 100
    
    // C类：储蓄 = C类记录 + 保险月度分摊 + 余额
    // 先计算C类实际记录总额（包括ins_med_auto和ins_car_auto）
    const cRecords = groupStats.C.total
    
    // C类总额 = 收入 - A类 - B类
    const cTotal = Math.round((income - aTotal - bTotal) * 100) / 100
    
    // 最终支出结构
    const expenses = {
      A: aTotal,
      B: bTotal, 
      C: cTotal
    }
    
    // 计算占比（与/my命令一致）
    const percentages = {
      A: income > 0 ? Math.round((aTotal / income) * 100) : 0,
      B: income > 0 ? Math.round((bTotal / income) * 100) : 0,
      C: income > 0 ? Math.round((cTotal / income) * 100) : 0
    }
    
    const totalExpenses = aTotal + bTotal + cTotal
    
    // 记录统计
    const recordStats = {
      total_records: records?.length || 0,
      record_days: recordDays.size,
      avg_per_day: recordDays.size > 0 ? Math.round((records?.length || 0) / recordDays.size * 10) / 10 : 0
    }
    
    // 获取最近记录
    const { data: recentRecords } = await supabase
      .from('records')
      .select('id, category_group, category_code, amount, note, ymd, created_at')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`[getDashboardData] 最近记录数: ${recentRecords?.length || 0}`)
    
    // 计算本月剩余天数
    const now = new Date()
    const endOfMonthDate = new Date(endOfMonth)
    const daysLeft = Math.max(0, Math.ceil((endOfMonthDate - now) / (1000 * 60 * 60 * 24)))
    
    // 计算今日支出（仅A类开销）
    const today = formatYMD(now)
    const todayRecords = records?.filter(r => r.ymd === today && r.category_group === 'A') || []
    const todaySpent = todayRecords.reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0)
    
    // 计算本周支出（仅A类开销）- 从周一开始计算
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // 获取本周一
    const mondayStr = formatYMD(monday)
    const weekRecords = records?.filter(r => r.ymd >= mondayStr && r.ymd <= today && r.category_group === 'A') || []
    const weekSpent = weekRecords.reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0)
    
    const response = {
      user: {
        name: profile?.display_name || 'User',
        branch: user?.branch_code || '未设置'
      },
      monthly: {
        income: income,
        spent_a: expenses.A,
        spent_b: expenses.B,
        spent_c: expenses.C,
        percentage_a: percentages.A,
        percentage_b: percentages.B,
        percentage_c: percentages.C,
        days_left: daysLeft,
        today_spent: todaySpent,
        week_spent: weekSpent,
        budget_a: budget?.cap_a_amount || ((profile?.monthly_income || 0) * (profile?.a_pct || 0) / 100),
        budget_b: budget?.cap_b_amount || ((profile?.monthly_income || 0) * (profile?.b_pct || 0) / 100),
        budget_c: budget?.cap_c_amount || ((profile?.monthly_income || 0) * (profile?.c_pct || 0) / 100),
        remaining_a: Math.max(0, (budget?.cap_a_amount || ((profile?.monthly_income || 0) * (profile?.a_pct || 0) / 100)) - expenses.A),
        total_expenses: totalExpenses
      },
      stats: {
        current_streak: profile?.current_streak || 0,
        total_records: profile?.total_records || 0,
        monthly_records: recordStats.total_records,
        record_days: recordStats.record_days,
        avg_per_day: recordStats.avg_per_day
      },
      categoryDetails: categoryDetails,
      budget_details: {
        epf: budget?.epf_amount || (income * 0.24),
        travel_annual: profile?.travel_budget_annual || 0,
        travel_monthly: (profile?.travel_budget_annual || 0) / 12
      },
      recent: recentRecords?.map(record => ({
        id: record.id,
        category: record.category_code,
        group: record.category_group,
        amount: record.amount,
        note: record.note,
        date: record.created_at
      })) || []
    }
    
    console.log(`[getDashboardData] 返回数据:`, JSON.stringify(response, null, 2))
    
    return res.json(response)
    
  } catch (error) {
    console.error('[getDashboardData] 错误:', error)
    return res.status(500).json({ error: 'Failed to get dashboard data' })
  }
}

// 获取历史记录数据 - 完全模仿Telegram逻辑
async function getHistoryData(userId, params, res) {
  try {
    const { month, limit = 20, offset = 0 } = params
    console.log(`[getHistoryData] 查询历史记录: userId=${userId}, month=${month}, limit=${limit}, offset=${offset}`)
    
    let query = supabase
      .from('records')
      .select('id,ymd,category_group,category_code,amount,note,created_at')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('ymd', { ascending: false })
      .order('created_at', { ascending: false })

    // 如果指定了月份，添加月份过滤 (模仿Telegram逻辑)
    if (month) {
      const today = new Date()
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      
      const startDate = `${month}-01`
      let endDate
      
      if (month === currentMonth) {
        // 如果是当前月份，查询到今天 (模仿Telegram逻辑)
        endDate = today.toISOString().slice(0, 10)
      } else {
        // 如果是历史月份，查询整个月
        const year = parseInt(month.split('-')[0])
        const monthNum = parseInt(month.split('-')[1])
        const lastDay = new Date(year, monthNum, 0).getDate()
        endDate = `${month}-${lastDay.toString().padStart(2, '0')}`
      }
      
      console.log(`[getHistoryData] 日期过滤: ${startDate} 至 ${endDate}`)
      query = query.gte('ymd', startDate).lte('ymd', endDate)
    }
    
    // 分页处理
    const { data: records, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[getHistoryData] 查询失败:', error)
      return res.status(500).json({ error: 'Failed to fetch history' })
    }

    // 计算统计数据
    const stats = {
      totalRecords: records.length,
      totalSpent: records.reduce((sum, record) => sum + Math.abs(record.amount), 0)
    }

    console.log(`[getHistoryData] 查询成功: 返回 ${records?.length || 0} 条记录`)
    
    return res.json({ 
      records: records || [],
      stats,
      debug: {
        userId,
        month,
        totalRecords: records?.length || 0,
        queryRange: month ? `${month} month` : 'all'
      }
    })

  } catch (error) {
    console.error('[getHistoryData] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 获取个人资料数据
async function getProfileData(userId, res) {
  try {
    console.log(`[getProfileData] 获取用户 ${userId} 的个人资料`)
    
    // 获取用户资料
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .single()
      
    // 获取用户基本信息
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id, name, branch_code, created_at')
      .eq('id', userId)
      .single()
      
    // 获取统计数据
    const { data: recordStats } = await supabase
      .from('records')
      .select('ymd')
      .eq('user_id', userId)
      .eq('is_voided', false)
      
    const uniqueDays = new Set(recordStats?.map(r => r.ymd) || []).size
    
    const response = {
      user: {
        telegram_id: user?.telegram_id,
        name: user?.name || profile?.display_name,
        branch: user?.branch_code || '未设置',
        joined_date: user?.created_at
      },
      profile: {
        display_name: profile?.display_name,
        phone: profile?.phone_e164,
        email: profile?.email,
        income: profile?.monthly_income || 0,
        a_pct: profile?.a_pct || 0,
        travel_budget: profile?.travel_budget_annual || 0,
        annual_medical_insurance: profile?.annual_medical_insurance || 0,
        annual_car_insurance: profile?.annual_car_insurance || 0
      },
      stats: {
        record_days: uniqueDays,
        total_records: profile?.total_records || 0,
        current_streak: profile?.current_streak || 0,
        max_streak: profile?.max_streak || 0
      }
    }
    
    console.log(`[getProfileData] 返回个人资料数据`)
    
    return res.json(response)
    
  } catch (error) {
    console.error('[getProfileData] 错误:', error)
    return res.status(500).json({ error: 'Failed to get profile data' })
  }
}

// 更新个人资料数据
async function updateProfileData(userId, params, res) {
  try {
    const { fieldName, value, tableName = 'user_profile' } = params
    console.log(`[updateProfileData] 更新用户 ${userId} 的 ${fieldName} = ${value}`)
    
    // 🔧 修复：先检查用户资料是否存在，不存在则创建
    if (tableName === 'user_profile') {
      const { data: existingProfile } = await supabase
        .from('user_profile')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (!existingProfile) {
        console.log(`[updateProfileData] 用户资料不存在，创建新记录`)
        // 获取用户邮箱用于创建资料
        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single()
        
        // 创建基础用户资料
        const { error: createError } = await supabase
          .from('user_profile')
          .insert({
            user_id: userId,
            email: userData?.email || '',
            display_name: userData?.name || '',
            [fieldName]: value
          })
        
        if (createError) {
          console.error('[updateProfileData] 创建用户资料失败:', createError)
          return res.status(500).json({ error: '创建用户资料失败', details: createError.message })
        }
        
        console.log(`[updateProfileData] 用户资料创建成功`)
      } else {
        // 更新现有用户资料字段
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ [fieldName]: value })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('[updateProfileData] 更新失败:', updateError)
          return res.status(500).json({ error: '更新失败', details: updateError.message })
        }
      }
    } else {
      // 非user_profile表的更新
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ [fieldName]: value })
        .eq('user_id', userId)
      
      if (updateError) {
        console.error('[updateProfileData] 更新失败:', updateError)
        return res.status(500).json({ error: '更新失败', details: updateError.message })
      }
    }
    
    // 🎯 重要字段更新时触发积分计算
    const importantFields = [
      'income', 'monthly_income', // 月收入
      'a_pct', // A类百分比
      'travel_budget_annual', // 年度旅游预算
      'annual_medical_insurance', // 年度医疗保险
      'annual_car_insurance' // 年度车险
    ]
    
    if (importantFields.includes(fieldName)) {
      console.log(`[updateProfileData] 重要字段 ${fieldName} 已更新，触发积分计算`)
      
      try {
        // 获取完整的用户资料
        const { data: profile } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (profile) {
          // 检查设置完成度
          const isProfileComplete = checkProfileCompleteness(profile)
          console.log(`[updateProfileData] 用户 ${userId} 资料完成度: ${isProfileComplete ? '完整' : '不完整'}`)
          
          // 创建/更新月度自动记录
          await createMonthlyAutoRecords(userId, profile)
          
          // 触发当月积分计算
          const today = new Date()
          const currentYmd = today.toISOString().slice(0, 10)
          
          // 检查当月是否已有积分记录
          const { data: existingScore } = await supabase
            .from('user_daily_scores')
            .select('ymd, record_type')
            .eq('user_id', userId)
            .eq('ymd', currentYmd)
            .single()
          
          if (!existingScore) {
            // 如果资料完整且没有积分记录，创建设置完成奖励积分
            const recordType = isProfileComplete ? 'profile_complete' : 'profile_partial'
            console.log(`[updateProfileData] 为用户 ${userId} 创建积分记录，类型: ${recordType}`)
            
            await calculateRecordScorePWA(userId, currentYmd, recordType)
            
            // 更新用户资料的记录统计
            const { data: recordCount } = await supabase
              .from('records')
              .select('id', { count: 'exact' })
              .eq('user_id', userId)
            
            await supabase
              .from('user_profile')
              .update({ 
                total_records: recordCount.length || 0,
                last_record_date: currentYmd,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
            
            console.log(`[updateProfileData] 用户 ${userId} 的积分记录已创建`)
          } else if (isProfileComplete && existingScore.record_type === 'profile_partial') {
            // 如果之前是部分完成，现在完整了，升级积分记录
            console.log(`[updateProfileData] 用户 ${userId} 资料已完整，升级积分记录`)
            
            // 重新计算完整资料积分
            const upgradeBonus = 10 // 完整资料升级奖励10分
            const newBonusScore = (existingScore.bonus_score || 0) + upgradeBonus
            const newTotalScore = existingScore.base_score + existingScore.streak_score + newBonusScore
            
            await supabase
              .from('user_daily_scores')
              .update({ 
                record_type: 'profile_complete',
                bonus_score: newBonusScore,
                total_score: newTotalScore,
                bonus_details: [
                  ...(existingScore.bonus_details || []),
                  { score: upgradeBonus, name: '完整资料升级奖励' }
                ],
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('ymd', currentYmd)
            
            console.log(`[updateProfileData] 用户 ${userId} 积分记录已升级，新增${upgradeBonus}分，总分${newTotalScore}`)
          } else {
            console.log(`[updateProfileData] 用户 ${userId} 当月已有积分记录，跳过创建`)
          }
        }
        
      } catch (scoreError) {
        console.error(`[updateProfileData] 积分计算失败 (不影响字段更新):`, scoreError)
        // 积分计算失败不影响字段更新的成功
      }
    }
    
    console.log(`[updateProfileData] 更新成功: ${fieldName} = ${value}`)
    
    return res.json({ 
      success: true, 
      message: `${fieldName} 已更新`,
      value: value 
    })
    
  } catch (error) {
    console.error('[updateProfileData] 错误:', error)
    return res.status(500).json({ error: 'Failed to update profile data' })
  }
}


// 订阅推送通知
async function subscribePushNotification(userId, params, res) {
  try {
    const { subscription, deviceInfo } = params
    console.log(`[subscribePushNotification] 用户 ${userId} 订阅推送`)
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' })
    }

    // 先检查用户是否存在
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (!userExists) {
      console.error('[subscribePushNotification] 用户不存在:', userId)
      return res.status(400).json({ error: 'User not found' })
    }

    // 保存推送订阅到数据库 - 先删除现有的，再插入新的
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)

    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: deviceInfo?.userAgent || '',
        device_info: deviceInfo || {},
        last_used: new Date().toISOString()
      })

    if (error) {
      console.error('[subscribePushNotification] 数据库错误:', error)
      return res.status(500).json({ error: 'Failed to save subscription' })
    }

    console.log(`[subscribePushNotification] 订阅保存成功`)
    return res.json({ success: true, message: '推送订阅成功' })

  } catch (error) {
    console.error('[subscribePushNotification] 错误:', error)
    return res.status(500).json({ error: 'Failed to subscribe push notifications' })
  }
}

// 取消推送订阅
async function unsubscribePushNotification(userId, res) {
  try {
    console.log(`[unsubscribePushNotification] 用户 ${userId} 取消订阅`)

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('[unsubscribePushNotification] 数据库错误:', error)
      return res.status(500).json({ error: 'Failed to unsubscribe' })
    }

    console.log(`[unsubscribePushNotification] 取消订阅成功`)
    return res.json({ success: true, message: '取消推送订阅成功' })

  } catch (error) {
    console.error('[unsubscribePushNotification] 错误:', error)
    return res.status(500).json({ error: 'Failed to unsubscribe push notifications' })
  }
}

// 发送测试推送通知
async function sendTestPushNotification(userId, res) {
  try {
    console.log(`[sendTestPushNotification] 向用户 ${userId} 发送测试推送`)

    // 获取用户的推送订阅
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('[sendTestPushNotification] 查询订阅失败:', error)
      return res.status(500).json({ error: 'Failed to get subscriptions' })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: '没有找到推送订阅，请先订阅推送通知' })
    }

    // 动态导入 web-push
    const webpush = require('web-push')
    
    // 设置 VAPID 密钥
    webpush.setVapidDetails(
      'mailto:support@learnerclub.app',
      process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const pushPayload = {
      title: '🧪 测试推送通知',
      body: '这是一个测试推送通知，点击查看更多信息',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: {
        type: 'test',
        url: '/settings',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: '查看',
          icon: '/icons/icon-72.png'
        },
        {
          action: 'close',
          title: '关闭'
        }
      ]
    }

    // 向所有订阅发送推送
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(pushPayload)
        )

        console.log(`[sendTestPushNotification] 推送发送成功: ${subscription.endpoint.slice(-20)}`)
        return { success: true, endpoint: subscription.endpoint }
      } catch (error) {
        console.error(`[sendTestPushNotification] 推送发送失败:`, error)
        return { success: false, endpoint: subscription.endpoint, error: error.message }
      }
    })

    const results = await Promise.all(pushPromises)
    const successCount = results.filter(r => r.success).length

    console.log(`[sendTestPushNotification] 测试推送完成: ${successCount}/${results.length} 成功`)

    // 记录推送日志
    await supabase
      .from('push_logs')
      .insert({
        user_id: userId,
        push_type: 'test',
        title: pushPayload.title,
        body: pushPayload.body,
        success: successCount > 0,
        error_message: successCount === 0 ? '所有推送都失败了' : null
      })

    if (successCount > 0) {
      return res.json({ 
        success: true, 
        message: `测试推送发送成功 (${successCount}/${results.length})`,
        results 
      })
    } else {
      return res.status(500).json({ 
        error: '测试推送发送失败', 
        results 
      })
    }

  } catch (error) {
    console.error('[sendTestPushNotification] 错误:', error)
    return res.status(500).json({ error: 'Failed to send test push notification' })
  }
}

// 验证推送订阅状态
async function verifyPushSubscription(userId, res) {
  try {
    console.log(`[verifyPushSubscription] 验证用户 ${userId} 的推送订阅`)

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, last_used')
      .eq('user_id', userId)

    if (error) {
      console.error('[verifyPushSubscription] 查询失败:', error)
      return res.status(500).json({ error: 'Failed to verify subscription' })
    }

    const hasSubscription = subscriptions && subscriptions.length > 0
    
    console.log(`[verifyPushSubscription] 用户订阅状态: ${hasSubscription ? '存在' : '不存在'} (${subscriptions?.length || 0}个)`)

    return res.json({ 
      hasSubscription,
      subscriptionCount: subscriptions?.length || 0,
      subscriptions: subscriptions?.map(s => ({
        id: s.id,
        endpoint: s.endpoint.slice(-20), // 只返回端点的最后20个字符用于调试
        lastUsed: s.last_used
      }))
    })

  } catch (error) {
    console.error('[verifyPushSubscription] 错误:', error)
    return res.status(500).json({ error: 'Failed to verify push subscription' })
  }
}

// 添加单条记录
async function addRecord(userId, recordData, res) {
  try {
    console.log(`[addRecord] 用户 ${userId} 添加记录:`, recordData)

    if (!recordData.group || !recordData.category || !recordData.amount || !recordData.date) {
      return res.status(400).json({ 
        error: 'Missing required fields: group, category, amount, date' 
      })
    }

    // 构建API请求 - 直接调用主系统部署的域名
    // PWA部署和主系统部署分离，需要跨域调用主系统
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://verceteleg.vercel.app' // 主系统域名，包含record-system API
      : 'http://localhost:3000' // 开发环境需要主系统在3000端口运行

    console.log(`[addRecord] API调用: ${baseURL}/api/records/record-system`)

    const response = await fetch(`${baseURL}/api/records/record-system`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'PWA-Client'
      },
      body: JSON.stringify({
        action: 'create',
        userId: userId,
        data: {
          category_group: recordData.group,
          category_code: recordData.category,
          amount: parseFloat(recordData.amount),
          note: recordData.note || '',
          ymd: recordData.date
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text().catch(() => 'Unknown error')
      console.error(`[addRecord] 主系统API调用失败:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(`记录保存失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    
    // 构建响应，包含积分信息
    const responseData = {
      success: true,
      message: '记录添加成功',
      record: result.record
    }
    
    // 如果主系统返回了积分信息，包含在响应中
    if (result.score) {
      responseData.score = result.score
      // 增强积分消息
      if (result.score.total_score > 0) {
        const scoreDetails = []
        if (result.score.base_score > 0) scoreDetails.push(`基础${result.score.base_score}分`)
        if (result.score.streak_score > 0) scoreDetails.push(`连续${result.score.streak_score}分`)
        if (result.score.bonus_score > 0) scoreDetails.push(`奖励${result.score.bonus_score}分`)
        
        responseData.scoreMessage = `🎉 获得 ${result.score.total_score} 分！(${scoreDetails.join(' + ')})`
        responseData.streakMessage = `连续记录 ${result.score.current_streak} 天`
        
        // 里程碑成就提示
        if (result.score.bonus_details && result.score.bonus_details.length > 0) {
          const achievements = result.score.bonus_details.map(bonus => bonus.name).join('、')
          responseData.achievementMessage = `🏆 达成成就：${achievements}！`
        }
      }
    }
    
    return res.json(responseData)

  } catch (error) {
    console.error('[addRecord] 错误:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to add record' 
    })
  }
}

// 批量添加记录
async function batchAddRecords(userId, params, res) {
  try {
    console.log(`[batchAddRecords] 用户 ${userId} 批量添加记录:`, params.records?.length || 0, '条')

    if (!params.records || !Array.isArray(params.records) || params.records.length === 0) {
      return res.status(400).json({ 
        error: 'No valid records provided' 
      })
    }

    // 使用与单条记录相同的API路径逻辑 - 直接调用主系统
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://verceteleg.vercel.app' // 主系统域名，包含record-system API
      : 'http://localhost:3000' // 开发环境需要主系统在3000端口运行

    const results = []
    const errors = []

    // 逐个处理记录（确保数据一致性）
    for (let i = 0; i < params.records.length; i++) {
      const record = params.records[i]
      
      try {
        const response = await fetch(`${baseURL}/api/records/record-system`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'PWA-Batch-Client'
          },
          body: JSON.stringify({
            action: 'create',
            userId: userId,
            data: {
              category_group: record.group,
              category_code: record.category,
              amount: parseFloat(record.amount),
              note: record.note || '',
              ymd: record.date
            }
          })
        })

        if (response.ok) {
          const result = await response.json()
          results.push({ 
            index: i, 
            success: true, 
            record: result.record 
          })
        } else {
          const errorData = await response.text().catch(() => 'Unknown error')
          errors.push({ 
            index: i, 
            error: `${response.status}: ${errorData}` 
          })
        }
      } catch (recordError) {
        errors.push({ 
          index: i, 
          error: recordError.message 
        })
      }
    }

    console.log(`[batchAddRecords] 完成: ${results.length} 成功, ${errors.length} 失败`)

    // 如果有任何成功的记录，返回成功
    if (results.length > 0) {
      return res.json({
        success: true,
        message: `批量记录完成: ${results.length} 条成功${errors.length > 0 ? `, ${errors.length} 条失败` : ''}`,
        results: {
          successful: results.length,
          failed: errors.length,
          details: results,
          errors: errors
        }
      })
    } else {
      // 全部失败
      return res.status(400).json({
        error: '批量记录失败',
        details: errors
      })
    }

  } catch (error) {
    console.error('[batchAddRecords] 错误:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to process batch records' 
    })
  }
}

// 删除记录
async function deleteRecord(userId, params, res) {
  try {
    const { recordId } = params
    console.log(`[deleteRecord] 用户 ${userId} 删除记录: ${recordId}`)
    
    if (!recordId) {
      return res.status(400).json({ 
        error: 'Missing required field: recordId' 
      })
    }
    
    // 构建API请求 - 调用主系统的record-system API
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://verceteleg.vercel.app' // 主系统域名
      : 'http://localhost:3000'
    
    console.log(`[deleteRecord] API调用: ${baseURL}/api/records/record-system`)
    
    const response = await fetch(`${baseURL}/api/records/record-system`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'PWA-Delete-Client',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store', // 强制不使用任何缓存
      body: JSON.stringify({
        action: 'delete',
        userId: userId,
        recordId: recordId
      })
    })
    
    const responseText = await response.text()
    console.log(`[deleteRecord] 主系统响应:`, {
      status: response.status,
      ok: response.ok,
      text: responseText.substring(0, 200)
    })
    
    if (!response.ok) {
      console.error(`[deleteRecord] 主系统API调用失败:`, {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      })
      return res.status(response.status || 500).json({ 
        error: `删除记录失败: ${response.status} ${response.statusText}`,
        details: responseText
      })
    }
    
    // 尝试解析JSON响应
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      console.warn('[deleteRecord] 响应不是JSON格式:', responseText.substring(0, 100))
      responseData = { success: true, message: responseText }
    }
    
    console.log(`[deleteRecord] 删除成功:`, responseData)
    
    // 添加时间戳确保响应不被缓存
    const timestamp = new Date().toISOString()
    
    return res.json({
      success: true,
      message: '记录删除成功',
      data: responseData,
      timestamp: timestamp,
      debug: `Deleted at ${timestamp} by user ${userId}`
    })
    
  } catch (error) {
    console.error('[deleteRecord] 错误:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to delete record' 
    })
  }
}

// 修改记录
async function updateRecord(userId, params, res) {
  try {
    const { recordId, group, category, amount, date, note } = params
    console.log(`[updateRecord] 用户 ${userId} 修改记录 ${recordId}:`, { group, category, amount, date, note })
    
    if (!recordId) {
      return res.status(400).json({ 
        error: 'Missing required field: recordId' 
      })
    }
    
    if (!group || !category || !amount || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: group, category, amount, date' 
      })
    }
    
    // 构建API请求 - 调用主系统的record-system API
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://verceteleg.vercel.app' // 主系统域名
      : 'http://localhost:3000'
    
    console.log(`[updateRecord] API调用: ${baseURL}/api/records/record-system`)
    
    const response = await fetch(`${baseURL}/api/records/record-system`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'PWA-Update-Client',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store', // 强制不使用任何缓存
      body: JSON.stringify({
        action: 'update',
        userId: userId,
        recordId: recordId,
        data: {
          category_group: group,
          category_code: category,
          amount: parseFloat(amount),
          note: note || '',
          ymd: date
        }
      })
    })
    
    const responseText = await response.text()
    console.log(`[updateRecord] 主系统响应:`, {
      status: response.status,
      ok: response.ok,
      text: responseText.substring(0, 200)
    })
    
    if (!response.ok) {
      console.error(`[updateRecord] 主系统API调用失败:`, {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      })
      return res.status(response.status || 500).json({ 
        error: `修改记录失败: ${response.status} ${response.statusText}`,
        details: responseText
      })
    }
    
    // 尝试解析JSON响应
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      console.warn('[updateRecord] 响应不是JSON格式:', responseText.substring(0, 100))
      responseData = { success: true, message: responseText }
    }
    
    console.log(`[updateRecord] 修改成功:`, responseData)
    
    // 添加时间戳确保响应不被缓存
    const timestamp = new Date().toISOString()
    
    return res.json({
      success: true,
      message: '记录修改成功',
      data: responseData,
      timestamp: timestamp,
      debug: `Updated at ${timestamp} by user ${userId} - record ${recordId}`
    })
    
  } catch (error) {
    console.error('[updateRecord] 错误:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to update record' 
    })
  }
}

// 处理用户打卡 - 采用Telegram模式：先积分后记录
async function handleCheckIn(userId, res) {
  try {
    console.log(`[handleCheckIn] 用户 ${userId} 发起打卡 - 使用Telegram模式`)
    
    const today = formatYMD(new Date())
    
    // 1. 检查今日是否已打卡 (检查积分表)
    const { data: existingCheckIn } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('ymd', today)
      .maybeSingle()
    
    if (existingCheckIn) {
      console.log(`[handleCheckIn] 用户 ${userId} 今日已打卡`)
      return res.status(200).json({
        success: false,
        error: '今日已经打卡过了！',
        hasCheckedIn: true,
        score: {
          total_score: existingCheckIn.total_score,
          base_score: existingCheckIn.base_score,
          streak_score: existingCheckIn.streak_score,
          bonus_score: existingCheckIn.bonus_score
        },
        scoreMessage: `今日积分：${existingCheckIn.total_score}分`
      })
    }
    
    // 2. PWA独立积分计算 - 使用修复后的本地逻辑
    const scoreResult = await calculateCheckInScorePWA(userId, today)
    
    console.log(`[handleCheckIn] 积分计算结果:`, scoreResult)
    
    // 3. 创建records表记录
    const { data: checkinRecord, error: insertError } = await supabase
      .from('records')
      .insert([{
        user_id: userId,
        category_group: 'A',
        category_code: 'daily_checkin',
        amount: 0,
        note: '每日打卡 - PWA',
        ymd: today
      }])
      .select()
      .single()
      
    if (insertError) {
      console.error('[handleCheckIn] 插入打卡记录失败 (但积分已计算):', insertError)
      // 即使records插入失败，积分已经记录，仍然返回成功
    }
    
    console.log(`[handleCheckIn] 用户 ${userId} 打卡成功，获得 ${scoreResult.total_score} 分`)
    
    // 构建响应，包含积分信息
    const responseData = {
      success: true,
      message: '打卡成功！',
      hasCheckedIn: true,
      record: checkinRecord,
      score: scoreResult
    }
    
    // 如果有积分信息，包含详细消息
    if (scoreResult && scoreResult.total_score > 0) {
      const scoreDetails = []
      if (scoreResult.base_score > 0) scoreDetails.push(`基础${scoreResult.base_score}分`)
      if (scoreResult.streak_score > 0) scoreDetails.push(`连续${scoreResult.streak_score}分`)
      if (scoreResult.bonus_score > 0) scoreDetails.push(`奖励${scoreResult.bonus_score}分`)
      
      responseData.scoreMessage = `🎉 获得 ${scoreResult.total_score} 分！(${scoreDetails.join(' + ')})`
      responseData.streakMessage = `连续打卡 ${scoreResult.current_streak} 天`
      
      // 里程碑成就提示
      if (scoreResult.bonus_details && scoreResult.bonus_details.length > 0) {
        const achievements = scoreResult.bonus_details.map(bonus => bonus.name).join('、')
        responseData.achievementMessage = `🏆 达成成就：${achievements}！`
      }
    }
    
    return res.status(200).json(responseData)
      
  } catch (error) {
    console.error('[handleCheckIn] 处理失败:', error)
    return res.status(500).json({
      success: false,
      error: '打卡失败，请重试',
      debug: {
        message: error.message,
        stack: error.stack
      }
    })
  }
}

// PWA独立积分计算 - 与主系统逻辑保持一致
async function calculateCheckInScorePWA(userId, ymd) {
  try {
    console.log(`[calculateCheckInScorePWA] 计算用户 ${userId} 在 ${ymd} 的打卡积分`)
    
    // 1. 计算基础分
    const baseScore = 1
    
    // 2. 计算连续天数
    const currentStreak = await calculateCurrentStreakPWA(userId, ymd)
    
    // 3. 连续分计算 - 连续记录获得1分 (固定1分，不累加)
    const streakScore = currentStreak > 1 ? 1 : 0
    
    // 4. 里程碑奖励计算
    const bonusDetails = []
    let bonusScore = 0
    
    // 🔧 从数据库获取里程碑配置 (确保与主系统同步)
    const { data: milestones } = await supabase
      .from('score_milestones')
      .select('streak_days, bonus_score, milestone_name')
      .order('streak_days')
    
    console.log(`[PWA积分] 获取到 ${milestones?.length || 0} 个里程碑配置`)
    
    // 如果有里程碑配置，检查是否达成
    if (milestones && milestones.length > 0) {
      for (const milestone of milestones) {
        if (currentStreak === milestone.streak_days) {
          bonusDetails.push({
            score: milestone.bonus_score,
            name: milestone.milestone_name
          })
          bonusScore += milestone.bonus_score
          console.log(`[PWA积分] 达成${milestone.streak_days}天里程碑，获得${milestone.bonus_score}分奖励`)
        }
      }
    }
    
    // 🔧 计算总分
    const totalScore = baseScore + streakScore + bonusScore

    const scoreData = {
      user_id: userId,
      ymd: ymd,
      base_score: baseScore,
      streak_score: streakScore,
      bonus_score: bonusScore,
      total_score: totalScore, // 🔧 添加总分字段
      current_streak: currentStreak,
      record_type: 'checkin',
      bonus_details: bonusDetails
    }
    
    // 保存积分记录到user_daily_scores表
    const { data: savedScore, error } = await supabase
      .from('user_daily_scores')
      .insert(scoreData)
      .select()
      .single()
    
    if (error) {
      console.error('[calculateCheckInScorePWA] 保存积分失败:', error)
      throw error
    }
    
    // 🔧 更新 user_profile 的最后记录时间（与主系统保持一致）
    try {
      await supabase
        .from('user_profile')
        .update({ 
          last_record: ymd
        })
        .eq('user_id', userId)
      
      console.log(`[calculateCheckInScorePWA] 已更新最后记录时间`)
    } catch (syncError) {
      console.error('[calculateCheckInScorePWA] 同步 user_profile 失败 (不影响积分):', syncError)
    }
    
    console.log(`[calculateCheckInScorePWA] 积分计算完成: ${totalScore}分`)
    return savedScore
    
  } catch (error) {
    console.error('[calculateCheckInScorePWA] 积分计算失败:', error)
    throw error
  }
}

// PWA内置连续天数计算 - 模仿主系统逻辑，过滤自动生成记录
async function calculateCurrentStreakPWA(userId, todayYmd) {
  try {
    console.log(`[PWA连续计算] 开始计算用户${userId} 在${todayYmd}的连续天数 (过滤自动生成记录)`)
    
    // 首先检查今天是否有手动记录
    const hasTodayManualRecord = await hasManualRecordsOnDate(userId, todayYmd)
    console.log(`[PWA连续计算] 今天(${todayYmd})是否有手动记录: ${hasTodayManualRecord}`)
    
    // 如果今天没有手动记录，返回0（不计入连续天数）
    if (!hasTodayManualRecord) {
      console.log('[PWA连续计算] 今天无手动记录，连续天数为0')
      return 0
    }
    
    // 获取用户所有积分记录，按日期降序排列，但需要检查对应日期是否有非自动生成的记录
    const { data: allScores } = await supabase
      .from('user_daily_scores')
      .select('ymd, current_streak')
      .eq('user_id', userId)
      .lt('ymd', todayYmd)  // 小于今天的记录
      .order('ymd', { ascending: false })
      
    // 过滤掉只有自动生成记录的日期 - 检查每个日期是否有手动记录
    const validScores = []
    if (allScores && allScores.length > 0) {
      for (const score of allScores) {
        // 使用辅助函数检查这个日期是否有手动记录
        const hasManual = await hasManualRecordsOnDate(userId, score.ymd)
        if (hasManual) {
          validScores.push(score)
        }
      }
    }
    
    // 如果没有有效的历史记录，今天是第1天
    if (!validScores || validScores.length === 0) {
      console.log('[PWA连续计算] 无有效历史记录，今天是第1天')
      return 1
    }
    
    // 计算从今天往前推的连续天数
    const today = new Date(todayYmd)
    let currentStreak = 1  // 今天算1天
    let checkDate = new Date(today.getTime() - 86400000)  // 从昨天开始检查
    
    console.log(`[PWA连续计算] 开始检查连续序列，从${checkDate.toISOString().slice(0, 10)}往前`)
    
    // 检查连续的日期序列 - 使用过滤后的有效记录
    for (let i = 0; i < validScores.length; i++) {
      const checkYmd = checkDate.toISOString().slice(0, 10)
      const scoreRecord = validScores.find(s => s.ymd === checkYmd)
      
      if (scoreRecord) {
        // 找到这一天的记录，连续天数+1
        currentStreak++
        console.log(`[PWA连续计算] 找到${checkYmd}的有效记录，当前连续: ${currentStreak}天`)
        
        // 继续检查前一天
        checkDate = new Date(checkDate.getTime() - 86400000)
      } else {
        // 没有找到这一天的记录，连续序列中断
        console.log(`[PWA连续计算] ${checkYmd}无有效记录，连续序列中断`)
        break
      }
      
      // 安全检查：最多检查90天，避免无限循环
      if (i >= 89) {
        console.log(`[PWA连续计算] 已检查90天，停止计算`)
        break
      }
    }
    
    console.log(`[PWA连续计算] 最终连续天数: ${currentStreak}天`)
    return currentStreak
    
  } catch (error) {
    console.error('[PWA连续计算] 计算失败:', error)
    return 1  // 出错时返回1天
  }
}

// 检查指定日期是否有手动添加的记录（非自动生成）
async function hasManualRecordsOnDate(userId, ymd) {
  try {
    const { data: manualRecords, error } = await supabase
      .from('records')
      .select('id')
      .eq('user_id', userId)
      .eq('ymd', ymd)
      .neq('note', 'Auto-generated monthly')  // 排除自动生成记录
      .not('note', 'ilike', '%Auto-generated%')  // 排除任何包含Auto-generated的记录
      .limit(1)
      
    if (error) {
      console.error(`[hasManualRecordsOnDate] 查询失败:`, error)
      return false
    }
    
    const hasManual = manualRecords && manualRecords.length > 0
    console.log(`[hasManualRecordsOnDate] ${ymd} 是否有手动记录: ${hasManual}`)
    return hasManual
    
  } catch (error) {
    console.error(`[hasManualRecordsOnDate] 错误:`, error)
    return false
  }
}

async function checkCheckInStatus(userId, res) {
  try {
    console.log(`[checkCheckInStatus] 检查用户 ${userId} 今日打卡状态`)
    
    const today = formatYMD(new Date())
    
    // 检查今日是否已打卡 (通过user_daily_scores表)
    const { data: checkinRecord } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('ymd', today)
      .maybeSingle()
      
    const hasCheckedIn = !!checkinRecord
    const checkinTime = checkinRecord?.created_at 
      ? new Date(checkinRecord.created_at).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) 
      : null
    
    console.log(`[checkCheckInStatus] 今日打卡状态: ${hasCheckedIn}`)
    
    return res.status(200).json({
      success: true,
      hasCheckedIn,
      checkinTime,
      today
    })
    
  } catch (error) {
    console.error('[checkCheckInStatus] 失败:', error)
    return res.status(500).json({
      success: false,
      error: '检查打卡状态失败'
    })
  }
}

// 获取排行榜数据 - 直接集成到PWA API
async function getLeaderboardData(userId, userBranch, res) {
  try {
    console.log(`[getLeaderboardData] 开始获取排行榜数据`)
    console.log(`[getLeaderboardData] 用户ID: ${userId}`)
    console.log(`[getLeaderboardData] 用户分院: ${userBranch}`)
    console.log(`[getLeaderboardData] userBranch类型: ${typeof userBranch}`)
    
    // 如果没有分院信息，尝试从数据库获取
    if (!userBranch) {
      console.log(`[getLeaderboardData] userBranch为空，尝试从数据库查询`)
      const { data: userData } = await supabase
        .from('users')
        .select('branch_code')
        .eq('id', userId)
        .single()
      
      if (userData && userData.branch_code) {
        userBranch = userData.branch_code
        console.log(`[getLeaderboardData] 从数据库获取到分院: ${userBranch}`)
      } else {
        console.log(`[getLeaderboardData] 数据库中也没有分院信息`)
      }
    }
    
    // 调试：详细打印userBranch的信息
    console.log(`[getLeaderboardData] userBranch详细信息:`)
    console.log(`  - 值: "${userBranch}"`)
    console.log(`  - 类型: ${typeof userBranch}`)
    console.log(`  - 长度: ${userBranch ? userBranch.length : 'N/A'}`)
    console.log(`  - JSON: ${JSON.stringify(userBranch)}`)
    console.log(`  - 是否等于'PU': ${userBranch === 'PU'}`)
    console.log(`  - 是否等于'小天使': ${userBranch === '小天使'}`)
    console.log(`  - trim后是否等于'PU': ${userBranch?.trim() === 'PU'}`)
    console.log(`  - Buffer hex: ${userBranch ? Buffer.from(userBranch).toString('hex') : 'N/A'}`)

    // 1. 获取全部用户积分排行
    const { data: allScores, error: allError } = await supabase
      .from('user_daily_scores')
      .select('*')
    
    if (allError) {
      console.error('[getLeaderboardData] 获取积分记录失败:', allError)
      return res.status(500).json({ error: '获取积分记录失败' })
    }
    
    // 获取相关用户信息
    const userIds = [...new Set(allScores?.map(s => s.user_id) || [])]
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, branch_code')
      .in('id', userIds)
    
    const { data: profilesData } = await supabase
      .from('user_profile')
      .select('user_id, display_name')
      .in('user_id', userIds)
    
    // 合并数据
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])
    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || [])
    
    const mergedScores = allScores?.map(score => ({
      ...score,
      users: usersMap.get(score.user_id),
      user_profile: profilesMap.get(score.user_id)
    })) || []

    // 计算用户总积分
    const userTotalScores = {}
    mergedScores.forEach(score => {
      if (!userTotalScores[score.user_id]) {
        userTotalScores[score.user_id] = {
          user_id: score.user_id,
          total_score: 0,
          total_days: 0,
          current_streak: score.current_streak || 0,
          users: score.users,
          user_profile: score.user_profile
        }
      }
      userTotalScores[score.user_id].total_score += score.total_score || 0
      userTotalScores[score.user_id].total_days += 1
      // 使用最新的streak记录
      if (score.ymd && score.current_streak) {
        userTotalScores[score.user_id].current_streak = score.current_streak
      }
    })

    // 排序全部用户
    const allUsers = Object.values(userTotalScores)
      .filter(user => user.users) // 只保留有用户信息的记录
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 50) // 取前50名
      .map((user, index) => ({
        rank: index + 1,
        user_id: user.user_id,
        name: user.user_profile?.display_name || user.users?.name || 'Unknown',
        branch_code: user.users?.branch_code,
        total_score: user.total_score,
        total_days: user.total_days,
        current_streak: user.current_streak,
        avg_score: user.total_days > 0 ? Math.round((user.total_score / user.total_days) * 10) / 10 : 0
      }))

    // 同分院用户排行 - 需要包含没有积分的用户
    console.log(`[getLeaderboardData] 开始获取分院用户，userBranch: ${userBranch}`)
    
    let branchUsers = []
    
    // 如果用户有分院，获取该分院所有用户（包括没有积分的）
    if (userBranch) {
      // 先从有积分的用户中过滤
      console.log(`[getLeaderboardData] 开始过滤，目标分院: "${userBranch}"`)
      const branchUsersWithScores = allUsers
        .filter(user => {
          const userBranchCode = user.branch_code ? String(user.branch_code).trim() : null
          const targetBranch = String(userBranch).trim()
          
          // 调试每个用户的比较
          if (user.branch_code) {
            console.log(`[过滤] ${user.name}: branch="${user.branch_code}" (${userBranchCode}) vs target="${targetBranch}" => ${userBranchCode === targetBranch}`)
          }
          
          return userBranchCode === targetBranch
        })
      
      console.log(`[getLeaderboardData] 有积分的${userBranch}分院用户: ${branchUsersWithScores.length}人`)
      
      // 如果过滤结果很少，可能是数据问题，尝试获取更多数据
      if (branchUsersWithScores.length < 5) {
        console.log(`[getLeaderboardData] ${userBranch}分院积分用户较少(${branchUsersWithScores.length})，尝试补充数据`)
        
        // 获取该分院所有用户
        const { data: allBranchUsers } = await supabase
          .from('users')
          .select('id, name, branch_code')
          .eq('branch_code', userBranch)
          .neq('status', 'test')
          .limit(20)
        
        if (allBranchUsers && allBranchUsers.length > 0) {
          console.log(`[getLeaderboardData] 数据库中${userBranch}分院共有${allBranchUsers.length}人`)
          
          // 获取这些用户的积分数据
          const { data: branchScores } = await supabase
            .from('user_daily_scores')
            .select('*')
            .in('user_id', allBranchUsers.map(u => u.id))
          
          console.log(`[getLeaderboardData] 找到${branchScores?.length || 0}条积分记录`)
          
          // 获取profile信息
          const { data: profiles } = await supabase
            .from('user_profile')
            .select('user_id, display_name')
            .in('user_id', allBranchUsers.map(u => u.id))
          
          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])
          
          // 计算每个用户的总积分
          const userScoreMap = {}
          branchScores?.forEach(score => {
            if (!userScoreMap[score.user_id]) {
              userScoreMap[score.user_id] = {
                total_score: 0,
                total_days: 0,
                current_streak: score.current_streak || 0
              }
            }
            userScoreMap[score.user_id].total_score += score.total_score || 0
            userScoreMap[score.user_id].total_days += 1
            userScoreMap[score.user_id].current_streak = score.current_streak || 0
          })
          
          // 构建完整的用户列表
          branchUsers = allBranchUsers.map((user, index) => {
            const scoreData = userScoreMap[user.id] || { total_score: 0, total_days: 0, current_streak: 0 }
            return {
              rank: index + 1,
              user_id: user.id,
              name: profileMap.get(user.id)?.display_name || user.name || 'Unknown',
              branch_code: user.branch_code,
              total_score: scoreData.total_score,
              total_days: scoreData.total_days,
              current_streak: scoreData.current_streak,
              avg_score: scoreData.total_days > 0 ? Math.round((scoreData.total_score / scoreData.total_days) * 10) / 10 : 0
            }
          })
          
          // 按积分排序
          branchUsers.sort((a, b) => b.total_score - a.total_score)
          branchUsers = branchUsers.slice(0, 20)
          
          // 重新分配排名
          branchUsers.forEach((user, index) => {
            user.rank = index + 1
          })
          
          console.log(`[getLeaderboardData] 补充后${userBranch}分院用户数: ${branchUsers.length}`)
        }
      } else {
        branchUsers = branchUsersWithScores.slice(0, 20)
      }
    }
    
    console.log(`[getLeaderboardData] 最终${userBranch}分院用户数: ${branchUsers.length}`)

    // 分院排行榜 - 重新设计逻辑确保所有分院都能正确显示积分
    console.log(`[getLeaderboardData] 开始计算分院排行榜`)
    
    // 1. 获取所有用户（包括没有积分记录的）
    const { data: allUsersData } = await supabase
      .from('users')
      .select('id, name, branch_code, status')
      .neq('status', 'test') // 排除测试用户
    
    console.log(`[getLeaderboardData] 总用户数: ${allUsersData?.length || 0}`)
    
    // 2. 获取所有积分记录
    const { data: allScoresData } = await supabase
      .from('user_daily_scores')
      .select('user_id, total_score, current_streak')
    
    console.log(`[getLeaderboardData] 总积分记录数: ${allScoresData?.length || 0}`)
    
    // 3. 计算每个用户的总积分
    const userScoreMap = {}
    allScoresData?.forEach(score => {
      if (!userScoreMap[score.user_id]) {
        userScoreMap[score.user_id] = {
          total_score: 0,
          total_days: 0,
          current_streak: score.current_streak || 0
        }
      }
      userScoreMap[score.user_id].total_score += score.total_score || 0
      userScoreMap[score.user_id].total_days += 1
      userScoreMap[score.user_id].current_streak = score.current_streak || 0
    })
    
    // 4. 初始化所有分院的统计数据
    const branchTotalScores = {}
    
    // 先为所有用户的分院创建初始记录
    allUsersData?.forEach(user => {
      if (user.branch_code) {
        if (!branchTotalScores[user.branch_code]) {
          branchTotalScores[user.branch_code] = {
            branch_code: user.branch_code,
            total_score: 0,
            user_count: 0,
            total_members: 0,
            top_users: []
          }
        }
        branchTotalScores[user.branch_code].total_members += 1
        
        // 如果用户有积分，加入统计
        const userScore = userScoreMap[user.id]
        if (userScore && userScore.total_score > 0) {
          branchTotalScores[user.branch_code].total_score += userScore.total_score
          branchTotalScores[user.branch_code].user_count += 1
          if (branchTotalScores[user.branch_code].top_users.length < 3) {
            branchTotalScores[user.branch_code].top_users.push(user.name)
          }
        }
      }
    })
    
    console.log(`[getLeaderboardData] 分院统计结果:`)
    Object.entries(branchTotalScores).forEach(([code, data]) => {
      console.log(`  - ${code}: ${data.total_score}分 (${data.user_count}/${data.total_members}人)`)
    })

    const branchRankings = Object.values(branchTotalScores)
      .sort((a, b) => {
        // 先按平均分排序，平均分相同时按总分排序
        const avgA = a.total_members > 0 ? a.total_score / a.total_members : 0
        const avgB = b.total_members > 0 ? b.total_score / b.total_members : 0
        if (avgB !== avgA) return avgB - avgA
        return b.total_score - a.total_score
      })
      .map((branch, index) => ({
        rank: index + 1,
        branch_code: branch.branch_code,
        branch_name: BRANCH_NAMES[branch.branch_code] || branch.branch_code, // 添加分院名称
        total_score: branch.total_score,
        active_members: branch.user_count, // 有积分的用户数
        total_members: branch.total_members, // 分院总人数
        user_count: branch.user_count,     // 保持原字段以防其他地方使用
        avg_score: branch.total_members > 0 ? Math.round((branch.total_score / branch.total_members) * 10) / 10 : 0,
        top_users: branch.top_users
      }))

    // 查找当前用户的排名信息
    let userRank = null
    const userIndex = allUsers.findIndex(u => u.user_id === userId)
    if (userIndex !== -1) {
      const branchUserIndex = branchUsers.findIndex(u => u.user_id === userId)
      userRank = {
        overall: userIndex + 1,  // 全国排名
        inBranch: branchUserIndex !== -1 ? branchUserIndex + 1 : null,  // 分院内排名
        totalScore: allUsers[userIndex].total_score,
        currentStreak: allUsers[userIndex].current_streak
      }
    }

    console.log(`[getLeaderboardData] 返回排行榜数据: 全部${allUsers.length}人, 分院${branchUsers.length}人, ${branchRankings.length}个分院`)
    if (userRank) {
      console.log(`[getLeaderboardData] 用户排名: 全国第${userRank.overall}名, 分院第${userRank.inBranch}名`)
    }

    return res.json({
      ok: true,
      data: {
        allUsers,
        branchUsers,
        branchRankings,
        userBranch,
        userRank,  // 添加用户排名信息
        currentUserId: userId,  // 添加当前用户ID
        timeframe: 'all_time'
      }
    })
    
  } catch (error) {
    console.error('[getLeaderboardData] 错误:', error)
    return res.status(500).json({ error: 'Failed to get leaderboard data' })
  }
}

// 获取用户积分历史数据
async function getScoresData(userId, res) {
  try {
    console.log(`[getScoresData] 获取用户 ${userId} 的积分数据`)
    
    // 1. 获取用户最近30天的积分记录
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: dailyScores, error: scoresError } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .gte('ymd', thirtyDaysAgoStr)
      .order('ymd', { ascending: false })
      .limit(30)

    if (scoresError) {
      console.error('[getScoresData] 获取积分记录失败:', scoresError)
      return res.status(500).json({ error: '获取积分记录失败' })
    }

    console.log(`[getScoresData] 用户 ${userId} 积分记录: ${dailyScores?.length || 0} 条`)

    // 2. 计算积分统计
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    let totalScore = 0
    let currentStreak = 0
    let thisMonthScore = 0
    let todayScore = 0

    // 获取最新的连续天数（优先今日记录，备选最近记录）
    const todayRecord = dailyScores?.find(score => score.ymd === today)
    if (todayRecord) {
      // 如果今天有记录，使用今天的连续天数
      currentStreak = todayRecord.current_streak || 0
    } else if (dailyScores && dailyScores.length > 0) {
      // 如果今天没记录，使用最近的连续天数
      currentStreak = dailyScores[0].current_streak || 0
    }

    // 计算各项统计
    dailyScores?.forEach(score => {
      totalScore += score.total_score || 0
      
      if (score.ymd.startsWith(thisMonth)) {
        thisMonthScore += score.total_score || 0
      }
      
      if (score.ymd === today) {
        todayScore = score.total_score || 0
      }
    })

    // 3. 格式化每日积分数据
    const formattedDailyScores = (dailyScores || []).map(score => ({
      ...score,
      bonus_details: Array.isArray(score.bonus_details) ? score.bonus_details : 
                     score.bonus_details ? JSON.parse(score.bonus_details) : []
    }))

    return res.json({
      ok: true,
      data: {
        dailyScores: formattedDailyScores,
        summary: {
          totalScore,
          currentStreak,
          thisMonthScore,
          todayScore
        }
      }
    })

  } catch (error) {
    console.error('[getScoresData] 错误:', error)
    return res.status(500).json({
      error: error.message || '获取积分数据失败'
    })
  }
}

// 🚀 原生PWA-Google删除记录 - 直接操作Supabase数据库
async function deleteRecordNative(userId, params, res) {
  try {
    const { recordId } = params
    console.log(`[deleteRecordNative] 用户 ${userId} 删除记录: ${recordId}`)
    
    if (!recordId) {
      return res.status(400).json({ 
        error: 'Missing required field: recordId' 
      })
    }
    
    // 直接操作Supabase - 软删除记录
    const { data, error } = await supabase
      .from('records')
      .update({ is_voided: true })
      .eq('id', recordId)
      .eq('user_id', userId)
      .select()
    
    if (error) {
      console.error('[deleteRecordNative] Supabase错误:', error)
      return res.status(500).json({ 
        error: 'Database error: ' + error.message 
      })
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: '记录不存在或无权限删除' 
      })
    }
    
    console.log(`[deleteRecordNative] 删除成功: ${recordId}`)
    return res.json({ 
      success: true, 
      message: '记录已成功删除',
      deletedRecord: data[0]
    })
    
  } catch (error) {
    console.error('[deleteRecordNative] 系统错误:', error)
    return res.status(500).json({
      error: error.message || '删除记录失败'
    })
  }
}

// 🚀 原生PWA-Google修改记录 - 直接操作Supabase数据库  
async function updateRecordNative(userId, params, res) {
  try {
    const { recordId, group, category, amount, date, note } = params
    console.log(`[updateRecordNative] 用户 ${userId} 修改记录 ${recordId}:`, { group, category, amount, date, note })
    
    if (!recordId) {
      return res.status(400).json({ 
        error: 'Missing required field: recordId' 
      })
    }
    
    if (!group || !category || amount === undefined || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: group, category, amount, date' 
      })
    }
    
    // 直接操作Supabase - 更新记录
    // 保持原始记录的正负号，不强制转换
    const originalRecord = await supabase
      .from('records')
      .select('amount')
      .eq('id', recordId)
      .eq('user_id', userId)
      .single()
    
    // 根据原始记录的正负号来确定新金额的符号
    const isOriginalPositive = originalRecord.data?.amount >= 0
    const newAmount = isOriginalPositive 
      ? Math.abs(parseFloat(amount))  // 保持正数
      : -Math.abs(parseFloat(amount)) // 保持负数
    
    const { data, error } = await supabase
      .from('records')
      .update({
        category_group: group,
        category_code: category, 
        amount: newAmount, // 保持原始正负号
        ymd: date,
        note: note || null
      })
      .eq('id', recordId)
      .eq('user_id', userId)
      .eq('is_voided', false) // 只能修改未删除的记录
      .select()
    
    if (error) {
      console.error('[updateRecordNative] Supabase错误:', error)
      return res.status(500).json({ 
        error: 'Database error: ' + error.message 
      })
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: '记录不存在或无权限修改' 
      })
    }
    
    console.log(`[updateRecordNative] 修改成功: ${recordId}`)
    return res.json({ 
      success: true, 
      message: '记录已成功修改',
      updatedRecord: data[0]
    })
    
  } catch (error) {
    console.error('[updateRecordNative] 系统错误:', error)
    return res.status(500).json({
      error: error.message || '修改记录失败'
    })
  }
}

// KISS: 极简打卡功能 + 基础积分
async function simpleCheckIn(userId, res) {
  try {
    console.log('[DEBUG simpleCheckIn] 用户ID:', userId)
    const today = new Date().toISOString().split('T')[0]
    console.log('[DEBUG simpleCheckIn] 今日日期:', today)
    
    // 检查今日是否已打卡
    const { data: existing } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('ymd', today)
      .maybeSingle()
    
    if (existing) {
      return res.status(200).json({ 
        success: false, 
        message: '今日已打卡',
        score: {
          total_score: existing.total_score,
          base_score: existing.base_score
        }
      })
    }
    
    // ULTRA-KISS: 最简单的积分计算，不依赖任何其他函数
    console.log('[DEBUG simpleCheckIn] 开始简单积分计算')
    
    // 查询昨天是否有打卡(计算连续天数)
    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0]
    const { data: yesterdayScore } = await supabase
      .from('user_daily_scores')
      .select('current_streak')
      .eq('user_id', userId)
      .eq('ymd', yesterday)
      .maybeSingle()
    
    const currentStreak = yesterdayScore ? yesterdayScore.current_streak + 1 : 1
    const baseScore = 1
    const streakScore = currentStreak > 1 ? 1 : 0
    const totalScore = baseScore + streakScore
    
    console.log('[DEBUG simpleCheckIn] 连续天数:', currentStreak, '总分:', totalScore)
    
    // 插入积分记录 - 移除total_score让数据库自动计算
    const { data: scoreResult, error: scoreError } = await supabase
      .from('user_daily_scores')
      .insert([{
        user_id: userId,
        ymd: today,
        base_score: baseScore,
        streak_score: streakScore,
        bonus_score: 0,
        current_streak: currentStreak,
        record_type: 'checkin'
      }])
      .select()
      .single()
    
    if (scoreError) {
      console.error('[DEBUG simpleCheckIn] 积分插入失败:', scoreError)
      throw scoreError
    }
    
    console.log('[DEBUG simpleCheckIn] 积分记录完成:', scoreResult)
    
    // 插入打卡记录
    await supabase
      .from('records')
      .insert([{
        user_id: userId,
        category_group: 'A',
        category_code: 'checkin',
        amount: 0,
        note: '每日打卡',
        ymd: today
      }])
    
    return res.status(200).json({ 
      success: true, 
      message: '打卡成功',
      score: {
        total_score: scoreResult.total_score || totalScore,
        base_score: scoreResult.base_score,
        streak_score: scoreResult.streak_score,
        bonus_score: scoreResult.bonus_score,
        current_streak: scoreResult.current_streak,
        bonus_details: []
      },
      scoreMessage: `🎉 打卡获得 ${scoreResult.total_score || totalScore} 分！`,
      streakMessage: `连续打卡 ${scoreResult.current_streak} 天`
    })
    
  } catch (error) {
    console.error('[simpleCheckIn] 详细错误:', error)
    console.error('[simpleCheckIn] 错误消息:', error.message)
    console.error('[simpleCheckIn] 错误栈:', error.stack)
    console.error('[simpleCheckIn] 用户ID:', userId)
    return res.status(500).json({ 
      error: '打卡失败',
      details: error.message,
      userId: userId
    })
  }
}

// 🚀 PWA独立记录添加 - 完全独立，不依赖主系统API
async function addRecordPWA(userId, recordData, res) {
  try {
    console.log(`[addRecordPWA] 用户 ${userId} 添加记录:`, recordData)

    if (!recordData.group || !recordData.category || !recordData.amount || !recordData.date) {
      return res.status(400).json({ 
        error: 'Missing required fields: group, category, amount, date' 
      })
    }

    const ymd = recordData.date
    
    // 1. 检查今日是否已有积分记录
    const { data: existingScore } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('ymd', ymd)
      .maybeSingle()
    
    // 2. 创建records表记录
    const { data: record, error: recordError } = await supabase
      .from('records')
      .insert([{
        user_id: userId,
        category_group: recordData.group,
        category_code: recordData.category,
        amount: parseFloat(recordData.amount),
        note: recordData.note || '',
        ymd: ymd
      }])
      .select()
      .single()

    if (recordError) {
      console.error('[addRecordPWA] 创建记录失败:', recordError)
      return res.status(500).json({ 
        error: '记录保存失败' 
      })
    }

    // 3. 如果今天还没有积分记录，且不是自动生成记录，则计算积分
    let scoreResult = null
    const isAutoGenerated = recordData.note === 'Auto-generated monthly' || 
                           (recordData.note && recordData.note.includes('Auto-generated'))
    
    if (!existingScore && !isAutoGenerated) {
      try {
        const recordDate = new Date(ymd + 'T00:00:00')
        scoreResult = await calculateRecordScorePWA(userId, recordDate, 'record')
        console.log(`[addRecordPWA] 积分计算结果:`, scoreResult)
      } catch (scoreError) {
        console.error('[addRecordPWA] 积分计算失败，但记录已保存:', scoreError)
      }
    } else if (isAutoGenerated) {
      console.log(`[addRecordPWA] 自动生成记录，跳过积分计算`)
      scoreResult = existingScore
    } else {
      console.log(`[addRecordPWA] 今日已有积分记录，跳过积分计算`)
      scoreResult = existingScore
    }
    
    // 4. 构建响应
    const responseData = {
      success: true,
      message: '记录添加成功',
      record: record,
      score: scoreResult
    }
    
    // 5. 如果有积分信息，包含详细消息
    if (scoreResult && scoreResult.total_score > 0) {
      const scoreDetails = []
      if (scoreResult.base_score > 0) scoreDetails.push(`基础${scoreResult.base_score}分`)
      if (scoreResult.streak_score > 0) scoreDetails.push(`连续${scoreResult.streak_score}分`)
      if (scoreResult.bonus_score > 0) scoreDetails.push(`奖励${scoreResult.bonus_score}分`)
      
      responseData.scoreMessage = `🎉 获得 ${scoreResult.total_score} 分！(${scoreDetails.join(' + ')})`
      responseData.streakMessage = `连续记录 ${scoreResult.current_streak} 天`
      
      // 里程碑成就提示
      if (scoreResult.bonus_details && scoreResult.bonus_details.length > 0) {
        const achievements = scoreResult.bonus_details.map(bonus => bonus.name).join('、')
        responseData.achievementMessage = `🏆 达成成就：${achievements}！`
      }
    }
    
    return res.json(responseData)

  } catch (error) {
    console.error('[addRecordPWA] 错误:', error)
    return res.status(500).json({ 
      error: '添加记录失败，请重试',
      details: error.message
    })
  }
}

// PWA独立记录积分计算 - 与主系统逻辑保持一致
async function calculateRecordScorePWA(userId, date, recordType = 'record') {
  try {
    const ymd = date.toISOString().slice(0, 10)
    console.log(`[calculateRecordScorePWA] 用户${userId} 日期${ymd} 类型${recordType}`)
    
    // 1. 检查今天是否已经有积分记录
    const { data: existingScore } = await supabase
      .from('user_daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('ymd', ymd)
      .maybeSingle()
    
    if (existingScore) {
      console.log(`[calculateRecordScorePWA] 今日已有记录，跳过重复计算`)
      return existingScore
    }
    
    // 2. 计算积分 - 根据记录类型区分处理
    let baseScore, streakScore, bonusScore = 0
    const bonusDetails = []
    
    // 计算连续天数
    const currentStreak = await calculateCurrentStreakPWA(userId, ymd)
    
    if (recordType === 'profile_complete') {
      // 完整个人资料奖励
      baseScore = 5  // 完整资料基础分5分
      streakScore = 0 // 资料设置不计算连续分
      bonusScore = 15 // 完整资料奖励15分
      bonusDetails.push({
        score: bonusScore,
        name: '完整个人资料奖励'
      })
      console.log(`[calculateRecordScorePWA] 完整个人资料设置，获得${baseScore + bonusScore}分奖励`)
      
    } else if (recordType === 'profile_partial') {
      // 部分个人资料奖励
      baseScore = 2  // 部分资料基础分2分
      streakScore = 0 // 资料设置不计算连续分
      bonusScore = 5  // 部分资料奖励5分
      bonusDetails.push({
        score: bonusScore,
        name: '个人资料设置奖励'
      })
      console.log(`[calculateRecordScorePWA] 个人资料部分设置，获得${baseScore + bonusScore}分奖励`)
      
    } else {
      // 普通记录积分计算
      baseScore = 1  // 基础分固定1分
      streakScore = currentStreak > 1 ? 1 : 0 // 连续记录获得1分
      
      // 里程碑奖励计算 - 从数据库获取配置
      const { data: milestones } = await supabase
        .from('score_milestones')
        .select('streak_days, bonus_score, milestone_name')
        .order('streak_days')
        
      if (milestones && milestones.length > 0) {
        for (const milestone of milestones) {
          if (currentStreak === milestone.streak_days) {
            bonusDetails.push({
              score: milestone.bonus_score,
              name: milestone.milestone_name
            })
            bonusScore += milestone.bonus_score
            console.log(`[calculateRecordScorePWA] 达成${milestone.streak_days}天里程碑，获得${milestone.bonus_score}分奖励`)
          }
        }
      }
    }
    
    const scoreData = {
      user_id: userId,
      ymd: ymd,
      base_score: baseScore,
      streak_score: streakScore,
      bonus_score: bonusScore,
      current_streak: currentStreak,
      record_type: recordType,
      bonus_details: bonusDetails
    }
    
    // 3. 保存积分记录
    const { data: savedScore, error } = await supabase
      .from('user_daily_scores')
      .insert(scoreData)
      .select()
      .single()
    
    if (error) {
      console.error('[calculateRecordScorePWA] 保存失败:', error)
      throw error
    }
    
    // 4. 更新 user_profile 的最后记录时间
    try {
      await supabase
        .from('user_profile')
        .update({ 
          last_record: ymd
        })
        .eq('user_id', userId)
      
      console.log(`[calculateRecordScorePWA] 已更新最后记录时间`)
    } catch (syncError) {
      console.error('[calculateRecordScorePWA] 同步 user_profile 失败 (不影响积分):', syncError)
    }
    
    console.log(`[calculateRecordScorePWA] 积分保存成功: ${savedScore.total_score}分`)
    
    return savedScore
    
  } catch (error) {
    console.error('[calculateRecordScorePWA] 错误:', error)
    throw error
  }
}

// ========================================
// 辅助函数
// ========================================

// 检查用户资料完成度
function checkProfileCompleteness(profile) {
  if (!profile) return false
  
  const requiredFields = [
    'monthly_income', // 月收入
    'a_pct', // A类百分比
    'travel_budget_annual', // 年度旅游预算
    'annual_medical_insurance', // 年度医疗保险
    'annual_car_insurance' // 年度车险
  ]
  
  return requiredFields.every(field => {
    const value = profile[field]
    return value !== null && value !== undefined && value !== '' && value > 0
  })
}

// ========================================
// 管理员连续天数管理功能
// ========================================

// 获取所有用户的连续天数数据
async function getAdminStreakData(res) {
  try {
    console.log('[getAdminStreakData] 加载用户连续天数数据')
    
    // 获取所有用户基本信息和连续天数
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        telegram_id,
        branch_code,
        joined_date,
        user_profile!left (
          current_streak,
          total_records,
          last_record_date
        ),
        user_daily_scores!left (
          current_streak,
          ymd
        )
      `)
      .order('name')
    
    if (usersError) throw usersError
    
    // 处理每个用户的连续天数数据
    const processedUsers = await Promise.all(users.map(async user => {
      // 从 user_profile 获取当前连续天数
      const profileStreak = user.user_profile?.current_streak || 0
      
      // 获取该用户最新的积分记录中的连续天数
      const { data: latestScore } = await supabase
        .from('user_daily_scores')
        .select('current_streak, ymd')
        .eq('user_id', user.id)
        .order('ymd', { ascending: false })
        .limit(1)
        .single()
      
      const scoreStreak = latestScore?.current_streak || 0
      
      // 计算实际连续天数（重新计算）
      const actualStreak = await calculateCurrentStreakPWA(user.id, new Date().toISOString().slice(0, 10))
      
      // 获取历史最长连续天数
      const { data: maxStreakRecord } = await supabase
        .from('user_daily_scores')
        .select('current_streak')
        .eq('user_id', user.id)
        .order('current_streak', { ascending: false })
        .limit(1)
        .single()
      
      const maxStreak = maxStreakRecord?.current_streak || 0
      
      // 检查是否活跃（最近7天内有记录）
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data: recentRecords } = await supabase
        .from('records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1)
      
      const isActive = recentRecords && recentRecords.length > 0
      
      return {
        id: user.id,
        name: user.name,
        telegram_id: user.telegram_id,
        branch: user.branch_code,
        currentStreak: profileStreak, // 使用 profile 中的值作为显示
        actualStreak: actualStreak,   // 实际计算的值
        scoreStreak: scoreStreak,     // 积分记录中的值
        maxStreak: maxStreak,
        lastRecordDate: user.user_profile?.last_record_date,
        isActive: isActive,
        joinedDate: user.joined_date
      }
    }))
    
    // 分析连续天数异常
    const issues = processedUsers
      .filter(user => user.currentStreak !== user.actualStreak)
      .map(user => ({
        userId: user.id,
        userName: user.name,
        branch: user.branch,
        currentStreak: user.currentStreak,
        expectedStreak: user.actualStreak,
        type: 'calculation_mismatch'
      }))
    
    return res.status(200).json({
      success: true,
      users: processedUsers,
      issues: issues,
      summary: {
        totalUsers: processedUsers.length,
        activeUsers: processedUsers.filter(u => u.isActive).length,
        issuesFound: issues.length
      }
    })
    
  } catch (error) {
    console.error('[getAdminStreakData] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 分析所有用户的连续天数问题
async function analyzeStreaks(res) {
  try {
    console.log('[analyzeStreaks] 开始分析连续天数问题')
    
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        branch_code,
        user_profile!left (current_streak)
      `)
    
    if (error) throw error
    
    const issues = []
    const today = new Date().toISOString().slice(0, 10)
    
    // 检查每个用户
    for (const user of users) {
      const profileStreak = user.user_profile?.current_streak || 0
      const actualStreak = await calculateCurrentStreakPWA(user.id, today)
      
      if (profileStreak !== actualStreak) {
        issues.push({
          userId: user.id,
          userName: user.name,
          branch: user.branch_code,
          currentStreak: profileStreak,
          expectedStreak: actualStreak,
          type: 'calculation_mismatch',
          description: `连续天数不匹配: 记录${profileStreak}天 vs 实际${actualStreak}天`
        })
      }
    }
    
    console.log(`[analyzeStreaks] 完成分析，发现 ${issues.length} 个问题`)
    
    return res.status(200).json({
      success: true,
      issues: issues,
      summary: {
        totalUsers: users.length,
        issuesFound: issues.length
      }
    })
    
  } catch (error) {
    console.error('[analyzeStreaks] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 批量修复连续天数
async function fixAllStreaks(userIds, res) {
  try {
    console.log('[fixAllStreaks] 开始批量修复连续天数', userIds)
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: '无效的用户ID列表' })
    }
    
    let fixed = 0
    const today = new Date().toISOString().slice(0, 10)
    
    for (const userId of userIds) {
      try {
        // 重新计算连续天数
        const actualStreak = await calculateCurrentStreakPWA(userId, today)
        
        // 更新 user_profile 中的连续天数
        const { error: updateError } = await supabase
          .from('user_profile')
          .update({ current_streak: actualStreak })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error(`[fixAllStreaks] 用户 ${userId} 更新失败:`, updateError)
        } else {
          fixed++
          console.log(`[fixAllStreaks] 用户 ${userId} 连续天数已修复为 ${actualStreak}`)
        }
        
      } catch (userError) {
        console.error(`[fixAllStreaks] 修复用户 ${userId} 失败:`, userError)
      }
    }
    
    return res.status(200).json({
      success: true,
      fixed: fixed,
      total: userIds.length,
      message: `成功修复 ${fixed}/${userIds.length} 个用户的连续天数`
    })
    
  } catch (error) {
    console.error('[fixAllStreaks] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 修复单个用户的连续天数
async function fixUserStreak(userId, res) {
  try {
    console.log('[fixUserStreak] 修复用户连续天数:', userId)
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' })
    }
    
    const today = new Date().toISOString().slice(0, 10)
    
    // 重新计算连续天数
    const actualStreak = await calculateCurrentStreakPWA(userId, today)
    
    // 更新 user_profile
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ current_streak: actualStreak })
      .eq('user_id', userId)
    
    if (updateError) throw updateError
    
    // 更新最新的积分记录（如果存在）
    const { data: latestScore } = await supabase
      .from('user_daily_scores')
      .select('ymd')
      .eq('user_id', userId)
      .order('ymd', { ascending: false })
      .limit(1)
      .single()
    
    if (latestScore) {
      const { error: scoreUpdateError } = await supabase
        .from('user_daily_scores')
        .update({ current_streak: actualStreak })
        .eq('user_id', userId)
        .eq('ymd', latestScore.ymd)
      
      if (scoreUpdateError) {
        console.error('[fixUserStreak] 更新积分记录失败:', scoreUpdateError)
      }
    }
    
    console.log(`[fixUserStreak] 用户 ${userId} 连续天数已修复为 ${actualStreak}`)
    
    return res.status(200).json({
      success: true,
      userId: userId,
      newStreak: actualStreak,
      message: '连续天数已重新计算并修复'
    })
    
  } catch (error) {
    console.error('[fixUserStreak] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 手动调整用户连续天数
async function adjustUserStreak(userId, newStreak, reason, res) {
  try {
    console.log('[adjustUserStreak] 手动调整连续天数:', { userId, newStreak, reason })
    
    if (!userId || newStreak === undefined || !reason) {
      return res.status(400).json({ error: '缺少必要参数：用户ID、新连续天数或调整原因' })
    }
    
    if (newStreak < 0) {
      return res.status(400).json({ error: '连续天数不能小于0' })
    }
    
    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, branch_code')
      .eq('id', userId)
      .single()
    
    if (userError) throw userError
    
    // 更新 user_profile
    const { error: updateError } = await supabase
      .from('user_profile')
      .update({ 
        current_streak: newStreak,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (updateError) throw updateError
    
    // 记录调整历史（如果有audit表的话）
    try {
      const auditRecord = {
        user_id: userId,
        action: 'manual_streak_adjustment',
        old_value: null, // 可以查询获取旧值
        new_value: newStreak,
        reason: reason,
        admin_user: 'AUSTIN', // 管理员用户
        created_at: new Date().toISOString()
      }
      
      // 如果有audit表就记录，没有就跳过
      await supabase.from('admin_audit_log').insert(auditRecord)
    } catch (auditError) {
      console.log('[adjustUserStreak] 审计日志记录跳过:', auditError.message)
    }
    
    console.log(`[adjustUserStreak] 用户 ${user.name} 的连续天数已手动调整为 ${newStreak}，原因：${reason}`)
    
    return res.status(200).json({
      success: true,
      userId: userId,
      userName: user.name,
      newStreak: newStreak,
      reason: reason,
      message: '连续天数已成功调整'
    })
    
  } catch (error) {
    console.error('[adjustUserStreak] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 获取分院列表及用户统计
async function getBranchList(res) {
  try {
    console.log('[getBranchList] 获取分院列表')
    
    // 获取所有分院信息
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .order('code')
    
    if (branchError) throw branchError
    
    // 获取每个分院的用户数量
    const branchesWithCounts = await Promise.all(
      branches.map(async (branch) => {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('branch_code', branch.code)
        
        if (countError) {
          console.error(`获取分院 ${branch.code} 用户数量失败:`, countError)
          return { ...branch, user_count: 0 }
        }
        
        return { ...branch, user_count: count || 0 }
      })
    )
    
    return res.status(200).json({
      success: true,
      data: branchesWithCounts
    })
    
  } catch (error) {
    console.error('[getBranchList] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 添加新分院
async function addBranch(name, code, description, res) {
  try {
    console.log('[addBranch] 添加分院:', { name, code, description })
    
    if (!name || !code) {
      return res.status(400).json({ error: '分院名称和代码不能为空' })
    }
    
    // 检查代码是否已存在
    const { data: existing, error: checkError } = await supabase
      .from('branches')
      .select('code')
      .eq('code', code)
      .single()
    
    if (existing) {
      return res.status(400).json({ error: '分院代码已存在，请使用其他代码' })
    }
    
    // 插入新分院
    const { data, error } = await supabase
      .from('branches')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    
    console.log('[addBranch] 分院添加成功:', data)
    
    return res.status(200).json({
      success: true,
      data: data,
      message: '分院添加成功'
    })
    
  } catch (error) {
    console.error('[addBranch] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 更新分院信息
async function updateBranch(branchId, name, description, res) {
  try {
    console.log('[updateBranch] 更新分院:', { branchId, name, description })
    
    if (!branchId || !name) {
      return res.status(400).json({ error: '分院ID和名称不能为空' })
    }
    
    // 更新分院信息
    const { data, error } = await supabase
      .from('branches')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', branchId)
      .select()
      .single()
    
    if (error) throw error
    
    if (!data) {
      return res.status(404).json({ error: '分院不存在' })
    }
    
    console.log('[updateBranch] 分院更新成功:', data)
    
    return res.status(200).json({
      success: true,
      data: data,
      message: '分院信息更新成功'
    })
    
  } catch (error) {
    console.error('[updateBranch] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 删除分院
async function deleteBranch(branchId, res) {
  try {
    console.log('[deleteBranch] 删除分院:', branchId)
    
    if (!branchId) {
      return res.status(400).json({ error: '分院ID不能为空' })
    }
    
    // 首先检查分院是否存在
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('code, name')
      .eq('id', branchId)
      .single()
    
    if (branchError || !branch) {
      return res.status(404).json({ error: '分院不存在' })
    }
    
    // 检查是否有用户属于该分院
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('branch_code', branch.code)
    
    if (countError) throw countError
    
    if (count > 0) {
      return res.status(400).json({ 
        error: `无法删除分院：该分院还有 ${count} 个用户，请先转移或删除用户后再删除分院` 
      })
    }
    
    // 删除分院
    const { error: deleteError } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId)
    
    if (deleteError) throw deleteError
    
    console.log('[deleteBranch] 分院删除成功:', branch.name)
    
    return res.status(200).json({
      success: true,
      message: `分院 "${branch.name}" 删除成功`
    })
    
  } catch (error) {
    console.error('[deleteBranch] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 删除用户及相关数据
async function deleteUser(userId, reason, adminUser, res) {
  try {
    console.log('[deleteUser] 删除用户:', { userId, reason, adminUser })
    
    if (!userId || !reason) {
      return res.status(400).json({ error: '用户ID和删除原因不能为空' })
    }
    
    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, telegram_id, branch_code')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    console.log('[deleteUser] 开始删除用户相关数据:', user.name)
    
    // 开始事务操作，删除用户相关的所有数据
    const deleteOperations = []
    
    // 1. 删除用户记录
    deleteOperations.push(
      supabase.from('records').delete().eq('user_id', userId)
    )
    
    // 2. 删除用户资料
    deleteOperations.push(
      supabase.from('user_profile').delete().eq('user_id', userId)
    )
    
    // 3. 删除日积分记录
    deleteOperations.push(
      supabase.from('user_daily_scores').delete().eq('user_id', userId)
    )
    
    // 4. 删除月度积分汇总
    deleteOperations.push(
      supabase.from('user_monthly_summary').delete().eq('user_id', userId)
    )
    
    // 5. 删除用户表记录
    deleteOperations.push(
      supabase.from('users').delete().eq('id', userId)
    )
    
    // 执行所有删除操作
    const results = await Promise.allSettled(deleteOperations)
    
    // 检查是否有失败的操作
    let hasErrors = false
    results.forEach((result, index) => {
      if (result.status === 'rejected' || result.value?.error) {
        const error = result.reason || result.value.error
        console.error(`删除操作 ${index + 1} 失败:`, error)
        hasErrors = true
      }
    })
    
    // 记录删除操作到审计日志
    try {
      const auditRecord = {
        user_id: userId,
        action: 'delete_user',
        old_value: JSON.stringify({
          name: user.name,
          telegram_id: user.telegram_id,
          branch_code: user.branch_code
        }),
        new_value: null,
        reason: reason,
        admin_user: adminUser || 'SYSTEM',
        created_at: new Date().toISOString()
      }
      
      await supabase.from('admin_audit_log').insert(auditRecord)
    } catch (auditError) {
      console.log('[deleteUser] 审计日志记录失败:', auditError.message)
    }
    
    if (hasErrors) {
      return res.status(500).json({
        success: false,
        error: '用户删除过程中出现部分错误，请检查系统日志'
      })
    }
    
    console.log(`[deleteUser] 用户 ${user.name} 及所有相关数据已删除，原因：${reason}`)
    
    return res.status(200).json({
      success: true,
      message: `用户 "${user.name}" 及所有相关数据已成功删除`,
      deletedUser: {
        name: user.name,
        telegram_id: user.telegram_id,
        branch_code: user.branch_code
      },
      reason: reason
    })
    
  } catch (error) {
    console.error('[deleteUser] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 获取所有分院列表（简化版）
async function getAllBranches(res) {
  try {
    console.log('[getAllBranches] 获取所有分院列表')
    
    // 从现有的branch-list逻辑复用，但返回格式简化
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, code, name, description')
      .order('code')
    
    if (branchError) throw branchError
    
    return res.status(200).json({
      success: true,
      branches: branches || []
    })
    
  } catch (error) {
    console.error('[getAllBranches] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 获取指定分院的用户列表
async function getBranchUsers(branchCode, res) {
  try {
    console.log('[getBranchUsers] 获取分院用户:', branchCode)
    
    if (!branchCode) {
      return res.status(400).json({ error: '分院代码不能为空' })
    }
    
    // 获取该分院的所有用户
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, telegram_id, branch_code, created_at')
      .eq('branch_code', branchCode)
      .eq('status', 'active')  // 只显示活跃用户
      .order('created_at', { ascending: false })
    
    if (userError) throw userError
    
    console.log(`[getBranchUsers] 找到 ${users?.length || 0} 个用户`)
    
    return res.status(200).json({
      success: true,
      users: users || []
    })
    
  } catch (error) {
    console.error('[getBranchUsers] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 修改用户的分院
async function changeUserBranch(userId, newBranchCode, res) {
  try {
    console.log('[changeUserBranch] 修改用户分院:', { userId, newBranchCode })
    
    if (!userId || !newBranchCode) {
      return res.status(400).json({ error: '用户ID和新分院代码不能为空' })
    }
    
    // 1. 验证新分院是否存在
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('code, name')
      .eq('code', newBranchCode)
      .single()
    
    if (branchError || !branch) {
      return res.status(400).json({ error: '目标分院不存在' })
    }
    
    // 2. 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, branch_code')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    // 3. 更新用户的分院
    const { error: updateError } = await supabase
      .from('users')
      .update({
        branch_code: newBranchCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) throw updateError
    
    // 4. 记录操作日志
    try {
      const auditRecord = {
        user_id: userId,
        action: 'change_branch',
        old_value: user.branch_code,
        new_value: newBranchCode,
        reason: `管理员操作：将用户从 ${user.branch_code} 转移到 ${newBranchCode}`,
        admin_user: 'ADMIN',
        created_at: new Date().toISOString()
      }
      
      await supabase.from('admin_audit_log').insert(auditRecord)
    } catch (auditError) {
      console.log('[changeUserBranch] 审计日志记录失败:', auditError.message)
    }
    
    console.log(`[changeUserBranch] 用户 ${user.name} 从 ${user.branch_code} 转移到 ${newBranchCode}`)
    
    return res.status(200).json({
      success: true,
      message: `用户 "${user.name}" 已成功转移到 "${branch.name || newBranchCode}"`,
      user: {
        id: userId,
        name: user.name,
        oldBranch: user.branch_code,
        newBranch: newBranchCode
      }
    })
    
  } catch (error) {
    console.error('[changeUserBranch] 错误:', error)
    return res.status(500).json({ error: error.message })
  }
}

// 获取分院详细数据（带权限验证）
async function getBranchDetail(branch, authKey, res) {
  try {
    console.log(`[getBranchDetail] 获取分院数据: ${branch}`)
    
    // 权限验证
    if (authKey !== 'PIC_Abcd1234') {
      return res.status(401).json({ error: 'Unauthorized', message: '权限验证失败' })
    }

    // 构建查询
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        telegram_id,
        branch_code,
        status,
        created_at
      `)
      .neq('status', 'test') // 排除测试用户

    // 如果指定了分院，添加过滤
    if (branch && branch !== 'ALL') {
      query = query.eq('branch_code', branch)
    }

    const { data: users, error: userError } = await query

    if (userError) {
      console.error('[getBranchDetail] 查询用户失败:', userError)
      throw userError
    }

    console.log(`[getBranchDetail] 找到 ${users?.length || 0} 个用户`)

    // 获取用户ID列表
    const userIds = users?.map(u => u.id) || []
    
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        branch: branch || 'ALL',
        total: 0,
        users: []
      })
    }

    // 获取user_profile信息
    const { data: profiles } = await supabase
      .from('user_profile')
      .select(`
        user_id,
        display_name,
        email,
        phone_e164,
        current_streak,
        max_streak,
        total_records,
        last_record_date,
        monthly_income,
        a_pct
      `)
      .in('user_id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

    // 获取积分统计
    const { data: scores } = await supabase
      .from('user_daily_scores')
      .select('user_id, total_score, current_streak')
      .in('user_id', userIds)

    // 计算每个用户的总积分
    const userScoreMap = {}
    scores?.forEach(score => {
      if (!userScoreMap[score.user_id]) {
        userScoreMap[score.user_id] = {
          total_score: 0,
          max_streak: 0,
          latest_streak: score.current_streak || 0
        }
      }
      userScoreMap[score.user_id].total_score += score.total_score || 0
      if (score.current_streak > userScoreMap[score.user_id].max_streak) {
        userScoreMap[score.user_id].max_streak = score.current_streak
      }
    })

    // 合并数据
    const processedUsers = users.map(user => {
      const profile = profileMap.get(user.id) || {}
      const scoreData = userScoreMap[user.id] || { total_score: 0, max_streak: 0, latest_streak: 0 }

      return {
        user_id: user.id,
        name: user.name,
        display_name: profile.display_name || user.name,
        telegram_id: user.telegram_id,
        branch_code: user.branch_code,
        email: profile.email,
        phone: profile.phone_e164,
        
        // 积分数据
        total_score: scoreData.total_score,
        current_streak: profile.current_streak || scoreData.latest_streak || 0,
        max_streak: profile.max_streak || scoreData.max_streak || 0,
        
        // 记录数据
        total_records: profile.total_records || 0,
        last_record_date: profile.last_record_date,
        
        // 财务数据
        monthly_income: profile.monthly_income || 0,
        a_pct: profile.a_pct || 0,
        
        // 其他
        status: user.status,
        joined_date: user.created_at
      }
    })

    // 按积分排序
    processedUsers.sort((a, b) => b.total_score - a.total_score)

    console.log(`[getBranchDetail] 返回 ${processedUsers.length} 个用户数据`)

    return res.status(200).json({
      success: true,
      branch: branch || 'ALL',
      total: processedUsers.length,
      users: processedUsers
    })

  } catch (error) {
    console.error('[getBranchDetail] 错误:', error)
    return res.status(500).json({
      error: '获取数据失败',
      details: error.message
    })
  }
}
