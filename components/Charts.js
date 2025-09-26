import { useState } from 'react'
import ModernCard from './ModernCard'

// 分类名称映射 - 与Telegram /my命令保持一致
const CATEGORY_NAMES = {
  // 开销类别 (Group A - Expenses)
  'food': '餐饮', '餐饮': '餐饮',
  'ent': '娱乐', '娱乐': '娱乐', 
  'shop': '购物', '购物': '购物',
  'transport': '交通', '交通': '交通',
  'utilities': '水电', '水电': '水电',
  'mobile': '手机', '手机': '手机',
  'home': '家用', '家用': '家用',
  'other': '其他', '其他': '其他',
  
  // 学习类别 (Group B - Learning)
  'books': '书籍', '书籍': '书籍',
  'course': '课程', '课程': '课程',
  'training': '培训', '培训': '培训',
  'cert': '认证', '认证': '认证',
  
  // 储蓄类别 (Group C - Savings)
  'stock': '股票', '股票': '股票',
  'fixed': '定存', '定存': '定存',
  'insurance': '保险', '保险': '保险',
  'emerg': '紧急基金', '紧急基金': '紧急基金',
  
  // 自动生成项目 (Auto-generated items)
  'ins_med_auto': '医疗保险（月）',
  'ins_car_auto': '车险（月）',
  'epf_auto': 'EPF（月）',
  'travel_auto': '旅游基金（月）',
  'balance': '余额',
  'overspent': '透支'
}

// 分类图标映射 - 与Telegram /my命令保持一致
const CATEGORY_ICONS = {
  // 开销类别 (Group A - Expenses)
  'food': '🍽️', '餐饮': '🍽️',
  'ent': '🎬', '娱乐': '🎬',
  'shop': '🛍️', '购物': '🛍️',
  'transport': '🚗', '交通': '🚗',
  'utilities': '💡', '水电': '💡',
  'mobile': '📱', '手机': '📱',
  'home': '🏠', '家用': '🏠',
  'other': '📦', '其他': '📦',
  
  // 学习类别 (Group B - Learning)
  'books': '📖', '书籍': '📖',
  'course': '📚', '课程': '📚',
  'training': '🎓', '培训': '🎓',
  'cert': '🏆', '认证': '🏆',
  
  // 储蓄类别 (Group C - Savings)  
  'stock': '📈', '股票': '📈',
  'fixed': '🏦', '定存': '🏦',
  'insurance': '🛡️', '保险': '🛡️',
  'emerg': '🚨', '紧急基金': '🚨',
  
  // 自动生成项目 (Auto-generated items)
  'ins_med_auto': '🏥',
  'ins_car_auto': '🚗',
  'epf_auto': '💰',
  'travel_auto': '✈️',
  'balance': '💵',
  'overspent': '⚠️'
}

// 条形图组件
export function BarChart({ title, data, maxValue, colors = ['#3B82F6', '#10B981', '#F59E0B'] }) {
  if (!data || data.length === 0) return null
  
  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const color = colors[index % colors.length]
          
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">RM {item.value.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-2">({item.percentage}%)</span>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </ModernCard>
  )
}

// 圆环图组件
export function DonutChart({ title, data, total, centerText, className = '' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  if (!data || data.length === 0) return null
  
  const radius = 80
  const strokeWidth = 20
  const center = 100
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercentage = 0
  
  return (
    <ModernCard className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* SVG圆环 */}
          <svg width="200" height="200" className="transform -rotate-90">
            {/* 背景圆环 */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            
            {/* 数据圆环 */}
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -((cumulativePercentage / 100) * circumference)
              
              cumulativePercentage += percentage
              
              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-300 ${hoveredIndex === index ? 'opacity-80' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </svg>
          
          {/* 中心文本 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                RM {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">{centerText}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 图例 */}
      <div className="grid grid-cols-1 gap-3">
        {data.map((item, index) => (
          <div 
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer ${
              hoveredIndex === index ? 'bg-gray-50 scale-105' : 'hover:bg-gray-50'
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium text-gray-700">{item.name}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-semibold text-gray-900">RM {item.value.toLocaleString()}</span>
              <span className="text-xs text-gray-500 block">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </ModernCard>
  )
}

// 详细分类明细组件
export function CategoryBredown({ title, categoryDetails, groupConfig }) {
  if (!categoryDetails || Object.keys(categoryDetails).length === 0) {
    return (
      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">暂无分类数据</p>
        </div>
      </ModernCard>
    )
  }
  
  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      <div className="space-y-6">
        {Object.entries(categoryDetails).map(([group, categories]) => {
          const config = groupConfig[group]
          if (!config || !categories || Object.keys(categories).length === 0) return null
          
          const groupTotal = Object.values(categories).reduce((sum, amount) => sum + amount, 0)
          
          return (
            <div key={group} className="border-l-4 pl-4" style={{ borderColor: config.color }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{config.icon}</span>
                  <h4 className="font-semibold text-gray-900">{config.name}</h4>
                </div>
                <span className="font-bold text-gray-900">RM {groupTotal.toLocaleString()}</span>
              </div>
              
              <div className="space-y-3 ml-8">
                {(() => {
                  // 合并同类项目（英文代码和中文标签指向同一项目）- 与Telegram /my命令逻辑一致
                  const mergedCategories = {}
                  for (const [category, amount] of Object.entries(categories)) {
                    const displayName = CATEGORY_NAMES[category] || category
                    mergedCategories[displayName] = (mergedCategories[displayName] || 0) + Number(amount)
                  }
                  
                  return Object.entries(mergedCategories)
                    .sort(([,a], [,b]) => b - a)
                    .map(([displayName, amount]) => {
                      // 找到对应的图标（优先使用英文代码的图标）
                      const iconKey = Object.keys(CATEGORY_NAMES).find(key => CATEGORY_NAMES[key] === displayName) || displayName
                      
                      return (
                        <div key={displayName} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">{CATEGORY_ICONS[iconKey] || '📦'}</span>
                            <span className="text-gray-700">{displayName}</span>
                          </div>
                          <span className="font-medium text-gray-900">RM {amount.toLocaleString()}</span>
                        </div>
                      )
                    })
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </ModernCard>
  )
}

export { CATEGORY_NAMES, CATEGORY_ICONS }