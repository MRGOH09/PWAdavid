export default function Button({ 
  children, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon = null,
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-blue-600 focus:ring-primary',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-success text-white hover:bg-green-600 focus:ring-success',
    danger: 'bg-danger text-white hover:bg-red-600 focus:ring-danger',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
    </button>
  )
}

// 浮动操作按钮
export function FAB({ 
  children, 
  onClick, 
  className = '',
  icon = '➕'
}) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-20 right-4 w-14 h-14
        bg-primary text-white rounded-full shadow-lg
        flex items-center justify-center
        hover:bg-blue-600 active:scale-95
        transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300
        ${className}
      `}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </button>
  )
}

// 链接样式按钮
export function LinkButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`
        text-primary hover:text-blue-600 font-medium text-sm
        transition-colors focus:outline-none focus:underline
        ${className}
      `}
    >
      {children}
    </button>
  )
}