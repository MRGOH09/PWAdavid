export default function LoadingSpinner({ size = 'medium', className = '' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }
  
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`
        ${sizeClasses[size]}
        border-2 border-gray-200 border-t-primary
        rounded-full animate-spin
      `} />
    </div>
  )
}

export function LoadingPage({ message = '加载中...' }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600 text-sm">{message}</p>
    </div>
  )
}

export function LoadingCard({ message = '加载中...' }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
      <LoadingSpinner size="medium" />
      <p className="mt-3 text-gray-600 text-sm">{message}</p>
    </div>
  )
}