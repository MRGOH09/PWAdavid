import { getBrowserInfo } from './browser-detection'

// 推送通知管理器
class PushNotificationManager {
  constructor() {
    this.isSupported = false
    this.permission = 'default'
    this.subscription = null
    this.browserInfo = null
  }
  
  async initialize() {
    this.browserInfo = getBrowserInfo()
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    
    if (this.isSupported) {
      this.permission = Notification.permission
    }
    
    return this.isSupported
  }
  
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported')
    }
    
    // 华为设备特殊处理
    if (this.browserInfo.device === 'huawei' && !this.browserInfo.hasGMS) {
      return this.handleHuaweiPush()
    }
    
    // 标准浏览器处理
    const permission = await Notification.requestPermission()
    this.permission = permission
    
    if (permission === 'granted') {
      return this.subscribeToPush()
    }
    
    return null
  }
  
  async handleHuaweiPush() {
    // 华为设备推送处理
    console.log('🔔 华为设备推送配置')
    
    // 检查是否有HMS推送SDK
    if (window.HMSPush) {
      try {
        const token = await window.HMSPush.getToken()
        console.log('🎯 获取华为推送Token:', token)
        return { type: 'huawei', token }
      } catch (error) {
        console.error('❌ 华为推送Token获取失败:', error)
      }
    }
    
    // 回退到标准推送
    console.log('⚡ 华为设备使用标准推送服务')
    const permission = await Notification.requestPermission()
    this.permission = permission
    
    if (permission === 'granted') {
      return this.subscribeToPush()
    }
    
    return null
  }
  
  async subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready
      
      // 不同推送服务的配置
      const pushConfig = this.getPushConfig()
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: pushConfig.publicKey
      })
      
      this.subscription = subscription
      
      // 发送订阅信息到服务器
      await this.sendSubscriptionToServer(subscription, pushConfig.service)
      
      return subscription
    } catch (error) {
      console.error('订阅推送失败:', error)
      throw error
    }
  }
  
  getPushConfig() {
    const { pushService } = this.browserInfo
    
    const configs = {
      fcm: {
        service: 'fcm',
        publicKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY || ''
      },
      apn: {
        service: 'apn',
        publicKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '' // iOS也用FCM
      },
      hms: {
        service: 'hms',
        publicKey: process.env.NEXT_PUBLIC_HMS_PUBLIC_KEY || ''
      }
    }
    
    return configs[pushService] || configs.fcm
  }
  
  async sendSubscriptionToServer(subscription, service) {
    try {
      const response = await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'subscribe-push',
          subscription,
          service,
          deviceInfo: {
            browser: this.browserInfo.browser,
            device: this.browserInfo.device,
            hasGMS: this.browserInfo.hasGMS
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send subscription to server')
      }
      
      console.log('✅ 推送订阅已保存到服务器')
    } catch (error) {
      console.error('❌ 保存推送订阅失败:', error)
      throw error
    }
  }
  
  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe()
      
      // 通知服务器取消订阅
      await fetch('/api/pwa/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'unsubscribe-push'
        })
      })
      
      this.subscription = null
    }
  }
  
  // 发送测试通知
  async sendTestNotification() {
    if (!this.subscription) {
      throw new Error('Not subscribed to push notifications')
    }
    
    await fetch('/api/pwa/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'test-push-notification'
      })
    })
  }
}

// 华为设备检测和推送设置指南
export function getHuaweiSetupGuide() {
  return {
    title: '华为设备推送设置',
    steps: [
      '1. 确保应用已添加到桌面',
      '2. 进入设置 → 应用管理',
      '3. 找到浏览器应用',
      '4. 开启"允许通知"权限',
      '5. 开启"后台活动"权限'
    ],
    additionalInfo: [
      '• 华为设备可能需要手动设置',
      '• 推荐使用Chrome浏览器',
      '• 支持基础PWA功能'
    ]
  }
}

// 导出单例
export default new PushNotificationManager()

// 工具函数
export async function initializePushNotifications() {
  const manager = new PushNotificationManager()
  await manager.initialize()
  return manager
}

// 检查推送支持状态
export function getPushSupport() {
  const browserInfo = getBrowserInfo()
  
  return {
    supported: browserInfo.supportsPush,
    service: browserInfo.pushService,
    needsSpecialSetup: browserInfo.device === 'huawei' && !browserInfo.hasGMS,
    setupGuide: browserInfo.device === 'huawei' ? getHuaweiSetupGuide() : null
  }
}