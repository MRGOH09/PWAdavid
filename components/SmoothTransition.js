import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import PWAClient from '../lib/api'
import { PagePreloader, smartCache } from '../lib/cache'

// 平滑页面切换组件
export function SmoothTransition({ children, className = '' }) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState('forward')
  const router = useRouter()
  const previousPath = useRef(router.pathname)

  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      // 判断切换方向
      const direction = url.length > router.pathname.length ? 'forward' : 'backward'
      setTransitionDirection(direction)
      setIsTransitioning(true)
      
      console.log(`🔄 页面切换开始: ${router.pathname} → ${url} (${direction})`)
    }

    const handleRouteChangeComplete = () => {
      setIsTransitioning(false)
      previousPath.current = router.pathname
      console.log(`✅ 页面切换完成: ${router.pathname}`)
    }

    const handleRouteChangeError = () => {
      setIsTransitioning(false)
      console.log(`❌ 页面切换失败`)
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeError)

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [router])

  const transitionClasses = {
    forward: isTransitioning ? 'transform translate-x-full' : 'transform translate-x-0',
    backward: isTransitioning ? 'transform -translate-x-full' : 'transform translate-x-0'
  }

  return (
    <div className={`transition-transform duration-300 ease-out ${transitionClasses[transitionDirection]} ${className}`}>
      {children}
      
      {/* 切换时的遮罩 */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-white bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 font-medium">加载中...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// 智能预加载Hook
export function useSmartPreload() {
  const [preloader, setPreloader] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const preloaderInstance = new PagePreloader(PWAClient, smartCache)
    setPreloader(preloaderInstance)

    // 页面加载完成后预加载常用数据
    if (router.isReady) {
      preloaderInstance.preloadUserData()
    }
  }, [router.isReady])

  // 预加载特定页面数据
  const preloadPage = (pageType, params = {}) => {
    if (preloader) {
      const preloadMap = {
        dashboard: () => preloader.preloadTask({ endpoint: 'data', action: 'dashboard' }),
        profile: () => preloader.preloadTask({ endpoint: 'data', action: 'profile' }),
        history: () => preloader.preloadTask({ endpoint: 'data', action: 'history', params })
      }
      
      const task = preloadMap[pageType]
      if (task) {
        task()
        console.log(`🔮 预加载页面: ${pageType}`)
      }
    }
  }

  return { preloadPage }
}

// 骨架屏组件 - 减少感知延迟
export function PageSkeleton({ type = 'dashboard' }) {
  const skeletons = {
    dashboard: <DashboardSkeleton />,
    profile: <ProfileSkeleton />,
    list: <ListSkeleton />
  }

  return (
    <div className="animate-pulse">
      {skeletons[type] || <DashboardSkeleton />}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 头部骨架 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-12 pb-24">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-white bg-opacity-20 rounded w-32"></div>
            <div className="h-6 bg-white bg-opacity-20 rounded w-24"></div>
            <div className="h-4 bg-white bg-opacity-20 rounded w-20"></div>
          </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl"></div>
        </div>
      </div>

      {/* 内容骨架 */}
      <div className="px-4 pb-8 space-y-6">
        {/* 余额卡片骨架 */}
        <div className="-mt-16 relative z-10">
          <div className="bg-white rounded-2xl p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
              <div className="h-12 bg-gray-200 rounded w-2/3 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>

        {/* 数据卡片骨架 */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6">
              <div className="space-y-2">
                <div className="h-10 bg-gray-200 rounded-full w-10 mx-auto"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>

        {/* 分析卡片骨架 */}
        <div className="bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 活动列表骨架 */}
        <div className="bg-white rounded-2xl p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-10"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* 头像区域 */}
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>

        {/* 信息列表 */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div className="h-5 bg-gray-200 rounded w-20"></div>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  )
}