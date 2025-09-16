import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function BookAppointment() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      // Redirect to Google sign-in with buyer callback
      signIn('google', { 
        callbackUrl: '/buyer/appointment-setup'
      })
      return
    }

    // If user is signed in, check their role
    if (session.user.role === 'buyer') {
      // Redirect to seller search
      router.push('/sellers')
    } else if (session.user.role === 'seller') {
      // User is a seller trying to book - redirect to dashboard
      router.push('/dashboard')
    } else {
      // User has no role, set as buyer
      setUserRole()
    }
  }, [session, status, router])

  const setUserRole = async () => {
    try {
      await fetch('/api/role-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'buyer' })
      })
      // Refresh the page to get updated session
      router.reload()
    } catch (error) {
      console.error('Error setting buyer role:', error)
    }
  }

  return (
    <Layout title="Book Appointment - Next Scheduler">
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-sm sm:max-w-md w-full text-center">
          <div className="card">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-3 sm:mb-4">
              Book an Appointment
            </h1>
            <p className="text-responsive-sm text-gray-600 mb-4 sm:mb-6">
              Sign in with Google to browse available sellers and book appointments.
            </p>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Browse verified sellers
              </div>
              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Real-time availability
              </div>
              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Instant Google Meet links
              </div>
            </div>
            {status === 'loading' && (
              <div className="flex justify-center mt-4 sm:mt-6">
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-red-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
