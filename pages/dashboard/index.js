import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import CalendarView from '../../components/CalendarView'
import axios from 'axios'

export default function SellerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [availability, setAvailability] = useState([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', enabled: false }, // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', enabled: false }, // Tuesday  
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', enabled: false }, // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', enabled: false }, // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', enabled: false }, // Friday
    { dayOfWeek: 6, startTime: '10:00', endTime: '16:00', enabled: false }, // Saturday
    { dayOfWeek: 0, startTime: '10:00', endTime: '16:00', enabled: false }, // Sunday
  ])
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    image: '',
    description: '',
    specialties: [],
    hourlyRate: 100
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, availability, appointments, profile
  const [stats, setStats] = useState({
    thisWeek: 0,
    thisMonth: 0,
    totalBookings: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    // Route users to their appropriate dashboards based on role
    if (session.user.role === 'seller') {
      router.push('/dashboard/seller')
      return
    } else if (session.user.role === 'buyer') {
      router.push('/buyer')
      return
    } else {
      // If no role is set, redirect to get started page
      router.push('/')
      return
    }

    fetchDashboardData()
  }, [session, status, router])

  const fetchDashboardData = async () => {
    try {
      // Fetch appointments
      const appointmentsResponse = await fetch('/api/appointments')
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json()
        const upcoming = appointmentsData.appointments
          .filter(apt => new Date(apt.start) > new Date())
          .slice(0, 5)
        setUpcomingAppointments(upcoming)
        setCalendarEvents(appointmentsData.appointments)
        
        // Calculate stats
        const now = new Date()
        const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const weekBookings = appointmentsData.appointments.filter(apt => 
          new Date(apt.start) >= thisWeekStart
        ).length
        
        const monthBookings = appointmentsData.appointments.filter(apt => 
          new Date(apt.start) >= thisMonthStart
        ).length

        setStats({
          thisWeek: weekBookings,
          thisMonth: monthBookings,
          totalBookings: appointmentsData.appointments.length
        })
      }

      // Fetch current seller's availability
      try {
        const availabilityResponse = await fetch(`/api/availability/${session.user.id}`)
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json()
          if (availabilityData.availability && availabilityData.availability.length > 0) {
            // Map database availability to state
            const updatedAvailability = availability.map(slot => {
              const dbSlot = availabilityData.availability.find(av => av.dayOfWeek === slot.dayOfWeek)
              if (dbSlot) {
                return {
                  ...slot,
                  startTime: dbSlot.startTime,
                  endTime: dbSlot.endTime,
                  enabled: true
                }
              }
              return slot
            })
            setAvailability(updatedAvailability)
          }
        }
      } catch (error) {
        console.log('No existing availability found, using defaults')
      }

      // Set profile from session
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || '',
        description: 'Professional service provider',
        specialties: ['Consultation', 'Advisory'],
        hourlyRate: 100
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = (dayOfWeek) => {
    setAvailability(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek 
        ? { ...day, enabled: !day.enabled }
        : day
    ))
  }

  const updateTimeSlot = (dayOfWeek, field, value) => {
    setAvailability(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek 
        ? { ...day, [field]: value }
        : day
    ))
  }

  const handleSaveAvailability = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const response = await fetch('/api/availability/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to save')
      setSaveMessage('Availability saved')
    } catch (error) {
      console.error('Save availability error:', error)
      setSaveMessage('Failed to save availability')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(''), 4000)
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
    <Layout title="Dashboard - Next Scheduler">
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-gray-600">
              Manage your availability and view upcoming appointments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Calendar */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Calendar Overview</h2>
                <CalendarView 
                  events={calendarEvents}
                  onDateClick={(date) => console.log('Date clicked:', date)}
                />
              </div>

              {/* Availability Settings */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Weekly Availability</h2>
                <div className="space-y-4">
                  {availability.map((day) => (
                    <div key={day.dayOfWeek} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={() => toggleAvailability(day.dayOfWeek)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="w-24">
                        <span className={`font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {dayNames[day.dayOfWeek]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateTimeSlot(day.dayOfWeek, 'startTime', e.target.value)}
                          disabled={!day.enabled}
                          className="px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateTimeSlot(day.dayOfWeek, 'endTime', e.target.value)}
                          disabled={!day.enabled}
                          className="px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center space-x-4">
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Availability'}
                  </button>
                  {saveMessage && (
                    <div className="text-sm text-gray-600">{saveMessage}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Quick Stats */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Stats</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                    <span className="text-gray-700">This Week</span>
                    <span className="font-semibold text-primary">{upcomingAppointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <span className="text-gray-700">This Month</span>
                    <span className="font-semibold text-green-600">12</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <span className="text-gray-700">Total Earnings</span>
                    <span className="font-semibold text-blue-600">$2,400</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming</h2>
                  <button
                    onClick={() => router.push('/appointments')}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                  >
                    View all
                  </button>
                </div>
                
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <img
                            src={appointment.buyer.image || '/default-avatar.png'}
                            alt={appointment.buyer.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {appointment.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              with {appointment.buyer.name}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(appointment.start).toLocaleDateString()} at{' '}
                          {new Date(appointment.start).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors">
                    <div className="font-medium text-gray-900">Block Time</div>
                    <div className="text-sm text-gray-600">Mark periods as unavailable</div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="font-medium text-gray-900">Set Buffer Time</div>
                    <div className="text-sm text-gray-600">Add breaks between meetings</div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="font-medium text-gray-900">Update Profile</div>
                    <div className="text-sm text-gray-600">Edit bio and specialties</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
