import { useRouter } from 'next/router'

export default function PageHeader({ title, subtitle, onBack, showBackButton = true }) {
  const router = useRouter()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }
  
  return (
    <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white pt-12 pb-24">
      {/* 返回按钮 */}
      {showBackButton && (
        <div className="absolute top-12 left-4 z-20">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
          </button>
        </div>
      )}
      
      {/* 标题内容 */}
      <div className="relative z-10 px-4 text-center">
        <h1 className="text-2xl font-bold mb-2 flex items-center justify-center space-x-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-blue-100 opacity-90">{subtitle}</p>
        )}
      </div>
      
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
    </div>
  )
}