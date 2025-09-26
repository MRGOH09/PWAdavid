import { useState, useEffect } from 'react'
import { getBrowserInfo } from '../lib/browser-detection'
import ModernCard from './ModernCard'

/**
 * Android Telegram跳转引导组件
 * 解决Android用户在Telegram中无法长按跳出到Chrome的问题
 */
export default function TelegramJumpOut({ onDismiss }) {
  const [browserInfo, setBrowserInfo] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  
  useEffect(() => {
    setBrowserInfo(getBrowserInfo())
  }, [])
  
  if (!browserInfo) return null
  
  // 只在Android Telegram环境中显示
  if (browserInfo.device !== 'android' || browserInfo.browser !== 'telegram') {
    return null
  }
  
  const handleChromeOpen = () => {
    const currentUrl = window.location.href
    
    // 尝试多种方式打开Chrome
    const attempts = [
      // 方式1：Chrome Intent URL
      `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`,
      // 方式2：Chrome自定义协议
      `googlechrome://${currentUrl}`,
      // 方式3：通用浏览器协议
      `https://${window.location.host}${window.location.pathname}`
    ]
    
    let attemptIndex = 0
    const tryOpen = () => {
      if (attemptIndex >= attempts.length) {
        // 所有方式都失败了，显示手动指导
        setShowDetail(true)
        return
      }
      
      const url = attempts[attemptIndex]
      console.log(`🚀 尝试跳转方式 ${attemptIndex + 1}:`, url)
      
      try {
        window.open(url, '_blank')
        // 如果成功，稍后关闭提示
        setTimeout(() => {
          onDismiss?.()
        }, 2000)
      } catch (error) {
        console.warn(`跳转方式 ${attemptIndex + 1} 失败:`, error)
        attemptIndex++
        tryOpen()
      }
    }
    
    tryOpen()
  }
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('✅ 链接已复制！\n请打开Chrome浏览器，粘贴网址访问')
    } catch (error) {
      // 如果剪贴板API失败，使用传统方式
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('✅ 链接已复制！\n请打开Chrome浏览器，粘贴网址访问')
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <ModernCard className="w-full max-w-md p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            获得更好体验
          </h2>
          
          <div className="text-gray-600 mb-6 text-sm leading-relaxed">
            <p className="mb-2">检测到您在 <span className="font-medium text-blue-600">Telegram</span> 中访问</p>
            <p className="mb-2">在Chrome中打开可获得完整PWA体验：</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• 📱 添加到主屏幕</li>
              <li>• ⚡ 更快的加载速度</li>
              <li>• 🔔 推送通知功能</li>
              <li>• 💾 离线使用支持</li>
            </ul>
          </div>
          
          {!showDetail ? (
            <div className="space-y-3">
              {/* 主要跳转按钮 */}
              <button
                onClick={handleChromeOpen}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              >
                🌐 在Chrome中打开
              </button>
              
              {/* 备选方案 */}
              <button
                onClick={handleCopyUrl}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm"
              >
                📋 复制链接
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <h3 className="font-medium text-blue-800 mb-2">📱 手动打开步骤：</h3>
                <ol className="text-blue-700 text-left space-y-1 text-xs">
                  <li>1. 点击下方"复制链接"按钮</li>
                  <li>2. 打开Chrome浏览器应用</li>
                  <li>3. 在地址栏粘贴链接</li>
                  <li>4. 访问完整版本应用</li>
                </ol>
              </div>
              
              <button
                onClick={handleCopyUrl}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200"
              >
                📋 复制链接到Chrome
              </button>
            </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              暂时继续
            </button>
            {!showDetail && (
              <button
                onClick={() => setShowDetail(true)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                查看步骤
              </button>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            💡 在Chrome中可以"添加到主屏幕"获得原生应用体验
          </div>
        </div>
      </ModernCard>
    </div>
  )
}

/**
 * 轻量级Telegram跳转横幅
 */
export function TelegramJumpBanner({ onShow, onDismiss, forceShow = false }) {
  const [browserInfo, setBrowserInfo] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    const info = getBrowserInfo()
    setBrowserInfo(info)
    
    // Debug日志
    console.log('🔍 TelegramJumpBanner 浏览器检测:', {
      device: info.device,
      browser: info.browser,
      userAgent: navigator.userAgent
    })
    
    // 检查是否已经忽略
    const wasDismissed = localStorage.getItem('telegram-jump-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      console.log('⚠️ TelegramJumpBanner 已被用户忽略')
    }
  }, [])
  
  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('telegram-jump-dismissed', 'true')
    onDismiss?.()
  }
  
  // 强制显示模式（用于测试）
  if (forceShow && !dismissed) {
    console.log('🚀 TelegramJumpBanner 强制显示模式')
  } else if (dismissed || browserInfo?.browser !== 'telegram') {
    console.log('❌ TelegramJumpBanner 隐藏原因:', {
      dismissed,
      device: browserInfo?.device,
      browser: browserInfo?.browser,
      forceShow,
      shouldShow: browserInfo?.browser === 'telegram'
    })
    return null
  }
  
  console.log('✅ TelegramJumpBanner 显示条件满足')
  
  return (
    <div className="bg-blue-500 text-white px-3 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center">
              <span className="mr-2">🍎</span>
              <span>iPhone用户长按链接</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🤖</span>
              <span>Android用户按这里</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShow}
            className="text-white underline hover:no-underline font-medium"
          >
            按这里
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-blue-200"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}