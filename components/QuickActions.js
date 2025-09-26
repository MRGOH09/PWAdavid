import { useRouter } from 'next/router'
import { useState } from 'react'

export default function QuickActions({ className = '' }) {
  const router = useRouter()
  const [showActions, setShowActions] = useState(false)

  const quickActions = [
    {
      icon: '💰',
      label: '快速记账',
      description: '单条+批量',
      color: 'bg-blue-500',
      action: () => router.push('/add-record')
    },
    {
      icon: '🧮',
      label: '计算器',
      description: '数学计算',
      color: 'bg-purple-500',
      action: () => router.push('/calculator')
    },
    {
      icon: '📊',
      label: '查看历史',
      description: '消费记录',
      color: 'bg-green-500',
      action: () => router.push('/history')
    },
    {
      icon: '🏆',
      label: '积分排行',
      description: '分院竞争',
      color: 'bg-orange-500',
      action: () => router.push('/leaderboard')
    },
    {
      icon: '⚙️',
      label: '应用设置',
      description: '通知设置',
      color: 'bg-gray-500',
      action: () => router.push('/settings')
    }
  ]

  return (
    <>
      {/* 快速操作按钮 */}
      <button
        onClick={() => setShowActions(!showActions)}
        className={`fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center ${className}`}
      >
        <span className={`text-xl transition-transform duration-300 ${showActions ? 'rotate-45' : ''}`}>
          ➕
        </span>
      </button>

      {/* 快速操作菜单 */}
      {showActions && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowActions(false)}
          />
          
          {/* 操作菜单 */}
          <div className="fixed bottom-36 right-4 z-50 space-y-3">
            {quickActions.map((action, index) => (
              <div
                key={action.label}
                className="flex items-center space-x-3 animate-in slide-in-from-right-2 duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 标签 */}
                <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-white/20">
                  <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-600">
                    {action.description}
                  </p>
                </div>
                
                {/* 操作按钮 */}
                <button
                  onClick={() => {
                    action.action()
                    setShowActions(false)
                  }}
                  className={`w-12 h-12 ${action.color} text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center`}
                >
                  <span className="text-lg">{action.icon}</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// 简化版快速记账按钮（仅记账功能）
export function QuickAddButton({ className = '' }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/add-record')}
      className={`fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center ${className}`}
    >
      <span className="text-xl">💰</span>
    </button>
  )
}