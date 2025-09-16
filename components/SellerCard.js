import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Card, Button } from './ui'
import { useState } from 'react'


function DefaultAvatar({ name, className }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  
  return (
    <div className={`flex items-center justify-center bg-gray-300 text-gray-700 font-semibold ${className}`}>
      {initials}
    </div>
  )
}


function ProfileImage({ src, name, className }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  if (!src || imageError) {
    return <DefaultAvatar name={name} className={className} />
  }

  return (
    <>
      {imageLoading && <DefaultAvatar name={name} className={className} />}
      <img
        src={src}
        alt={name}
        className={`${className} ${imageLoading ? 'hidden' : 'block'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </>
  )
}

export default function SellerCard({ seller }) {
  return (
    <Card hover className="animate-fade-in">
      <div className="flex items-center space-x-4">
        <ProfileImage
          src={seller.image}
          name={seller.name}
          className="h-16 w-16 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-200"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-black truncate">{seller.name}</h3>
          <p className="text-gray-600 truncate">{seller.email}</p>
          
          {seller.nextAvailableSlot && (
            <p className="text-sm text-gray-700 mt-1 truncate">
              Next available: {format(parseISO(seller.nextAvailableSlot), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div className="flex items-center">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-gray-700 ml-2">4.8 (12 reviews)</span>
        </div>

        <Link href={`/sellers/${seller.id}`}>
          <Button className="w-full sm:w-auto animate-hover">
            View Availability
          </Button>
        </Link>
      </div>
    </Card>
  )
}
