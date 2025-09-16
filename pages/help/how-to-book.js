import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function HowToBook() {
  const router = useRouter()

  return (
    <Layout title="How to Book Appointments - Next Scheduler">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How to Book Appointments
            </h1>
            <p className="text-xl text-gray-600">
              Step-by-step guide to booking your perfect appointment
            </p>
          </div>

          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-8">
              {/* Step 1 */}
              <div className="mb-12">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mr-4">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Browse Available Sellers</h3>
                    <p className="text-gray-600 mb-4">
                      Start by browsing through our curated list of professional sellers. Each seller profile contains:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-6">
                      <li>Professional specialties and expertise</li>
                      <li>Hourly rates and meeting duration</li>
                      <li>Customer reviews and ratings</li>
                      <li>Real-time availability calendar</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-blue-900">Pro Tip</span>
                  </div>
                  <p className="text-blue-800">
                    Use the search and filter options to find sellers that match your specific needs and budget.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-12">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mr-4">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Select Your Preferred Time Slot</h3>
                    <p className="text-gray-600 mb-4">
                      Once you've found the perfect seller, view their availability calendar:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-6">
                      <li>Green slots indicate available times</li>
                      <li>Gray slots are already booked</li>
                      <li>Choose between "This Month" or "Next Month" views</li>
                      <li>All times are displayed in your local timezone</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-900">Time Zones</span>
                  </div>
                  <p className="text-green-800">
                    All appointment times are automatically converted to your local timezone for convenience.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-12">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mr-4">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Confirm Your Booking Details</h3>
                    <p className="text-gray-600 mb-4">
                      After selecting a time slot, you'll see a confirmation modal with:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-6">
                      <li>Seller name and contact information</li>
                      <li>Selected date and time details</li>
                      <li>Meeting duration and hourly rate</li>
                      <li>Option to add a custom meeting title</li>
                    </ul>
                    <p className="text-gray-600 mt-4">
                      Review all details carefully before confirming your booking.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-12">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mr-4">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Automatic Calendar Integration</h3>
                    <p className="text-gray-600 mb-4">
                      Once you confirm your booking, our system automatically:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-6">
                      <li>Adds the appointment to your Google Calendar</li>
                      <li>Adds the appointment to the seller's Google Calendar</li>
                      <li>Generates a Google Meet link for the meeting</li>
                      <li>Sends calendar invitations to both parties</li>
                      <li>Provides instant confirmation</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-6-4h6m2 8a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v14z" />
                    </svg>
                    <span className="font-medium text-purple-900">Google Integration</span>
                  </div>
                  <p className="text-purple-800">
                    Make sure you're signed in with your Google account to enable automatic calendar synchronization.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="mb-8">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mr-4">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Manage Your Appointments</h3>
                    <p className="text-gray-600 mb-4">
                      After booking, you can:
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-6">
                      <li>View all appointments in your dashboard</li>
                      <li>Filter by upcoming, past, or all appointments</li>
                      <li>Cancel appointments if needed (with proper notice)</li>
                      <li>Access Google Meet links for virtual meetings</li>
                      <li>Leave reviews after completed appointments</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additional Tips */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Tips for Success</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Before Your Appointment</h4>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Check your email for confirmation details</li>
                      <li>• Test your Google Meet connection</li>
                      <li>• Prepare any questions or materials</li>
                      <li>• Set reminders on your calendar</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">During Your Appointment</h4>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Join the meeting on time</li>
                      <li>• Have a stable internet connection</li>
                      <li>• Use a professional background if on video</li>
                      <li>• Take notes for future reference</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => router.push('/dashboard/buyer')}
                  className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary-dark transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}