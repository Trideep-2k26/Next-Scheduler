import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import axios from 'axios'

export default function DashboardSetup() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/seller/dashboard')
      return
    }

    // Always set user role as seller when they reach this page
    // This page is only accessed through seller signup flow
    setupSellerRole()
  }, [session, status, router])

  const setupSellerRole = async () => {
    try {
      console.log('Setting up seller role for user:', session.user.email)
      console.log('Current user role:', session.user.role)
      
      // Set role to seller
      const response = await axios.post('/api/role-set', { role: 'seller' })
      console.log('Role set response:', response.data)
      
      // Force session update to get new role
      console.log('Updating session...')
      const updatedSession = await update()
      console.log('Session updated:', updatedSession)
      
      // Redirect to seller dashboard
      setTimeout(() => {
        console.log('Redirecting to seller dashboard')
        window.location.href = '/dashboard/seller'
      }, 1000)
      
    } catch (error) {
      console.error('Error setting seller role:', error)
      console.log('Error details:', error.response?.data || error.message)
      
      // Still try to redirect, the role might have been set
      setTimeout(() => {
        console.log('Redirecting despite error')
        window.location.href = '/dashboard/seller'
      }, 1000)
    }
  }

  return (
    <Layout title="Setting up your Seller Dashboard - Next Scheduler">
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Setting up your dashboard...
            </h1>
            <p className="text-gray-600">
              We're configuring your seller account and Google Calendar integration.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
