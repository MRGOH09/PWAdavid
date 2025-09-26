import { useState, useEffect } from 'react'

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
    
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        if (onClose) onClose()
      }, 300)
    }, duration)
    
    return () => clearTimeout(timer)
  }, [duration, onClose])
  
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      case 'warning':
        return 'bg-yellow-500 text-white'
      case 'info':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-800 text-white'
    }
  }
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '💬'
    }
  }
  
  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-[200px] max-w-[90vw] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${getToastStyles()}`}
    >
      <span className="text-lg">{getIcon()}</span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => {
            if (onClose) onClose()
          }, 300)
        }}
        className="text-white/80 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}