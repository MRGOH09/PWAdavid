import { useState } from 'react'
import ModernCard from './ModernCard'

// 根据支出数据生成个性化建议
function generateSpendingInsights(data, categoryDetails) {
  const insights = []
  const { monthly, stats } = data
  
  // 基础数据
  const totalSpent = monthly.total_expenses
  const remaining = monthly.remaining_a
  const income = monthly.income
  const spentPercentage = income > 0 ? Math.round((totalSpent / income) * 100) : 0
  
  // 1. 总体支出分析
  if (spentPercentage > 80) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: '支出过高警告',
      message: `你已使用了收入的${spentPercentage}%，建议立即控制开销`,
      priority: 'high',
      suggestions: [
        '暂停非必要购物',
        '减少外出用餐频率',
        '寻找更便宜的替代品'
      ]
    })
  } else if (spentPercentage > 60) {
    insights.push({
      type: 'caution',
      icon: '🤔',
      title: '支出偏高',
      message: `支出占收入${spentPercentage}%，还有改进空间`,
      priority: 'medium',
      suggestions: [
        '制定每周预算计划',
        '比较价格后再购买',
        '减少冲动消费'
      ]
    })
  }
  
  // 2. A类开销分析（生活开销）
  const aPercentage = monthly.percentage_a
  if (aPercentage > 60) {
    insights.push({
      type: 'improvement',
      icon: '🛒',
      title: '生活开销优化',
      message: `生活开销占${aPercentage}%，可以优化`,
      priority: 'medium',
      suggestions: [
        '在家做饭替代外卖',
        '批量采购日用品',
        '使用优惠券和折扣'
      ]
    })
  }
  
  // 3. 分类支出分析
  if (categoryDetails.A) {
    const categories = Object.entries(categoryDetails.A).sort(([,a], [,b]) => b - a)
    const topCategory = categories[0]
    
    if (topCategory) {
      const [code, amount] = topCategory
      const categoryName = getCategoryDisplayName(code)
      
      if (amount > 1000) {
        insights.push({
          type: 'tip',
          icon: getCategoryIcon(code),
          title: `${categoryName}开销较大`,
          message: `本月${categoryName}支出RM ${amount.toLocaleString()}`,
          priority: 'low',
          suggestions: getCategorySuggestions(code, amount)
        })
      }
    }
  }
  
  // 4. 记录习惯分析
  if (stats.record_days < 5) {
    insights.push({
      type: 'habit',
      icon: '📝',
      title: '记录习惯需要改善',
      message: `本月只记录了${stats.record_days}天，建议每日记录`,
      priority: 'medium',
      suggestions: [
        '设置每日记账提醒',
        '使用快捷记录功能',
        '培养睡前记账习惯'
      ]
    })
  }
  
  // 5. 积极反馈
  if (remaining > 0 && spentPercentage < 60) {
    insights.push({
      type: 'positive',
      icon: '🎉',
      title: '支出控制良好',
      message: `还有RM ${remaining.toLocaleString()}预算余额`,
      priority: 'low',
      suggestions: [
        '考虑增加储蓄',
        '规划下月预算',
        '保持良好习惯'
      ]
    })
  }
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
  })
}

function getCategoryDisplayName(code) {
  const names = {
    'dining': '餐饮',
    'shopping': '购物', 
    'mobile': '手机',
    'transport': '交通',
    'entertainment': '娱乐',
    'utilities': '水电',
    'household': '家用'
  }
  return names[code] || '其他'
}

function getCategoryIcon(code) {
  const icons = {
    'dining': '🍽️',
    'shopping': '🛍️',
    'mobile': '📱', 
    'transport': '🚗',
    'entertainment': '🎬',
    'utilities': '💡',
    'household': '🏠'
  }
  return icons[code] || '📦'
}

