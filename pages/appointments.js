import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import AppointmentItem from '../components/AppointmentItem'
import { format, isAfter, isBefore } from 'date-fns'

export default function Appointments() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState([])
  const [filteredAppointments, setFilteredAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, upcoming, past

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    fetchAppointments()
  }, [session, status, router])

  useEffect(() => {
    applyFilter()
  }, [appointments, filter])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = (appointmentId) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
  }

  const applyFilter = () => {
    const now = new Date()
    
    let filtered = appointments
    
    if (filter === 'upcoming') {
      filtered = appointments.filter(apt => isAfter(new Date(apt.start), now))
    } else if (filter === 'past') {
      filtered = appointments.filter(apt => isBefore(new Date(apt.start), now))
    }
    
    setFilteredAppointments(filtered)
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

  return (
    <Layout title="My Appointments - Next Scheduler">
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
            <p className="text-gray-600">
              Manage your upcoming and past appointments
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({appointments.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'upcoming'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Upcoming ({appointments.filter(apt => isAfter(new Date(apt.start), new Date())).length})
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'past'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Past ({appointments.filter(apt => isBefore(new Date(apt.start), new Date())).length})
              </button>
            </div>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {filter === 'all' ? '' : filter} appointments
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto mb-6">
                {filter === 'upcoming' 
                  ? "You don't have any upcoming appointments scheduled."
                  : filter === 'past'
                  ? "You don't have any past appointments to display."
                  : "You haven't scheduled any appointments yet."
                }
              </p>
              {filter === 'all' && session.user.role === 'buyer' && (
                <button
                  onClick={() => router.push('/sellers')}
                  className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors"
                >
                  Book Your First Appointment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAppointments.map((appointment) => (
                <AppointmentItem 
                  key={appointment.id} 
                  appointment={appointment} 
                  onCancel={handleCancelAppointment}
                />
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-12 bg-gray-50 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Need to schedule something?
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session.user.role === 'buyer' && (
                <button
                  onClick={() => router.push('/sellers')}
                  className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors"
                >
                  Browse Sellers
                </button>
              )}
              {session.user.role === 'seller' && (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors"
                  >
                    Manage Availability
                  </button>
                  <button 
                    onClick={() => window.open('https://calendar.google.com', '_blank')}
                    className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>Sync with Google Calendar</span>
                  </button>
                  <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors">
                    Export Calendar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
