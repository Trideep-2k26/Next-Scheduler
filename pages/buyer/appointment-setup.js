import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import axios from 'axios'

export default function AppointmentSetup() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/buyer/appointment')
      return
    }

    // Set user role as buyer and redirect to sellers
    setupBuyerRole()
  }, [session, status, router])

  const setupBuyerRole = async () => {
    try {
      await axios.post('/api/role-set', { role: 'buyer' })
      // Redirect to seller search
      router.push('/sellers')
    } catch (error) {
      console.error('Error setting buyer role:', error)
      // Still redirect to sellers, role might already be set
      router.push('/sellers')
    }
  }

  return (
    <Layout title="Setting up your appointment booking - Next Scheduler">
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-sm sm:max-w-md w-full text-center">
          <div className="card">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-500 mx-auto mb-4 sm:mb-6"></div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
              Setting up your booking...
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              We're preparing your buyer account and connecting to available sellers.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