function getCategorySuggestions(code, amount) {
  const suggestions = {
    'dining': [
      '尝试在家做饭，每周节省RM 200-300',
      '选择经济套餐而非单点',
      '使用餐厅会员卡和优惠'
    ],
    'shopping': [
      '列购物清单避免冲动消费',
      '比较不同商店价格',
      '等促销期再购买非必需品'
    ],
    'mobile': [
      '检查是否有更便宜的配套',
      '减少不必要的增值服务',
      '使用WiFi减少数据用量'
    ],
    'transport': [
      '考虑拼车或公共交通',
      '定期检查车辆以省油费',
      '合并出行减少油费'
    ],
    'entertainment': [
      '选择免费或低成本娱乐',
      '与朋友分摊娱乐费用',
      '寻找优惠票价和折扣'
    ]
  }
  return suggestions[code] || ['寻找更经济的替代方案', '比较价格后再购买', '减少非必要支出']
}

// 目标控制组件
export function BudgetControl({ data }) {
  if (!data) return null
  
  const { monthly } = data
  const remaining = monthly.remaining_a
  const budgetA = monthly.budget_a
  const spentA = monthly.spent_a
  const usagePercentage = budgetA > 0 ? Math.round((spentA / budgetA) * 100) : 0
  
  return (
    <ModernCard className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-semibold text-gray-900">目标控制</h3>
      </div>
      
      <div className="space-y-4">
        {/* 预算进度 */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">开销预算使用情况</span>
            <span className={`text-sm font-semibold ${
              usagePercentage > 80 ? 'text-red-600' : 
              usagePercentage > 60 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {usagePercentage}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                usagePercentage > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                usagePercentage > 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                'bg-gradient-to-r from-green-400 to-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>已用: RM {spentA.toLocaleString()}</span>
            <span>预算: RM {budgetA.toLocaleString()}</span>
          </div>
        </div>
        
        {/* 剩余额度 */}
        <div className="bg-white rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              RM {remaining.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">还可花费</div>
            {remaining > 0 && (
              <div className="text-xs text-green-600 mt-2">
                💡 开销控制良好！剩余额度 RM {remaining.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModernCard>
  )
}

// 记录统计组件
export function RecordStatistics({ data }) {
  if (!data) return null
  
  const { stats, monthly } = data
  
  return (
    <ModernCard className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-2xl">📝</span>
        <h3 className="text-lg font-semibold text-gray-900">记录统计</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.monthly_records}</div>
          <div className="text-sm text-gray-600">记录笔数</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.record_days}</div>
          <div className="text-sm text-gray-600">记录天数</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.avg_per_day}</div>
          <div className="text-sm text-gray-600">平均每天</div>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{stats.current_streak}</div>
          <div className="text-sm text-gray-600">连续记录</div>
        </div>
      </div>
      
      {monthly.days_left > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">
            本月还有 <span className="font-semibold text-gray-900">{monthly.days_left}</span> 天
          </span>
        </div>
      )}
    </ModernCard>
  )
}

// 智能建议主组件
export default function SpendingInsights({ data, categoryDetails }) {
  const [expandedInsight, setExpandedInsight] = useState(null)
  
  if (!data) return null
  
  const insights = generateSpendingInsights(data, categoryDetails)
  
  if (insights.length === 0) {
    return (
      <ModernCard className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">💡</span>
          <h3 className="text-lg font-semibold text-gray-900">智能建议</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">继续保持良好的理财习惯！</p>
        </div>
      </ModernCard>
    )
  }
  
  return (
    <ModernCard className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-2xl">💡</span>
        <h3 className="text-lg font-semibold text-gray-900">智能建议</h3>
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const isExpanded = expandedInsight === index
          const bgColors = {
            warning: 'bg-red-50 border-red-200',
            caution: 'bg-yellow-50 border-yellow-200', 
            improvement: 'bg-blue-50 border-blue-200',
            tip: 'bg-purple-50 border-purple-200',
            habit: 'bg-indigo-50 border-indigo-200',
            positive: 'bg-green-50 border-green-200'
          }
          
          return (
            <div 
              key={index}
              className={`rounded-lg border-2 transition-all duration-200 ${bgColors[insight.type] || 'bg-gray-50 border-gray-200'}`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedInsight(isExpanded ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600">{insight.message}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="bg-white rounded-lg p-4 ml-8">
                    <h5 className="font-medium text-gray-900 mb-3">💡 建议行动：</h5>
                    <ul className="space-y-2">
                      {insight.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ModernCard>
  )
}