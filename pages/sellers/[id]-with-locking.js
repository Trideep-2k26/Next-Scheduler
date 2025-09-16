import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import SlotPickerWithLocking from '../../components/SlotPickerWithLocking'
import SlotConfirmationModal from '../../components/SlotConfirmationModal'
import Modal from '../../components/Modal'
import { format, parseISO } from 'date-fns'
import { formatMonthRange } from '../../lib/dateUtils'
import axios from 'axios'

export default function SellerProfileWithLocking() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  
  const [seller, setSeller] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [lockedSlot, setLockedSlot] = useState(null)
  const [lockData, setLockData] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [bookingTitle, setBookingTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [activeMonth, setActiveMonth] = useState('this')
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingDistribution, setRatingDistribution] = useState({})
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  // Helper function to get currency symbol
  const getCurrencySymbol = (currency) => {
    switch(currency) {
      case 'INR': return '₹'
      case 'EUR': return '€'
      case 'USD': 
      default: return '$'
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    if (id) {
      fetchSeller()
      fetchReviews()
    }
  }, [session, status, router, id])

  const fetchSeller = async () => {
    try {
      setLoading(true)
      // Fetch real seller from database
      const response = await fetch(`/api/sellers/${id}`)
      if (response.ok) {
        const sellerData = await response.json()
        setSeller(sellerData)
      } else {
        console.error('Seller not found')
        router.push('/sellers')
      }
    } catch (error) {
      console.error('Error fetching seller:', error)
      router.push('/sellers')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?sellerId=${id}`)
      if (response.ok) {
        const reviewData = await response.json()
        setReviews(reviewData.reviews || [])
        setAverageRating(reviewData.averageRating || 0)
        setTotalReviews(reviewData.totalReviews || 0)
        setRatingDistribution(reviewData.ratingDistribution || {})
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleSubmitReview = async () => {
    if (newReview.rating < 1 || newReview.rating > 5) return
    
    setSubmittingReview(true)
    try {
      const response = await axios.post('/api/reviews', {
        sellerId: id,
        rating: newReview.rating,
        comment: newReview.comment.trim() || null
      })

      if (response.status === 200 || response.status === 201) {
        setShowReviewModal(false)
        setNewReview({ rating: 5, comment: '' })
        // Refresh reviews
        await fetchReviews()
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  // New slot locking handlers
  const handleSlotLocked = (lockInfo) => {
    setLockData(lockInfo)
    setLockedSlot(selectedSlot)
    setTimeRemaining(5 * 60 * 1000) // 5 minutes in milliseconds
    setBookingTitle(`Meeting with ${seller.name}`)
    setShowConfirmationModal(true)
  }

  const handleSlotExpired = () => {
    setLockedSlot(null)
    setLockData(null)
    setTimeRemaining(0)
    setShowConfirmationModal(false)
    alert('Your slot reservation has expired. Please select another time.')
  }

  const handleCancelLock = async () => {
    if (!lockData?.id) return

    try {
      const response = await fetch('/api/slots/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lockId: lockData.id
        })
      })

      if (response.ok) {
        setLockedSlot(null)
        setLockData(null)
        setTimeRemaining(0)
        setSelectedSlot(null)
        setShowConfirmationModal(false)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to cancel lock')
      }
    } catch (error) {
      console.error('Error cancelling lock:', error)
      alert('Failed to cancel lock')
    }
  }

  const handleConfirmBooking = async (slot) => {
    if (!lockData?.id || !bookingTitle.trim()) {
      console.log('Confirmation validation failed:', { lockData, bookingTitle })
      return
    }

    console.log('Starting booking confirmation process...')
    console.log('Booking data:', {
      lockId: lockData.id,
      title: bookingTitle
    })

    setBooking(true)
    try {
      const response = await fetch('/api/slots/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lockId: lockData.id,
          title: bookingTitle
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Booking confirmed successfully!')
        setBookingSuccess(true)
        setLockedSlot(null)
        setLockData(null)
        setTimeRemaining(0)
        setTimeout(() => {
          router.push('/appointments')
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to confirm booking')
      }
    } catch (error) {
      console.error('Error confirming booking:', error)
      
      if (error.message.includes('expired') || error.message.includes('not found')) {
        alert('Your reservation has expired. Please select another time slot.')
        setShowConfirmationModal(false)
        setLockedSlot(null)
        setLockData(null)
        setTimeRemaining(0)
      } else {
        alert('Failed to confirm booking. Please try again.')
      }
    } finally {
      setBooking(false)
    }
  }

  const handleMonthChange = (month) => {
    setActiveMonth(month)
    setSelectedSlot(null) // Clear selected slot when changing months
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  if (!seller) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Seller Not Found</h1>
          <p className="text-gray-600 mb-6">The seller you're looking for doesn't exist or is no longer available.</p>
          <button
            onClick={() => router.push('/sellers')}
            className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors"
          >
            Browse All Sellers
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Book with ${seller.name} - Next Scheduler`}>
      {/* Success Modal */}
      {bookingSuccess && (
        <Modal isOpen={bookingSuccess} onClose={() => setBookingSuccess(false)} title="Booking Confirmed!">
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointment Confirmed!</h3>
            <p className="text-gray-600 mb-6">
              Your appointment with {seller.name} has been successfully booked.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Date:</strong> {selectedSlot && format(parseISO(selectedSlot.start), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Time:</strong> {selectedSlot && format(parseISO(selectedSlot.start), 'h:mm a')} - {selectedSlot && format(parseISO(selectedSlot.end), 'h:mm a')}
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to your appointments...</p>
          </div>
        </Modal>
      )}

      {/* Slot Confirmation Modal */}
      <SlotConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        lockedSlot={lockedSlot}
        seller={seller}
        timeRemaining={timeRemaining}
        onConfirmBooking={handleConfirmBooking}
        onCancelLock={handleCancelLock}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seller Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {seller.name.charAt(0)}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{seller.name}</h1>
                {seller.specialties && (
                  <p className="text-gray-600 mb-4">
                    {Array.isArray(seller.specialties) 
                      ? seller.specialties.join(', ')
                      : typeof seller.specialties === 'string' 
                        ? (seller.specialties.includes(',') || seller.specialties.includes('['))
                          ? seller.specialties.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).join(', ')
                          : seller.specialties
                        : 'General Services'
                    }
                  </p>
                )}
              </div>

              {/* Rating */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="text-gray-600">Session Fee:</span>
                  <span className="text-xl font-bold text-primary">
                    {getCurrencySymbol(seller.currency)}{seller.hourlyRate}/hr
                  </span>
                </div>
              </div>

              {/* Add Review Button */}
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors mb-4"
              >
                Write a Review
              </button>
            </div>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              {/* Month Selector */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Time</h2>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
                  {[
                    { key: 'this', label: 'This Month' },
                    { key: 'next', label: 'Next Month' },
                    { key: 'later', label: 'Later' }
                  ].map((month) => (
                    <button
                      key={month.key}
                      onClick={() => handleMonthChange(month.key)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeMonth === month.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {formatMonthRange(activeMonth)}
                </p>
              </div>

              {/* Slot Picker with Locking */}
              <SlotPickerWithLocking
                sellerId={id}
                onSlotSelect={setSelectedSlot}
                onSlotLocked={handleSlotLocked}
                onSlotExpired={handleSlotExpired}
                selectedSlot={selectedSlot}
                duration={30}
                monthType={activeMonth}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Write a Review">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className={`w-8 h-8 ${
                      star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Share your experience..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}