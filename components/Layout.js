import Head from 'next/head'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Layout({ children, title = 'Learner Club' }) {
  const router = useRouter()
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  
  useEffect(() => {
    // PWA安装提示
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])
  
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstallable(false)
      }
      
      setDeferredPrompt(null)
    }
  }
  
  const isAuthPage = router.pathname === '/login'
  
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Learner Club - 财务管理习惯养成" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no" />
        <meta name="theme-color" content="#1677ff" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#1677ff" />
        <meta name="apple-mobile-web-app-title" content="Learner Club" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* PWA安装横幅 */}
        {isInstallable && (
          <div className="bg-primary text-white p-3 text-center text-sm">
            <span className="mr-2">📱 安装Learner Club到主屏幕，获得更好体验</span>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-primary px-3 py-1 rounded text-xs font-medium ml-2"
            >
              安装
            </button>
          </div>
        )}
        
        {/* 主要内容 */}
        <main className="pb-16">
          {children}
        </main>
        
        {/* 底部导航 */}
        {!isAuthPage && (
          <BottomNavigation />
        )}
      </div>
    </>
  )
}

function BottomNavigation() {
  const router = useRouter()
  
  const navItems = [
    {
      path: '/',
      icon: '🏠',
      label: '首页',
      active: router.pathname === '/'
    },
    {
      path: '/add-record',
      icon: '💰',
      label: '记账',
      active: router.pathname === '/add-record'
    },
    {
      path: '/leaderboard',
      icon: '🏆',
      label: '排行榜',
      active: router.pathname === '/leaderboard'
    },
    {
      path: '/history',
      icon: '📊',
      label: '历史',
      active: router.pathname === '/history'
    },
    {
      path: '/profile',
      icon: '👤',
      label: '我的',
      active: router.pathname === '/profile'
    }
  ]
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom">
      <div className="flex justify-between items-center w-full">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 min-w-0 ${
              item.active 
                ? 'text-primary bg-blue-50' 
                : 'text-gray-600 hover:text-primary'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}