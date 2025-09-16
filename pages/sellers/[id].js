import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import SlotPicker from '../../components/SlotPicker'
import Modal from '../../components/Modal'
import { format, parseISO } from 'date-fns'
import { formatMonthRange } from '../../lib/dateUtils'
import axios from 'axios'

export default function SellerProfile() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  
  const [seller, setSeller] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
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

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
    setBookingTitle(`Meeting with ${seller.name}`)
    setShowBookingModal(true)
  }

  const handleMonthChange = (month) => {
    setActiveMonth(month)
    setSelectedSlot(null) // Clear selected slot when changing months
  }

  const handleBooking = async () => {
    if (!selectedSlot || !bookingTitle.trim()) {
      console.log('Booking validation failed:', { selectedSlot, bookingTitle })
      return
    }

    console.log('Starting booking process...')
    console.log('Booking data:', {
      sellerId: id,
      start: selectedSlot.start,
      end: selectedSlot.end,
      timezone: 'UTC',
      title: bookingTitle
    })

    setBooking(true)
    try {
      const response = await axios.post('/api/book', {
        sellerId: id,
        start: selectedSlot.start,
        end: selectedSlot.end,
        timezone: 'UTC', // Default to UTC since timezone field doesn't exist
        title: bookingTitle
      })

      console.log('Booking response:', response)

      if (response.status === 201) {
        console.log('Booking successful!')
        setBookingSuccess(true)
        setTimeout(() => {
          router.push('/appointments')
        }, 2000)
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      console.error('Error details:', error.response?.data)
      
      if (error.response?.status === 409) {
        alert('This time slot is no longer available. Please select another time.')
        setShowBookingModal(false)
        setSelectedSlot(null)
      } else {
        alert('Failed to book appointment. Please try again.')
      }
    } finally {
      setBooking(false)
    }
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
    <Layout title={`${seller.name} - Next Scheduler`}>
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Seller Profile */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <img
                src={seller.image}
                alt={seller.name}
                className="w-24 h-24 rounded-full object-cover"
              />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{seller.name}</h1>
                <p className="text-gray-600 mb-4">{seller.email}</p>
                <p className="text-gray-700 mb-6">{seller.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {seller.specialties ? (
                        Array.isArray(seller.specialties) 
                          ? seller.specialties.map((specialty, index) => (
                              <span
                                key={index}
                                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {specialty}
                              </span>
                            ))
                          : seller.specialties.split(',').map((specialty, index) => (
                              <span
                                key={index}
                                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {specialty.trim()}
                              </span>
                            ))
                      ) : (
                        <span className="text-gray-500 text-sm">No specialties listed</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start space-x-6 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {getCurrencySymbol(seller.currency)}{seller.hourlyRate}/hour
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                      </svg>
                      {seller.timezone}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Book a Time Slot</h2>
              <p className="text-gray-600">Select from available times to schedule your appointment</p>
            </div>

            {/* Month Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-md">
              <button
                onClick={() => handleMonthChange('this')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeMonth === 'this'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                This Month
                <span className="block text-xs text-gray-500 mt-0.5">
                  {formatMonthRange('this')}
                </span>
              </button>
              <button
                onClick={() => handleMonthChange('next')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeMonth === 'next'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Next Month
                <span className="block text-xs text-gray-500 mt-0.5">
                  {formatMonthRange('next')}
                </span>
              </button>
            </div>

            <SlotPicker
              sellerId={id}
              onSlotSelect={handleSlotSelect}
              selectedSlot={selectedSlot}
              duration={seller?.meetingDuration || 30}
              monthType={activeMonth}
            />
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Reviews & Ratings</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="flex items-center mr-2">
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
                    <span className="text-xl font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-600 ml-2">({totalReviews} reviews)</span>
                  </div>
                </div>
              </div>
              
              {session?.user.role === 'buyer' && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Write Review</span>
                </button>
              )}
            </div>

            {/* Rating Distribution */}
            {totalReviews > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700 w-8">{rating}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: totalReviews > 0 
                              ? `${((ratingDistribution[rating] || 0) / totalReviews) * 100}%` 
                              : '0%'
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-10">
                        {ratingDistribution[rating] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                  <p className="text-gray-600">Be the first to leave a review for {seller.name}!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <img
                        src={review.reviewer.image || '/default-avatar.png'}
                        alt={review.reviewer.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.reviewer.name}</h4>
                            <div className="flex items-center mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mt-3">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Submission Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Write a Review"
        maxWidth="max-w-lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <img
              src={seller?.image}
              alt={seller?.name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
            />
            <h3 className="text-lg font-semibold text-gray-900">Rate your experience with {seller?.name}</h3>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <svg
                    className={`w-8 h-8 ${
                      star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="text-center mt-2">
              <span className="text-lg font-semibold text-gray-900">{newReview.rating}</span>
              <span className="text-gray-600 ml-1">star{newReview.rating !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Your Review (Optional)
            </label>
            <textarea
              id="comment"
              rows={4}
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Share your experience working with this seller..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => setShowReviewModal(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Confirm Booking"
        maxWidth="max-w-lg"
      >
        {bookingSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
            <p className="text-gray-600 mb-4">
              Your appointment has been scheduled and both calendars have been updated.
            </p>
            <p className="text-sm text-gray-500">Redirecting to your appointments...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Appointment Details</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>With: {seller.name}</div>
                {selectedSlot && (
                  <>
                    <div>Date: {format(parseISO(selectedSlot.start), 'EEEE, MMMM d, yyyy')}</div>
                    <div>Time: {format(parseISO(selectedSlot.start), 'h:mm a')} - {format(parseISO(selectedSlot.end), 'h:mm a')}</div>
                    <div>Duration: {selectedSlot.duration} minutes</div>
                  </>
                )}
                <div>Rate: {getCurrencySymbol(seller.currency)}{seller.hourlyRate}/hour</div>
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                id="title"
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter meeting title"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                disabled={!bookingTitle.trim() || booking}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-full font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {booking ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Booking...</span>
                  </div>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
