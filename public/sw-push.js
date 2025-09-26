// 推送通知处理 Service Worker
console.log('🔔 Push Service Worker 加载成功')

// 监听推送事件
self.addEventListener('push', function(event) {
  console.log('📨 收到推送事件:', event)
  
  if (!event.data) {
    console.log('推送事件没有数据')
    return
  }

  try {
    const data = event.data.json()
    console.log('📊 推送数据:', data)

    const options = {
      body: data.body || '你有新的消息',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: false,
      vibrate: [200, 100, 200] // 振动模式
    }

    event.waitUntil(
      self.registration.showNotification(data.title || '新消息', options)
        .then(() => {
          console.log('✅ 通知显示成功')
        })
        .catch(error => {
          console.error('❌ 通知显示失败:', error)
        })
    )
  } catch (error) {
    console.error('❌ 推送数据解析失败:', error)
    
    // 显示默认通知
    event.waitUntil(
      self.registration.showNotification('新消息', {
        body: '你有新的消息',
        icon: '/icons/icon-192.png',
        tag: 'default'
      })
    )
  }
})

// 监听通知点击事件
self.addEventListener('notificationclick', function(event) {
  console.log('👆 通知被点击:', event)
  
  event.notification.close()

  const clickData = event.notification.data || {}
  const clickAction = event.action || 'default'

  console.log('点击动作:', clickAction, '数据:', clickData)

  // 根据通知类型和动作决定打开的页面
  let targetUrl = '/'
  
  if (clickData.type === 'morning-report') {
    targetUrl = '/profile' // 晨间报告 → 个人资料
  } else if (clickData.type === 'daily-reminder') {
    targetUrl = '/add-record' // 记账提醒 → 添加记录
  } else if (clickData.type === 'rank-update') {
    targetUrl = '/profile' // 排名更新 → 个人资料
  } else if (clickData.type === 'test') {
    targetUrl = '/settings' // 测试通知 → 设置页面
  } else if (clickData.type === 'personalized-reminder') {
    // 个性化提醒根据动作类型决定跳转
    if (clickAction === 'record') {
      targetUrl = '/add-record' // 记录动作 → 添加记录页面
    } else {
      targetUrl = '/profile' // 其他动作 → 个人资料页面
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // 如果已经有窗口打开，就聚焦到该窗口
        for (let client of clientList) {
          if (client.url.includes(self.location.origin)) {
            console.log('🔍 找到已打开的窗口，导航到:', targetUrl)
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        
        // 没有打开的窗口，创建新窗口
        console.log('🆕 打开新窗口:', targetUrl)
        return clients.openWindow(targetUrl)
      })
      .catch(error => {
        console.error('❌ 处理通知点击失败:', error)
      })
  )
})

// 监听推送订阅变化
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('🔄 推送订阅发生变化')
  
  event.waitUntil(
    // 重新订阅推送
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BHn7QgZMASGfPzs_t1h604Z5ku_HlpZufjZZgDO1qiPopryzLII_GaInmuHqiNMhypVkz99dy2ES8tknl8n-ncE'
    })
    .then(subscription => {
      console.log('✅ 重新订阅成功')
      // 这里可以发送新的订阅信息到服务器
      return fetch('/api/pwa/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe-push',
          subscription: subscription
        })
      })
    })
    .catch(error => {
      console.error('❌ 重新订阅失败:', error)
    })
  )
})

console.log('✅ Push Service Worker 事件监听器已注册')