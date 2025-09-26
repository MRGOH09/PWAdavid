import { useEffect, useState } from 'react'

/**
 * 统一的WebApp包装组件 - 确保所有页面一致的webapp行为
 * 不依赖安装引导，直接提供webapp体验
 */
export default function WebAppWrapper({ children }) {
  const [webappReady, setWebappReady] = useState(false)
  
  useEffect(() => {
    // 统一的WebApp初始化逻辑
    const initWebApp = () => {
      try {
        // 1. 设置webapp专用样式类
        document.documentElement.classList.add('webapp-mode')
        
        // 2. 禁用Safari的弹性滚动（橡皮筋效果）
        document.addEventListener('touchstart', function(e) {
          if (e.touches.length > 1) {
            e.preventDefault()
          }
        }, { passive: false })
        
        document.addEventListener('touchmove', function(e) {
          if (e.touches.length > 1) {
            e.preventDefault()
          }
        }, { passive: false })
        
        // 3. 防止双击缩放
        let lastTouchEnd = 0
        document.addEventListener('touchend', function(e) {
          const now = (new Date()).getTime()
          if (now - lastTouchEnd <= 300) {
            e.preventDefault()
          }
          lastTouchEnd = now
        }, { passive: false })
        
        // 4. 统一处理状态栏 - 强化WebApp模式
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no'
          )
        }
        
        // 添加专用meta标签确保webapp模式
        const addMetaTag = (name, content) => {
          let meta = document.querySelector(`meta[name="${name}"]`)
          if (!meta) {
            meta = document.createElement('meta')
            meta.setAttribute('name', name)
            document.head.appendChild(meta)
          }
          meta.setAttribute('content', content)
        }
        
        // 强化PWA标签
        addMetaTag('mobile-web-app-capable', 'yes')
        addMetaTag('apple-mobile-web-app-capable', 'yes')
        addMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent')
        addMetaTag('format-detection', 'telephone=no')
        addMetaTag('msapplication-TileColor', '#1677ff')
        addMetaTag('theme-color', '#1677ff')
        
        // 5. 添加webapp状态检测
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone ||
                           document.referrer.includes('android-app://')
        
        if (isStandalone) {
          document.documentElement.classList.add('pwa-standalone')
        } else {
          document.documentElement.classList.add('pwa-browser')
        }
        
        // 6. 设备特定处理
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        const isAndroid = /Android/.test(navigator.userAgent)
        
        // iOS Safari专用处理
        if (isIOS && isSafari) {
          document.documentElement.classList.add('ios-safari')
          
          // 强制全屏模式，彻底隐藏Safari UI
          const forceFullscreen = () => {
            // 滚动技巧隐藏地址栏
            window.scrollTo(0, 1)
            setTimeout(() => window.scrollTo(0, 0), 0)
            
            // 设置body高度为设备高度
            document.body.style.height = window.innerHeight + 'px'
            document.documentElement.style.height = window.innerHeight + 'px'
          }
          
          // 立即执行和延迟执行
          forceFullscreen()
          setTimeout(forceFullscreen, 100)
          setTimeout(forceFullscreen, 300)
          setTimeout(forceFullscreen, 500)
          
          // 监听窗口变化
          window.addEventListener('resize', forceFullscreen)
          window.addEventListener('orientationchange', () => {
            setTimeout(forceFullscreen, 100)
          })
        }
        
        // Android设备专用处理
        if (isAndroid) {
          document.documentElement.classList.add('android-device')
          
          // Android响应式优化
          const optimizeAndroid = () => {
            const screenWidth = window.screen.width
            const viewportWidth = window.innerWidth
            const devicePixelRatio = window.devicePixelRatio || 1
            
            // 动态调整基础字体大小
            const baseSize = Math.max(14, Math.min(18, screenWidth / 25))
            document.documentElement.style.fontSize = baseSize + 'px'
            
            // 设置最小高度
            document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px')
            
            console.log('📱 Android优化完成', {
              screenWidth,
              viewportWidth,
              devicePixelRatio,
              baseSize: baseSize + 'px'
            })
          }
          
          optimizeAndroid()
          window.addEventListener('resize', optimizeAndroid)
          window.addEventListener('orientationchange', () => {
            setTimeout(optimizeAndroid, 200)
          })
        }
        
        console.log('🚀 WebApp模式初始化完成', {
          standalone: isStandalone,
          ios: isIOS,
          safari: isSafari
        })
        
        setWebappReady(true)
        
      } catch (error) {
        console.error('WebApp初始化失败:', error)
        setWebappReady(true) // 即使失败也要显示内容
      }
    }
    
    // 确保DOM加载完成后执行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWebApp)
    } else {
      initWebApp()
    }
    
    return () => {
      document.removeEventListener('DOMContentLoaded', initWebApp)
    }
  }, [])
  
  if (!webappReady) {
    return (
      <div className="webapp-loading">
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">正在初始化应用...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="webapp-container">
      {children}
    </div>
  )
}

/**
 * WebApp状态Hook - 获取当前webapp运行状态
 */
export function useWebAppStatus() {
  const [status, setStatus] = useState({
    isStandalone: false,
    isIOS: false,
    isSafari: false,
    isPWA: false
  })
  
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone ||
                       document.referrer.includes('android-app://')
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isPWA = isStandalone || document.documentElement.classList.contains('webapp-mode')
    
    setStatus({
      isStandalone,
      isIOS,
      isSafari,
      isPWA
    })
  }, [])
  
  return status
}