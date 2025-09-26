const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest.json$/],
  // 使用默认Service Worker生成，推送功能通过additionalManifestEntries添加
  additionalManifestEntries: [
    {
      url: '/sw-push.js',
      revision: null
    }
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 环境变量
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    NEXT_PUBLIC_FCM_VAPID_KEY: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY
  },
  
  // 图片优化
  images: {
    domains: ['api.telegram.org', 't.me'],
    formats: ['image/webp', 'image/avif']
  },
  
  // 压缩配置
  compress: true,
  
  // 重定向
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true
      }
    ]
  },
  
  // 头部设置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

module.exports = withPWA(nextConfig)