// PWA Enhanced Service Worker - 完整离线支持
const CACHE_NAME = 'learner-club-v1';
const OFFLINE_PAGE = '/offline.html';
const API_CACHE = 'api-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 需要网络优先的API路径
const NETWORK_FIRST_PATHS = [
  '/api/pwa/data',
  '/api/pwa/auth-check',
  '/api/enhanced-register'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: 缓存静态资源');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // 立即激活新的Service Worker
      return self.skipWaiting();
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('Service Worker: 清理旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 立即控制所有客户端
      return self.clients.claim();
    })
  );
});

// Fetch事件 - 处理网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非HTTP(S)请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API请求 - 网络优先，失败时使用缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE)
    );
    return;
  }

  // 图片请求 - 缓存优先
  if (request.destination === 'image') {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // 静态资源 - 缓存优先，网络更新
  event.respondWith(
    staleWhileRevalidate(request, CACHE_NAME)
  );
});

// 网络优先策略
async function networkFirstStrategy(request, cacheName) {
  try {
    // 尝试网络请求，设置超时
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    // 如果成功，更新缓存
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response was not ok');
  } catch (error) {
    // 网络失败，尝试缓存
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: 使用缓存数据', request.url);
      return cachedResponse;
    }
    
    // 如果是导航请求，返回离线页面
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_PAGE);
    }
    
    // 返回离线JSON响应
    return new Response(
      JSON.stringify({ 
        error: '离线模式', 
        message: '当前处于离线状态，请检查网络连接' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 缓存优先策略
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: 图片加载失败', request.url);
  }

  // 返回占位图片
  return new Response('', { status: 404 });
}

// Stale While Revalidate策略
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // 后台更新缓存
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // 立即返回缓存或网络响应
  return cachedResponse || fetchPromise || offlineResponse();
}

// 带超时的fetch
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('请求超时')), timeout)
    )
  ]);
}

// 离线响应
function offlineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>离线 - Learner Club</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          margin: 1rem 0;
        }
        button {
          background: white;
          color: #667eea;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 2rem;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>您当前处于离线状态</h1>
        <p>请检查网络连接后重试</p>
        <button onclick="location.reload()">重新加载</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

// 后台同步支持
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Service Worker: 开始后台同步');
  // 这里可以添加后台同步逻辑
  // 例如：将离线时的记录上传到服务器
}

// 推送通知支持
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '您有新的消息',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Learner Club', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});