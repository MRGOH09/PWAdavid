// LEARNER CLUB 统一品牌头部组件
export default function BrandHeader() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white px-4 py-3 text-center shadow-lg">
      <div className="flex items-center justify-center space-x-2">
        <span className="text-2xl">🎯</span>
        <div>
          <h1 className="text-lg font-bold tracking-wide">LEARNER CLUB</h1>
          <p className="text-xs opacity-90">学习改变命运 · 记录成就未来</p>
        </div>
        <span className="text-2xl">📚</span>
      </div>
    </div>
  )
}

// 页面特定头部组件
export function PageHeader({ 
  title, 
  subtitle, 
  onBack, 
  rightButton,
  showBackButton = true 
}) {
  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-6 pb-24 relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 opacity-10">
        <div className="w-64 h-64 rounded-full bg-white transform translate-x-20 -translate-y-20"></div>
      </div>
      <div className="absolute bottom-0 left-0 opacity-5">
        <div className="w-48 h-48 rounded-full bg-white transform -translate-x-12 translate-y-12"></div>
      </div>
      
      {/* 内容 */}
      <div className="relative z-10 flex justify-between items-center text-white">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {showBackButton && onBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <span className="text-xl">←</span>
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold mb-1 flex items-center space-x-2 flex-wrap">
              {title}
            </h1>
            {subtitle && (
              <p className="text-blue-100 text-xs leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        
        {rightButton && (
          <div className="ml-3 flex-shrink-0">
            {rightButton}
          </div>
        )}
      </div>
    </div>
  )
}