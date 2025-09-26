// 浏览器和设备检测工具
export function getBrowserInfo() {
  if (typeof window === 'undefined') return { browser: 'server', device: 'server' }
  
  const ua = navigator.userAgent
  const result = {
    browser: 'unknown',
    device: 'unknown',
    supportsPWA: false,
    supportsPush: false,
    installMethod: '',
    pushService: '',
    needsGuidance: false
  }
  
  // 设备检测
  if (/iPhone|iPad|iPod/.test(ua)) {
    result.device = 'ios'
  } else if (/Android/.test(ua)) {
    result.device = 'android'
  } else if (/Windows Phone/.test(ua)) {
    result.device = 'windowsphone'
  } else {
    result.device = 'desktop'
  }
  
  // 浏览器检测
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    result.browser = 'safari'
    result.supportsPWA = true
    result.supportsPush = true
    result.installMethod = 'ios_safari'
    result.pushService = 'apn'
  } else if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    result.browser = 'chrome'
    result.supportsPWA = true
    result.supportsPush = true
    result.installMethod = 'android_chrome'
    result.pushService = 'fcm'
  } else if (/HuaweiBrowser/.test(ua) || /HUAWEI/.test(ua)) {
    // 华为浏览器检测
    result.browser = 'huawei'
    result.supportsPWA = true // 华为浏览器支持基础PWA
    result.supportsPush = false // 需要HMS推送
    result.installMethod = 'huawei_browser'
    result.pushService = 'hms'
    result.needsGuidance = true
  } else if (
    /Telegram/.test(ua) || 
    ua.includes('TelegramBot-like') || 
    ua.includes('telegram') ||
    (typeof window !== 'undefined' && window.TelegramWebviewProxy) ||
    ua.includes('TelegramAndroid')
  ) {
    result.browser = 'telegram'
    result.needsGuidance = true  // Telegram用户需要跳转引导
    result.supportsPWA = false
    result.supportsPush = false
    result.installMethod = 'redirect_to_browser'
    
    // Debug日志
    console.log('🔍 Telegram环境检测成功:', {
      userAgent: ua,
      hasTelegramWebviewProxy: typeof window !== 'undefined' && !!window.TelegramWebviewProxy
    })
  } else if (/Edg/.test(ua)) {
    result.browser = 'edge'
    result.supportsPWA = true
    result.supportsPush = true
    result.installMethod = 'android_edge'
    result.pushService = 'fcm'
  } else if (/Firefox/.test(ua)) {
    result.browser = 'firefox'
    result.supportsPWA = false
    result.supportsPush = true
    result.installMethod = 'none'
    result.pushService = 'fcm'
  }
  
  // 华为设备特殊处理
  if (/HUAWEI|Honor/.test(ua)) {
    result.device = 'huawei'
    // 检查是否有Google服务
    result.hasGMS = !(/HarmonyOS/.test(ua) || /EMUI 1[0-9]/.test(ua))
    if (!result.hasGMS) {
      result.pushService = 'hms'
      result.needsGuidance = true
    }
  }
  
  return result
}

export function getInstallInstructions(browserInfo) {
  const { browser, device, installMethod } = browserInfo
  
  const instructions = {
    ios_safari: {
      title: '📱 安装到主屏幕',
      steps: [
        '1. 点击底部分享按钮 📤',
        '2. 选择"添加到主屏幕"',
        '3. 点击"添加"确认'
      ],
      icon: '🍎'
    },
    android_chrome: {
      title: '📱 安装应用',
      steps: [
        '1. 点击右上角菜单 ⋮',
        '2. 选择"安装应用"或"添加到主屏幕"',
        '3. 点击"安装"确认'
      ],
      icon: '🤖'
    },
    huawei_browser: {
      title: '📱 安装到桌面 (华为)',
      steps: [
        '1. 点击底部菜单按钮',
        '2. 选择"添加到桌面"',
        '3. 确认安装',
        '💡 提示：华为设备推荐使用Chrome浏览器获得更好体验'
      ],
      icon: '📱',
      recommendation: 'chrome'
    },
    redirect_to_browser: {
      title: '🌐 在浏览器中打开',
      steps: [
        '1. 点击右上角"..."菜单',
        '2. 选择"在浏览器中打开"',
        '3. 然后按照浏览器指引安装'
      ],
      icon: '🔗'
    },
    none: {
      title: '📋 收藏此页面',
      steps: [
        '1. 点击地址栏星标收藏',
        '2. 或添加书签到主页'
      ],
      icon: '⭐'
    }
  }
  
  return instructions[installMethod] || instructions.none
}

export function getPushNotificationInfo(browserInfo) {
  const { pushService, device, hasGMS } = browserInfo
  
  const pushInfo = {
    fcm: {
      supported: true,
      service: 'Firebase Cloud Messaging',
      setup: '系统会自动请求通知权限'
    },
    apn: {
      supported: true,
      service: 'Apple Push Notification',
      setup: '系统会自动请求通知权限'
    },
    hms: {
      supported: device === 'huawei' && !hasGMS,
      service: 'Huawei Mobile Services',
      setup: '华为推送服务（需要特殊配置）'
    }
  }
  
  return pushInfo[pushService] || { supported: false, service: '不支持', setup: '此浏览器不支持推送通知' }
}