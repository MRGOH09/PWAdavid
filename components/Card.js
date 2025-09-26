export default function Card({ 
  children, 
  className = '', 
  padding = true,
  shadow = true,
  hover = false
}) {
  return (
    <div className={`
      bg-white 
      rounded-lg 
      ${shadow ? 'shadow-sm' : ''} 
      ${padding ? 'p-4' : ''} 
      ${hover ? 'hover:shadow-md transition-shadow' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-3 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

// 统计数字卡片
export function StatCard({ 
  label, 
  value, 
  suffix = '', 
  color = 'gray',
  icon = null,
  trend = null,
  onClick = null
}) {
  const colorClasses = {
    gray: 'text-gray-600 bg-gray-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50'
  }
  
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      className={`
        text-center rounded-lg transition-colors
        ${colorClasses[color] || colorClasses.gray}
        ${onClick ? 'hover:shadow-md cursor-pointer active:scale-95' : ''}
      `}
      style={{ padding: '12px' }}
      onClick={onClick}
    >
      {icon && (
        <div className="text-xl mb-1">{icon}</div>
      )}
      
      <div className="flex items-baseline justify-center space-x-1">
        <span className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {suffix && (
          <span className="text-sm font-medium opacity-75">{suffix}</span>
        )}
      </div>
      
      <p className="text-sm font-medium opacity-75 mt-1">{label}</p>
      
      {trend && (
        <div className={`text-xs mt-1 ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
        </div>
      )}
    </Component>
  )
}

// 进度条卡片
export function ProgressCard({ 
  label, 
  current, 
  target, 
  color = 'blue',
  formatValue = (v) => v 
}) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const isOverBudget = current > target && target > 0
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500'
  }
  
  return (
    <Card>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-medium ${
          isOverBudget ? 'text-red-600' : 'text-gray-900'
        }`}>
          {formatValue(current)} / {formatValue(target)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isOverBudget ? 'bg-red-500' : colorClasses[color]
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">
          {percentage.toFixed(1)}%
        </span>
        {isOverBudget && (
          <span className="text-xs text-red-600 font-medium">
            超出 {formatValue(current - target)}
          </span>
        )}
      </div>
    </Card>
  )
}