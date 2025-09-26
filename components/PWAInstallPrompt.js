import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 检查是否已经是PWA模式
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
      setIsStandalone(standalone)
    }

    // 检查是否是iOS设备
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const ios = /iphone|ipad|ipod/.test(userAgent)
      setIsIOS(ios)
    }

    // 检查是否已经关闭过提示
    const checkDismissed = () => {
      const dismissedTime = localStorage.getItem('pwa-install-dismissed')
      if (dismissedTime) {
        const now = new Date().getTime()
        const dismissTime = parseInt(dismissedTime)
        // 7天后再次显示
        if (now - dismissTime < 7 * 24 * 60 * 60 * 1000) {
          setDismissed(true)
        }
      }
    }

    checkStandalone()
    checkIOS()
    checkDismissed()

    // 监听安装提示事件（Android/Desktop Chrome）
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!isStandalone && !dismissed) {
        setShowInstallPrompt(true)
      }
    }

    // 监听安装成功事件
    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // iOS设备显示安装提示
    if (isIOS && !isStandalone && !dismissed) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 2000) // 延迟2秒显示
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isStandalone, dismissed])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Desktop Chrome
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA安装成功')
      } else {
        console.log('PWA安装被拒绝')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } else if (isIOS) {
      // iOS需要手动安装，显示说明
      // 说明已经在UI中显示
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().getTime().toString())
    setDismissed(true)
  }

  if (!showInstallPrompt || isStandalone) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-md mx-auto">
        <div className="flex items-start space-x-3">
          {/* 图标 */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">📱</span>
            </div>
          </div>
          
          {/* 内容 */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              安装 LEARNER CLUB
            </h3>
            
            {isIOS ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>将应用添加到主屏幕，获得更好的体验：</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>点击底部分享按钮 <span className="inline-block">⬆️</span></li>
                  <li>向下滑动并选择&quot;添加到主屏幕&quot;</li>
                  <li>点击&quot;添加&quot;完成安装</li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                安装应用到您的设备，随时随地管理财务，支持离线使用
              </p>
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex-shrink-0 flex flex-col space-y-2">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-colors"
              >
                安装
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              {isIOS ? '知道了' : '稍后'}
            </button>
          </div>
        </div>
        
        {/* 功能亮点 */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center">
              <span className="mr-1">✅</span> 离线可用
            </span>
            <span className="flex items-center">
              <span className="mr-1">⚡</span> 快速访问
            </span>
            <span className="flex items-center">
              <span className="mr-1">🔔</span> 实时通知
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 简化版安装按钮（用于设置页面等）
export function InstallPWAButton({ className = '' }) {
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('PWA安装成功')
    }
    
    setDeferredPrompt(null)
    setCanInstall(false)
  }

  if (!canInstall) {
    return null
  }

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${className}`}
    >
      <span>📱</span>
      <span>安装应用</span>
    </button>
  )
}