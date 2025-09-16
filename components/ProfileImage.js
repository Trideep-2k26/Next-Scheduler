import { useState } from 'react'

const DefaultAvatar = ({ name, size = 'w-8 h-8' }) => {
  const getInitials = (name) => {
    if (!name) return '?'
    const names = name.trim().split(' ')
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-500'
    
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className={`${size} ${getBackgroundColor(name)} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
      {getInitials(name)}
    </div>
  )
}

const ProfileImage = ({ 
  src, 
  alt, 
  name, 
  size = 'w-8 h-8',
  className = '' 
}) => {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(!!src)

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }


  if (!src || hasError) {
    return <DefaultAvatar name={name || alt} size={size} />
  }

  return (
    <>
      {isLoading && <DefaultAvatar name={name || alt} size={size} />}
      <img
        src={src}
        alt={alt || name}
        className={`${size} rounded-full ${className} ${isLoading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  )
}

export default ProfileImage
export { DefaultAvatar }