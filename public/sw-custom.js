// Custom Service Worker with Push Notification Support
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js')

// Workbox 预缓存清单 - next-pwa会注入这个
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || [])
workbox.precaching.cleanupOutdatedCaches()

// 导入推送处理功能
importScripts('/sw-push.js')

// 基本的Service Worker功能
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker 安装中...')
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker 激活中...')
  event.waitUntil(self.clients.claim())
})

console.log('✅ Custom Service Worker 加载完成')