import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

export default function ChooseRole() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/login')
      return
    }
    
    // If user already has a role, redirect to appropriate dashboard
    if (session.user?.role) {
      if (session.user.role === 'seller') {
        router.push('/dashboard/seller')
      } else if (session.user.role === 'buyer') {
        router.push('/dashboard/buyer')
      }
      return
    }

    // Check if there's a pending role from OAuth flow
    const pendingRole = localStorage.getItem('pendingRole')
    if (pendingRole && ['seller', 'buyer'].includes(pendingRole)) {
      localStorage.removeItem('pendingRole')
      handleRoleSelection(pendingRole)
    }
  }, [session, status, router])

  const handleRoleSelection = async (selectedRole) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/role-set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to set role')
      }

      // Force session refresh and redirect
      window.location.href = selectedRole === 'seller' ? '/dashboard/seller' : '/dashboard/buyer'
    } catch (error) {
      console.error('Error setting role:', error)
      setError('Failed to set your role. Please try again.')
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  if (session.user?.role) {
    return null // Will redirect to appropriate dashboard
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to NextScheduler!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Hi {session.user.name}, please choose how you'd like to use our platform
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Seller Option */}
            <button
              onClick={() => handleRoleSelection('seller')}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-6 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">👨‍💼</div>
                <div className="text-lg font-semibold">Get Started as Seller</div>
                <div className="text-sm opacity-90 mt-1">
                  Offer your services and manage appointments
                </div>
              </div>
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
            </button>

            {/* Buyer Option */}
            <button
              onClick={() => handleRoleSelection('buyer')}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-6 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🛒</div>
                <div className="text-lg font-semibold">Get Started as Buyer</div>
                <div className="text-sm text-gray-600 mt-1">
                  Book appointments with service providers
                </div>
              </div>
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can change your account type later in your profile settings
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}