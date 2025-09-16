import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function SellerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      // Redirect to Google sign-in with seller setup callback
      signIn('google', { 
        callbackUrl: '/seller/dashboard-setup'
      })
      return
    }

    // If user is signed in, check their role
    if (session.user.role === 'seller') {
      // Redirect to actual seller dashboard
      router.push('/dashboard/seller')
    } else if (session.user.role === 'buyer') {
      // Buyer wants to become seller: update their role
      setUserRole()
    } else {
      // User has no role, set as seller
      setUserRole()
    }
  }, [session, status, router])

  const setUserRole = async () => {
    try {
      await fetch('/api/role-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'seller' })
      })
      // Redirect to seller dashboard directly
      router.push('/dashboard/seller')
    } catch (error) {
      console.error('Error setting seller role:', error)
    }
  }

  return (
    <Layout title="Seller Dashboard - Next Scheduler">
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Seller Dashboard
            </h1>
            <p className="text-gray-600 mb-6">
              Sign in with Google to access your seller dashboard and start accepting bookings.
            </p>
            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Google Calendar integration
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Automatic availability sync
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Secure token storage
              </div>
            </div>
            {status === 'loading' && (
              <div className="flex justify-center mt-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
