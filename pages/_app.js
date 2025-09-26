import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 注册Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration)
        })
        .catch(error => {
          console.log('SW registration failed:', error)
        })
    }
  }, [])
  
  return <Component {...pageProps} />
}