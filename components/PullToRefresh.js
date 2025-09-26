import { useState, useEffect, useRef } from 'react'

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const containerRef = useRef(null)
  
  const threshold = 80 // 触发刷新的阈值
  const maxPull = 120 // 最大下拉距离

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startY = 0
    let currentY = 0

    const handleTouchStart = (e) => {
      // 只有在完全滚动到顶部时才记录触摸开始
      if (container.scrollTop === 0) {
        startY = e.touches[0].pageY
        setTouchStart(startY)
      } else {
        // 不在顶部时，清除任何之前的触摸状态
        startY = 0
        setTouchStart(0)
        setPullDistance(0)
      }
    }

    const handleTouchMove = (e) => {
      // 如果不是从顶部开始的触摸，直接返回，允许正常滚动
      if (!startY || container.scrollTop > 0) {
        setPullDistance(0)
        return
      }
      
      currentY = e.touches[0].pageY
      const distance = currentY - startY
      
      // 只有在页面顶部且向下拉时才处理下拉刷新
      if (distance > 0 && container.scrollTop === 0) {
        // 只有真正在拉动刷新时才阻止默认滚动
        e.preventDefault()
        const actualDistance = Math.min(distance * 0.5, maxPull) // 添加阻尼效果
        setPullDistance(actualDistance)
      } else {
        // 向上滑动时，不做任何处理，允许正常滚动
        setPullDistance(0)
        startY = 0 // 重置startY，让后续的滚动正常进行
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(60) // 保持在刷新位置
        
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
      
      startY = 0
      setTouchStart(0)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, isRefreshing, onRefresh])

  const getRefreshIcon = () => {
    if (isRefreshing) {
      return '🔄'
    } else if (pullDistance >= threshold) {
      return '↑'
    } else if (pullDistance > 20) {
      return '↓'
    }
    return ''
  }

  const getRefreshText = () => {
    if (isRefreshing) {
      return '正在刷新...'
    } else if (pullDistance >= threshold) {
      return '松开刷新'
    } else if (pullDistance > 20) {
      return '下拉刷新'
    }
    return ''
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto overscroll-none"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: touchStart ? 'none' : 'transform 0.3s ease-out',
        WebkitOverflowScrolling: 'touch' // iOS滚动优化
      }}
    >
      {/* 刷新指示器 */}
      <div 
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          marginTop: `-${pullDistance}px`,
          opacity: Math.min(pullDistance / threshold, 1)
        }}
      >
        <div className={`text-2xl mb-1 ${isRefreshing ? 'animate-spin' : ''}`}>
          {getRefreshIcon()}
        </div>
        <div className="text-sm text-gray-600">
          {getRefreshText()}
        </div>
      </div>
      
      {/* 主要内容 */}
      {children}
    </div>
  )
}