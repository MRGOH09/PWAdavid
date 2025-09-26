import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function TestSettings() {
  const [userProfile, setUserProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [tempValue, setTempValue] = useState('')
  const [logs, setLogs] = useState([])

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  // 分院选项 - 从Telegram代码抄袭
  const BRANCH_CODES = [
    'PJY','BLS','OTK','PU','UKT','TLK','M2','BP','MTK','HQ','VIVA','STL','SRD','PDMR','KK','小天使'
  ]

  // 加载用户数据
  const loadUserData = async () => {
    setLoading(true)
    addLog('📋 正在加载用户数据...', 'info')
    
    try {
      const response = await fetch('/api/pwa/test-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'get_user_data' })
      })

      const result = await response.json()
      if (result.ok) {
        setUser(result.data.user)
        setUserProfile(result.data.profile)
        addLog(`✅ 用户数据加载成功`, 'success')
      } else {
        addLog(`❌ 加载失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 加载失败: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 更新字段值
  const updateField = async (fieldName, value, tableName = 'user_profile') => {
    setSaving(true)
    addLog(`📝 正在更新 ${fieldName}: ${value}`, 'info')
    
    try {
      const response = await fetch('/api/pwa/test-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'update_field',
          tableName,
          fieldName,
          value
        })
      })

      const result = await response.json()
      if (result.ok) {
        // 更新本地状态
        if (tableName === 'user_profile') {
          setUserProfile(prev => ({ ...prev, [fieldName]: value }))
        } else if (tableName === 'users') {
          setUser(prev => ({ ...prev, [fieldName]: value }))
        }
        
        addLog(`✅ ${fieldName} 更新成功`, 'success')
        setEditingField(null)
        setTempValue('')
      } else {
        addLog(`❌ 更新失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`❌ 更新失败: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  // 开始编辑字段
  const startEdit = (fieldName, currentValue) => {
    setEditingField(fieldName)
    setTempValue(currentValue || '')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingField(null)
    setTempValue('')
  }

  // 保存编辑
  const saveEdit = async () => {
    if (!editingField || !tempValue.trim()) return
    
    let tableName = 'user_profile'
    let fieldName = editingField
    let value = tempValue.trim()

    // 特殊字段处理
    switch (editingField) {
      case 'branch_code':
        tableName = 'users'
        break
      case 'monthly_income':
      case 'travel_budget_annual':
      case 'annual_medical_insurance':
      case 'annual_car_insurance':
        value = parseFloat(value)
        if (isNaN(value) || value < 0) {
          addLog(`❌ 请输入有效的金额`, 'error')
          return
        }
        break
      case 'a_pct':
        value = parseInt(value)
        if (isNaN(value) || value < 0 || value > 100) {
          addLog(`❌ 请输入0-100之间的百分比`, 'error')
          return
        }
        break
    }

    await updateField(fieldName, value, tableName)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>加载用户数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Settings 测试页面 - LEARNER CLUB</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          
          {/* 标题 */}
          <div className="bg-blue-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">⚙️ Settings 测试页面</h1>
            <p className="text-blue-100">测试Telegram Settings功能在PWA中的实现</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 当前资料显示 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📄 当前资料</h2>
              
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3 text-gray-800">基本信息</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>昵称:</span>
                      <span className="font-medium">{userProfile?.display_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>电话:</span>
                      <span className="font-medium">{userProfile?.phone_e164 || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>邮箱:</span>
                      <span className="font-medium">{userProfile?.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>分行:</span>
                      <span className="font-medium">{user?.branch_code || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 财务信息 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3 text-gray-800">财务设置</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>收入:</span>
                      <span className="font-medium">RM {userProfile?.monthly_income || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>生活开销占比:</span>
                      <span className="font-medium">{userProfile?.a_pct || '0'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>旅游年额:</span>
                      <span className="font-medium">RM {userProfile?.travel_budget_annual || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>年度医疗保险:</span>
                      <span className="font-medium">RM {userProfile?.annual_medical_insurance || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>年度车险:</span>
                      <span className="font-medium">RM {userProfile?.annual_car_insurance || '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 编辑面板 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🛠️ 修改设置</h2>
              
              {editingField ? (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-3">
                    正在编辑: {getFieldLabel(editingField)}
                  </h3>
                  
                  {editingField === 'branch_code' ? (
                    <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择分院</option>
                      {BRANCH_CODES.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={getInputType(editingField)}
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder={getPlaceholder(editingField)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {saving ? '保存中...' : '✅ 保存'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      ❌ 取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm mb-4">点击下方按钮开始编辑各个字段：</p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* 基本信息编辑按钮 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">基本信息</h4>
                      <button
                        onClick={() => startEdit('display_name', userProfile?.display_name)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">👤</span> 昵称
                      </button>
                      <button
                        onClick={() => startEdit('phone_e164', userProfile?.phone_e164)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">📱</span> 联系方式
                      </button>
                      <button
                        onClick={() => startEdit('email', userProfile?.email)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">📧</span> 电子邮箱
                      </button>
                      <button
                        onClick={() => startEdit('branch_code', user?.branch_code)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">🏢</span> 所属分行
                      </button>
                    </div>

                    {/* 财务设置编辑按钮 */}
                    <div className="space-y-2 mt-4">
                      <h4 className="font-medium text-gray-700">财务设置</h4>
                      <button
                        onClick={() => startEdit('monthly_income', userProfile?.monthly_income)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">💰</span> 月收入
                      </button>
                      <button
                        onClick={() => startEdit('a_pct', userProfile?.a_pct)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">📊</span> 生活开销占比
                      </button>
                      <button
                        onClick={() => startEdit('travel_budget_annual', userProfile?.travel_budget_annual)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">✈️</span> 年度旅游目标
                      </button>
                      <button
                        onClick={() => startEdit('annual_medical_insurance', userProfile?.annual_medical_insurance)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">🏥</span> 年度医疗保险
                      </button>
                      <button
                        onClick={() => startEdit('annual_car_insurance', userProfile?.annual_car_insurance)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border transition-colors"
                      >
                        <span className="text-blue-600">🚗</span> 年度车险
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作日志 */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">📋 操作日志</h2>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待操作...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setLogs([])}
              className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              清空日志
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// 辅助函数
function getFieldLabel(fieldName) {
  const labels = {
    'display_name': '昵称',
    'phone_e164': '联系方式',
    'email': '电子邮箱',
    'branch_code': '所属分行',
    'monthly_income': '月收入',
    'a_pct': '生活开销占比',
    'travel_budget_annual': '年度旅游目标',
    'annual_medical_insurance': '年度医疗保险',
    'annual_car_insurance': '年度车险'
  }
  return labels[fieldName] || fieldName
}

function getInputType(fieldName) {
  if (['monthly_income', 'travel_budget_annual', 'annual_medical_insurance', 'annual_car_insurance'].includes(fieldName)) {
    return 'number'
  }
  if (fieldName === 'a_pct') {
    return 'number'
  }
  if (fieldName === 'email') {
    return 'email'
  }
  return 'text'
}

function getPlaceholder(fieldName) {
  const placeholders = {
    'display_name': '输入昵称',
    'phone_e164': '输入电话号码，如：+60123456789',
    'email': '输入邮箱地址',
    'monthly_income': '输入月收入金额',
    'a_pct': '输入百分比 (0-100)',
    'travel_budget_annual': '输入年度旅游预算',
    'annual_medical_insurance': '输入年度医疗保险费用',
    'annual_car_insurance': '输入年度车险费用'
  }
  return placeholders[fieldName] || '输入值'
}