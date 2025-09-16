import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Link from 'next/link'

export default function BuyerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sellers, setSellers] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role === 'seller') {
      router.push('/dashboard/seller')
      return
    }

    fetchBuyerData()
  }, [session, status, router])

  const fetchBuyerData = async () => {
    try {
      // Fetch available sellers
      const sellersResponse = await fetch('/api/sellers')
      if (sellersResponse.ok) {
        const sellersData = await sellersResponse.json()
        setSellers(sellersData.slice(0, 6)) // Show top 6 sellers
      }

      // Fetch buyer's appointments
      const appointmentsResponse = await fetch('/api/appointments')
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json()
        setAppointments(appointmentsData.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching buyer data:', error)
    } finally {
      setLoading(false)
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

  const upcomingAppointments = appointments.filter(apt => new Date(apt.start) > new Date())
  const pastAppointments = appointments.filter(apt => new Date(apt.start) <= new Date())

  return (
    <Layout title="Buyer Dashboard - Next Scheduler">
      <div className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-gray-600">
              Book appointments with professional sellers and manage your schedule.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{pastAppointments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Sellers</p>
                  <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Featured Sellers */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Available Sellers</h2>
                  <Link href="/sellers">
                    <button className="text-primary hover:text-primary-dark text-sm font-medium">
                      View All
                    </button>
                  </Link>
                </div>
                
                {sellers.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-gray-500">No sellers available at the moment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sellers.map((seller) => (
                      <div key={seller.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3 mb-3">
                          <img
                            src={seller.image || '/default-avatar.png'}
                            alt={seller.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{seller.name}</h3>
                            <p className="text-sm text-gray-500">{seller.serviceType || 'Consultation'}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-sm font-medium text-gray-900">${seller.hourlyRate}/hr</p>
                            <p className="text-xs text-gray-500">{seller.meetingDuration} min</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {seller.description || 'Professional service provider available for consultations and meetings.'}
                        </p>
                        {seller.specialties && (Array.isArray(seller.specialties) ? seller.specialties.length > 0 : seller.specialties.length > 0) && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(seller.specialties) 
                                ? seller.specialties.slice(0, 3)
                                : seller.specialties.split(',').slice(0, 3).map(s => s.trim())
                              ).map((specialty, index) => (
                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <Link href={`/sellers/${seller.id}`}>
                          <button className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                            Book Appointment
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 text-center">
                  <Link href="/sellers">
                    <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                      Browse All Sellers
                    </button>
                  </Link>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Appointments</h2>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 mb-4">No upcoming appointments</p>
                    <Link href="/sellers">
                      <button className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors">
                        Book Your First Appointment
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={appointment.seller.image || '/default-avatar.png'}
                              alt={appointment.seller.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <h3 className="font-medium text-gray-900">{appointment.title}</h3>
                              <p className="text-sm text-gray-600">with {appointment.seller.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {new Date(appointment.start).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.start).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/sellers">
                    <button className="w-full text-left p-3 bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors">
                      <div className="font-medium text-gray-900">Find Sellers</div>
                      <div className="text-sm text-gray-600">Browse available professionals</div>
                    </button>
                  </Link>
                  <Link href="/appointments">
                    <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                      <div className="font-medium text-gray-900">My Appointments</div>
                      <div className="text-sm text-gray-600">View all bookings</div>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {pastAppointments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastAppointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <img
                            src={appointment.seller.image || '/default-avatar.png'}
                            alt={appointment.seller.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {appointment.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(appointment.start).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Help & Support */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <Link href="/help/how-to-book" className="block text-sm text-gray-600 hover:text-primary transition-colors">
                    📚 How to book appointments
                  </Link>
                  <Link href="/help/contact-support" className="block text-sm text-gray-600 hover:text-primary transition-colors">
                    📞 Contact support
                  </Link>
                  <Link href="/help/faq" className="block text-sm text-gray-600 hover:text-primary transition-colors">
                    ❓ Frequently asked questions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
