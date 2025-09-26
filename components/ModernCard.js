import { useState } from 'react'

// 现代化卡片组件 - 参考支付宝/微信支付设计
export default function ModernCard({ 
  children, 
  className = '', 
  variant = 'default',
  glow = false,
  interactive = false
}) {
  const [isPressed, setIsPressed] = useState(false)
  
  const variants = {
    default: 'bg-white shadow-sm border border-gray-100',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg',
    glass: 'bg-white/80 backdrop-blur-sm shadow-lg border border-white/20',
    elevated: 'bg-white shadow-xl border-0'
  }
  
  const glowEffect = glow ? 'shadow-lg shadow-blue-500/20' : ''
  const interactiveEffect = interactive ? 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-200' : ''
  
  return (
    <div 
      className={`
        rounded-2xl overflow-hidden
        ${variants[variant]}
        ${glowEffect}
        ${interactiveEffect}
        ${className}
      `}
      onMouseDown={() => interactive && setIsPressed(true)}
      onMouseUp={() => interactive && setIsPressed(false)}
      onMouseLeave={() => interactive && setIsPressed(false)}
    >
      {children}
    </div>
  )
}

// 现代化数据展示卡片
export function DataCard({ icon, label, value, change, trend = 'neutral' }) {
  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500', 
    neutral: 'text-gray-500'
  }
  
  const trendIcons = {
    up: '📈',
    down: '📉',
    neutral: '➡️'
  }
  
  // 处理长数字的显示格式
  const formatValue = (val) => {
    if (typeof val === 'string' && val.startsWith('RM')) {
      const numStr = val.replace('RM ', '')
      const num = parseFloat(numStr.replace(/,/g, ''))
      if (num >= 10000) {
        return `RM ${(num / 1000).toFixed(1)}k`
      }
      return val
    }
    return val
  }
  
  return (
    <ModernCard variant="elevated" interactive className="p-4 text-center min-h-[180px] flex flex-col justify-between">
      {/* 图标背景 */}
      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
        <span className="text-xl">{icon}</span>
      </div>
      
      {/* 数值 - 使用更小的字体和换行处理 */}
      <div className="mb-2 min-h-[60px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 leading-tight break-words">
            {formatValue(value)}
          </div>
        </div>
      </div>
      
      {/* 标签和趋势 */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600 font-medium leading-tight">{label}</p>
        {change && (
          <div className={`flex items-center justify-center space-x-1 text-xs ${trendColors[trend]}`}>
            <span>{trendIcons[trend]}</span>
            <span className="font-medium">{change}</span>
          </div>
        )}
      </div>
    </ModernCard>
  )
}

// 金融级进度环组件  
export function CircularProgress({ percentage, size = 120, strokeWidth = 8, color = '#3B82F6' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 背景圆环 */}
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* 中心文本 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(percentage)}%
          </div>
          <div className="text-xs text-gray-500">
            完成度
          </div>
        </div>
      </div>
    </div>
  )
}

// 现代化余额卡片
export function BalanceCard({ income, spent, remaining, daysLeft }) {
  const spentPercentage = income > 0 ? (spent / income) * 100 : 0
  
  return (
    <ModernCard variant="gradient" className="p-6 text-white relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 opacity-10">
        <div className="w-32 h-32 rounded-full bg-white transform translate-x-8 -translate-y-8"></div>
      </div>
      <div className="absolute bottom-0 left-0 opacity-5">
        <div className="w-24 h-24 rounded-full bg-white transform -translate-x-4 translate-y-4"></div>
      </div>
      
      <div className="relative z-10">
        {/* 标题 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold opacity-90">本月总览</h3>
          <span className="text-sm opacity-75">还剩 {daysLeft} 天</span>
        </div>
        
        {/* 主要余额 */}
        <div className="text-center mb-6">
          <div className="text-sm opacity-75 mb-1">可用余额</div>
          <div className="text-4xl font-bold mb-2">
            RM {remaining.toLocaleString()}
          </div>
          <div className="text-sm opacity-75">
            收入 RM {income.toLocaleString()} • 已用 RM {spent.toLocaleString()}
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="bg-white/20 rounded-full h-2 mb-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
          />
        </div>
        <div className="text-xs opacity-75 text-center">
          {spentPercentage.toFixed(1)}% 已使用
        </div>
      </div>
    </ModernCard>
  )
}

// 现代化分类支出卡片
export function CategoryCard({ categories }) {
  const maxAmount = Math.max(...categories.map(c => c.amount))
  
  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">支出分类</h3>
      
      <div className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center space-x-4">
            {/* 图标 */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.bgColor}`}>
              <span className="text-xl">{category.icon}</span>
            </div>
            
            {/* 内容 */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-900">{category.name}</span>
                <span className="font-semibold text-gray-900">
                  RM {category.amount.toLocaleString()}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${category.color}`}
                  style={{ width: `${(category.amount / maxAmount) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">{category.percentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModernCard>
  )
}