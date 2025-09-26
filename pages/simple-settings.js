import { useState } from 'react'
import Head from 'next/head'

export default function SimpleSettings() {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadUserData = async () => {
    setLoading(true)
    setMessage('正在加载...')
    
    try {
      // 使用已验证工作的API
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'profile' })
      })

      if (response.ok) {
        const result = await response.json()
        setUserData(result)
        setMessage('✅ 数据加载成功')
      } else {
        setMessage(`❌ 加载失败: ${response.status}`)
      }
    } catch (error) {
      setMessage(`❌ 错误: ${error.message}`)
    }
    
    setLoading(false)
  }

  const updateField = async (field, value, tableName = 'user_profile', fieldName = null) => {
    setMessage(`正在更新 ${field}...`)
    
    try {
      // 映射字段名到数据库字段
      const fieldMapping = {
        '显示名称': 'display_name',
        '电话': 'phone_e164', 
        '邮箱': 'email',
        '月收入': 'monthly_income',
        'A类百分比': 'a_pct',
        '旅游预算': 'travel_budget_annual',
        '年度医疗保险': 'annual_medical_insurance',
        '年度车险': 'annual_car_insurance'
      }
      
      const dbField = fieldName || fieldMapping[field] || field
      
      // 调用更新API
      const response = await fetch('/api/pwa/test-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'update_field',
          tableName: tableName,
          fieldName: dbField,
          value: value
        })
      })

      const result = await response.json()
      
      if (response.ok && result.ok) {
        setMessage(`✅ ${field} 已更新为: ${value}`)
        // 1秒后重新加载数据以显示更新结果
        setTimeout(loadUserData, 1000)
      } else {
        setMessage(`❌ 更新失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      setMessage(`❌ 更新错误: ${error.message}`)
    }
  }

  return (
    <>
      <Head>
        <title>简单Settings测试 - LEARNER CLUB</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          
          <div className="bg-green-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">⚙️ 简单Settings测试</h1>
            <p className="text-green-100">使用已验证的API端点测试用户数据</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <button
              onClick={loadUserData}
              disabled={loading}
              className={`w-full p-4 rounded-lg font-semibold text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '🔄 加载中...' : '📋 加载用户数据'}
            </button>
            
            {message && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
                {message}
              </div>
            )}
          </div>

          {userData && (
            <div className="space-y-6">
              
              {/* 用户基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">👤 用户信息</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">姓名</label>
                    <div className="mt-1 text-lg">{userData.user?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">分行</label>
                    <div className="mt-1 text-lg">{userData.user?.branch || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">加入日期</label>
                    <div className="mt-1 text-sm text-gray-500">
                      {userData.user?.joined_date ? new Date(userData.user.joined_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Telegram ID</label>
                    <div className="mt-1 text-sm text-gray-500">{userData.user?.telegram_id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* 个人资料 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">📝 个人资料</h2>
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">显示名称</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          id="display_name"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.display_name || ''}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('display_name').value
                            updateField('显示名称', value)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">电话</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          id="phone_e164"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.phone || ''}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('phone_e164').value
                            updateField('电话', value)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">邮箱</label>
                      <div className="flex gap-2">
                        <input 
                          type="email"
                          id="email"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.email || ''}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('email').value
                            updateField('邮箱', value)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">月收入</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          id="monthly_income"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.income || 0}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('monthly_income').value
                            updateField('月收入', parseFloat(value) || 0)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">A类支出百分比 (%)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          id="a_pct"
                          min="0" max="100"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.a_pct || 0}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('a_pct').value
                            updateField('A类百分比', parseInt(value) || 0)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">年度旅游预算</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          id="travel_budget_annual"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.travel_budget || 0}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('travel_budget_annual').value
                            updateField('旅游预算', parseFloat(value) || 0)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">年度医疗保险 (RM)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          id="annual_medical_insurance"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.annual_medical_insurance || 0}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('annual_medical_insurance').value
                            updateField('年度医疗保险', parseFloat(value) || 0)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        月度分摊: RM {((userData.profile?.annual_medical_insurance || 0) / 12).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">年度车险 (RM)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          id="annual_car_insurance"
                          className="mt-1 flex-1 p-2 border border-gray-300 rounded-lg focus:border-blue-500"
                          defaultValue={userData.profile?.annual_car_insurance || 0}
                        />
                        <button
                          onClick={() => {
                            const value = document.getElementById('annual_car_insurance').value
                            updateField('年度车险', parseFloat(value) || 0)
                          }}
                          className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        月度分摊: RM {((userData.profile?.annual_car_insurance || 0) / 12).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <h3 className="font-semibold text-blue-800 mb-2">💡 自动计算说明</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>EPF (固定24%)</strong>: RM {((userData.profile?.income || 0) * 0.24).toFixed(2)}/月</p>
                      <p><strong>旅游基金</strong>: RM {((userData.profile?.travel_budget || 0) / 12).toFixed(2)}/月</p>
                      <p><strong>医疗保险</strong>: RM {((userData.profile?.annual_medical_insurance || 0) / 12).toFixed(2)}/月</p>
                      <p><strong>车险</strong>: RM {((userData.profile?.annual_car_insurance || 0) / 12).toFixed(2)}/月</p>
                      <p className="text-xs mt-2">这些金额会自动分摊到每月的相应分类中</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* 统计信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">📊 统计数据</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userData.stats?.record_days || 0}</div>
                    <div className="text-sm text-blue-600">记录天数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userData.stats?.total_records || 0}</div>
                    <div className="text-sm text-green-600">总记录数</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{userData.stats?.current_streak || 0}</div>
                    <div className="text-sm text-orange-600">当前连续天数</div>
                  </div>
                </div>
              </div>

              {/* 原始数据 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">🔍 原始数据</h2>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
{JSON.stringify(userData, null, 2)}
                </pre>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}