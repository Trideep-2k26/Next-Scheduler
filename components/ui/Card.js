import { forwardRef } from 'react'

const Card = forwardRef(({ 
  children, 
  className = '',
  hover = false,
  padding = true,
  ...props 
}, ref) => {
  const classes = [
    'card',
    hover && 'card-hover cursor-pointer',
    !padding && 'p-0',
    className
  ].filter(Boolean).join(' ')

  return (
    <div 
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

// Card header component
const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b border-gray-200 dark:border-gray-800 pb-4 mb-6 ${className}`}>
    {children}
  </div>
)

// Card title component
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
    {children}
  </h3>
)

// Card description component
const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>
    {children}
  </p>
)

// Card footer component
const CardFooter = ({ children, className = '' }) => (
  <div className={`border-t border-gray-200 dark:border-gray-800 pt-4 mt-6 ${className}`}>
    {children}
  </div>
)

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Footer = CardFooter

export default Card