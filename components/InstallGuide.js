import { useState, useEffect } from 'react'
import { getBrowserInfo, getInstallInstructions, getPushNotificationInfo } from '../lib/browser-detection'
import Card from './Card'

export default function InstallGuide({ onClose }) {
  const [browserInfo, setBrowserInfo] = useState(null)
  const [showPushInfo, setShowPushInfo] = useState(false)
  
  useEffect(() => {
    setBrowserInfo(getBrowserInfo())
  }, [])
  
  if (!browserInfo) return null
  
  const instructions = getInstallInstructions(browserInfo)
  const pushInfo = getPushNotificationInfo(browserInfo)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <div className="text-center">
          {/* 标题 */}
          <div className="text-4xl mb-4">{instructions.icon}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {instructions.title}
          </h2>
          
          {/* 设备和浏览器信息 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <p className="text-gray-600">
              检测到：{browserInfo.device === 'huawei' ? '华为设备' : 
                      browserInfo.device === 'ios' ? 'iOS设备' : 
                      browserInfo.device === 'android' ? 'Android设备' : '桌面设备'} · 
              {browserInfo.browser === 'huawei' ? '华为浏览器' :
               browserInfo.browser === 'safari' ? 'Safari浏览器' :
               browserInfo.browser === 'chrome' ? 'Chrome浏览器' :
               browserInfo.browser === 'telegram' ? 'Telegram内置浏览器' :
               browserInfo.browser}
            </p>
            {browserInfo.device === 'huawei' && !browserInfo.hasGMS && (
              <p className="text-orange-600 mt-1 text-xs">
                🔔 检测到鸿蒙系统，推送功能需要特殊配置
              </p>
            )}
          </div>
          
          {/* 安装步骤 */}
          <div className="text-left mb-4">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start mb-2">
                <span className="text-blue-500 font-medium mr-2">
                  {step.startsWith('💡') ? '💡' : '•'}
                </span>
                <span className={`text-sm ${step.startsWith('💡') ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
                  {step.replace('💡 提示：', '')}
                </span>
              </div>
            ))}
          </div>
          
          {/* 华为设备特殊推荐 */}
          {browserInfo.device === 'huawei' && instructions.recommendation === 'chrome' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <strong>🔥 华为用户推荐：</strong>
                <br />
                使用Chrome浏览器获得完整PWA体验
                <br />
                <a 
                  href={`googlechrome://${window.location.href}`}
                  className="text-blue-600 underline mt-1 inline-block"
                >
                  在Chrome中打开
                </a>
              </div>
            </div>
          )}
          
          {/* 推送通知信息 */}
          <div className="border-t pt-4 mb-4">
            <button
              onClick={() => setShowPushInfo(!showPushInfo)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900"
            >
              <span>🔔 推送通知支持</span>
              <span className={`transform transition-transform ${showPushInfo ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showPushInfo && (
              <div className="mt-3 text-sm text-gray-600">
                <div className={`p-3 rounded-lg ${pushInfo.supported ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                  <div className="font-medium mb-1">
                    {pushInfo.supported ? '✅ 支持' : '❌ 不支持'}: {pushInfo.service}
                  </div>
                  <div className="text-xs">
                    {pushInfo.setup}
                  </div>
                </div>
                
                {/* 华为HMS特殊说明 */}
                {browserInfo.pushService === 'hms' && (
                  <div className="mt-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-xs">
                    <strong>华为推送服务说明：</strong>
                    <br />
                    • 需要华为开发者配置HMS推送
                    <br />
                    • 或推荐使用Chrome浏览器
                    <br />
                    • 支持基础PWA功能（离线使用等）
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              稍后再说
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              知道了
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 轻量级安装提示条
export function InstallBanner({ onShow, onDismiss }) {
  const [browserInfo, setBrowserInfo] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    const info = getBrowserInfo()
    setBrowserInfo(info)
    
    // 检查是否需要显示提示
    const shouldShow = info.needsGuidance || 
                      (info.supportsPWA && !window.matchMedia('(display-mode: standalone)').matches)
    
    if (!shouldShow || localStorage.getItem('install-banner-dismissed')) {
      setDismissed(true)
    }
  }, [])
  
  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('install-banner-dismissed', 'true')
    onDismiss?.()
  }
  
  if (dismissed || !browserInfo?.needsGuidance) return null
  
  return (
    <div className="bg-blue-500 text-white px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">📱</span>
          <span>
            {browserInfo.device === 'huawei' ? 
              '华为用户：安装到桌面获得更好体验' : 
              '安装此应用到主屏幕'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShow}
            className="text-white underline hover:no-underline"
          >
            查看
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}