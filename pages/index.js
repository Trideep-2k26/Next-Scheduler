import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    // If user is authenticated and has a role, redirect to appropriate dashboard
    if (session && session.user.role) {
      if (session.user.role === 'seller') {
        router.push('/dashboard/seller')
      } else if (session.user.role === 'buyer') {
        router.push('/dashboard/buyer')
      }
    }
    
    // If user is authenticated but has no role, redirect to choose-role page
    if (session && !session.user.role) {
      router.push('/choose-role')
    }
  }, [session, status, router])

  const handleRoleSelection = async (role) => {
    setIsSigningIn(true)
    // Store the intended role in localStorage so we can set it after OAuth
    localStorage.setItem('pendingRole', role)
    await signIn('google')
  }

  const handleExistingUserLogin = async () => {
    setIsSigningIn(true)
    await signIn('google')
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    )
  }

  // If user is authenticated, they will be redirected - don't show landing page
  if (session) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Professional Appointment Scheduler">
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
              Professional Appointment Scheduler
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Seamlessly connect sellers and buyers through integrated Google Calendar 
              scheduling. Book appointments, manage availability, and sync with your 
              calendar automatically.
            </p>
            
            {/* Login Button for existing users */}
            <div className="mt-6 sm:mt-8">
              <button
                onClick={handleExistingUserLogin}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Login to Your Account
                    <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* New User Role Selection Cards */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">New User? Choose Your Role</h2>
            <p className="text-gray-600">Select how you'd like to use our platform</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-12 sm:mb-16">
            {/* Seller Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-6 sm:p-8 lg:p-10 border border-gray-100 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">For Sellers</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  Share your calendar availability and accept bookings 
                  from potential buyers.
                </p>
                
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Integrate with Google Calendar</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Manage availability automatically</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Accept bookings seamlessly</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRoleSelection('seller')}
                  disabled={isSigningIn}
                  className="inline-flex items-center justify-center w-full bg-gray-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-gray-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing up...
                    </>
                  ) : (
                    <>
                      Get Started as Seller
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Buyer Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-6 sm:p-8 lg:p-10 border border-gray-100 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">For Buyers</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  Browse available sellers and book appointments that sync 
                  with your calendar.
                </p>
                
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Browse seller availability</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Book appointments instantly</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span>Auto-sync with your calendar</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRoleSelection('buyer')}
                  disabled={isSigningIn}
                  className="inline-flex items-center justify-center w-full bg-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-purple-700 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing up...
                    </>
                  ) : (
                    <>
                      Get Started as Buyer
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Features Footer */}
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">Powered by Google Calendar Integration</p>
            <div className="flex flex-col sm:flex-row justify-center sm:space-x-6 lg:space-x-8 space-y-3 sm:space-y-0 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center justify-center sm:justify-start">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure OAuth authentication</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Real-time calendar sync</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Automatic event creation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
