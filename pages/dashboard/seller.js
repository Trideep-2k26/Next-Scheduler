import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { formatMonthRange } from '../../lib/dateUtils'
import axios from 'axios'

export default function SellerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
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
    hourlyRate: 100,
    currency: 'INR',
    meetingDuration: 30
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, availability, appointments, profile
  const [selectedMonth, setSelectedMonth] = useState('this') // 'this' or 'next'
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [selectedDates, setSelectedDates] = useState([]) // Track selected calendar dates
  const [savedSpecificDates, setSavedSpecificDates] = useState([]) // Track saved specific date availability
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

    if (session.user.role !== 'seller') {
      // Not a seller: send to buyers area
      router.push('/sellers')
      return
    }

    // User is already a seller, load dashboard data
    fetchDashboardData()
  }, [session, status, router])

  // Refetch availability data when returning to availability tab
  useEffect(() => {
    if (activeTab === 'availability' && session?.user?.id) {
      fetchAvailabilityData()
    }
  }, [activeTab, session?.user?.id])

  const fetchAvailabilityData = async () => {
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
            return { ...slot, enabled: false } // Ensure unchecked days remain unchecked
          })
          setAvailability(updatedAvailability)
        }
      }

      // Fetch saved specific date availability
      const dateAvailabilityResponse = await fetch(`/api/availability/specific-dates/${session.user.id}`)
      if (dateAvailabilityResponse.ok) {
        const dateData = await dateAvailabilityResponse.json()
        setSavedSpecificDates(dateData.specificDates || [])
      }
    } catch (error) {
      console.log('Error fetching availability:', error)
    }
  }

  // Handle calendar date selection
  const toggleDateSelection = (date) => {
    const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + (selectedMonth === 'next' ? 1 : 0) + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr)
      } else {
        return [...prev, dateStr]
      }
    })
  }

  const applyCalendarSelection = async () => {
    if (selectedDates.length === 0) {
      alert('Please select at least one date from the calendar.')
      return
    }

    try {
      setSaving(true)
      
      // Save selected dates as specific date availability
      const response = await fetch('/api/availability/save-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selectedDates,
          // Use default time ranges for the selected dates (seller can customize later)
          startTime: '09:00',
          endTime: '17:00'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Successfully saved ${selectedDates.length} specific date${selectedDates.length > 1 ? 's' : ''} to your availability! Buyers will now see these dates for booking appointments.`)
        setShowCalendarPicker(false)
        setSelectedDates([])
      } else {
        alert(data.message || 'Failed to save calendar dates')
      }
    } catch (error) {
      console.error('Error saving calendar dates:', error)
      alert('Failed to save calendar dates. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Removed automatic conversion to seller role; role should be set via /seller/dashboard-setup

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
      await fetchAvailabilityData()

      // Set profile from session
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || '',
        description: session.user.description || 'Professional service provider',
        specialties: session.user.specialties ? session.user.specialties.split(',') : ['Consultation', 'Advisory'],
        hourlyRate: session.user.hourlyRate || 100,
        currency: session.user.currency || 'INR',
        meetingDuration: session.user.meetingDuration || 30
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
        body: JSON.stringify({ availability, month: selectedMonth })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSaveMessage(`Availability saved successfully for ${selectedMonth} month!`)
      } else {
        if (data.error === 'USER_NOT_FOUND') {
          setSaveMessage('Session expired. Please refresh the page and log in again.')
        } else {
          setSaveMessage(data.message || 'Failed to save availability')
        }
      }
    } catch (error) {
      console.error('Save availability error:', error)
      setSaveMessage('Failed to save availability')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(''), 4000)
    }
  }

  const handleProfileUpdate = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description,
          specialties: profile.specialties,
          hourlyRate: profile.hourlyRate,
          currency: profile.currency,
          meetingDuration: profile.meetingDuration
        })
      })
      if (response.ok) {
        setSaveMessage('Profile updated successfully!')
      } else {
        setSaveMessage('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveMessage('Failed to update profile')
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
    <Layout title="Seller Dashboard - Next Scheduler">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Seller Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your availability, appointments, and profile.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 sm:mb-8">
            {/* Mobile Tab Navigation - Horizontal Scroll */}
            <nav className="md:hidden">
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {[
                  { id: 'dashboard', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
                  { id: 'availability', label: 'Availability', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { id: 'appointments', label: 'Appointments', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg font-medium transition-colors text-xs whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex space-x-4 lg:space-x-8">
              {[
                { id: 'dashboard', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
                { id: 'availability', label: 'Availability', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'appointments', label: 'Appointments', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg sm:rounded-xl">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg sm:rounded-xl">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg sm:rounded-xl">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Bookings</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Upcoming Appointments</h2>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm sm:text-base">No upcoming appointments</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Set your availability to start receiving bookings</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={appointment.buyer.image || '/default-avatar.png'}
                              alt={appointment.buyer.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{appointment.title}</p>
                              <p className="text-sm text-gray-600">with {appointment.buyer.name}</p>
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
          )}

          {activeTab === 'availability' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Set Your Availability</h2>
                  <p className="text-gray-600">Choose the days and times when you're available for appointments.</p>
                </div>
              </div>

              {/* Enhanced Month Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  📅 Select Month Period
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl bg-white text-gray-900 font-medium focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 min-w-[180px]"
                    >
                      <option value="this">📅 This Month</option>
                      <option value="next">➡️ Next Month</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-sm font-medium text-blue-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Period: {formatMonthRange(selectedMonth)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Your availability will apply to this entire month period
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Calendar Integration */}
              <div className="mb-8">
                <div className="card bg-white border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Google Calendar Integration</h3>
                        <p className="text-sm text-gray-600">Import your available times directly from Google Calendar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCalendarPicker(true)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.5 3A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13A2.5 2.5 0 0 1 4.5 3h15Zm0 1.5h-15A1 1 0 0 0 3.5 5.5V7h17V5.5a1 1 0 0 0-1-1ZM20.5 8.5h-17v10a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-10Z" />
                      </svg>
                      <span>Choose from Calendar</span>
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    💡 <strong>How it works:</strong> Select dates and times from your Google Calendar when you're available for appointments. 
                    This will automatically update your weekly schedule below.
                  </div>
                </div>
              </div>

              {/* Google Calendar Picker Modal */}
              {showCalendarPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.5 3A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13A2.5 2.5 0 0 1 4.5 3h15Zm0 1.5h-15A1 1 0 0 0 3.5 5.5V7h17V5.5a1 1 0 0 0-1-1ZM20.5 8.5h-17v10a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-10Z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">Google Calendar Picker</h2>
                          <p className="text-gray-600 text-sm">Select your available dates and times</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCalendarPicker(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Calendar Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Calendar View */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 {formatMonthRange(selectedMonth)}</h3>
                          <div className="bg-gray-50 rounded-xl p-4">
                            {/* Simple Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2 text-center text-sm">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="font-semibold text-gray-600 py-2">{day}</div>
                              ))}
                              {/* Calendar days - simplified for demo */}
                              {Array.from({ length: 35 }, (_, i) => {
                                const dayNumber = i - 6 + 1;
                                const isValidDay = dayNumber > 0 && dayNumber <= 31;
                                const dateStr = isValidDay ? `${new Date().getFullYear()}-${String(new Date().getMonth() + (selectedMonth === 'next' ? 1 : 0) + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}` : '';
                                const isSelected = selectedDates.includes(dateStr);
                                
                                return (
                                  <button
                                    key={i}
                                    onClick={() => isValidDay && toggleDateSelection(dayNumber)}
                                    className={`py-3 rounded-lg transition-all duration-200 ${
                                      !isValidDay 
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-red-500 text-white hover:bg-red-600 font-semibold shadow-md'
                                        : 'hover:bg-red-100 hover:text-red-800 text-gray-700 font-medium cursor-pointer'
                                    }`}
                                    disabled={!isValidDay}
                                  >
                                    {isValidDay ? dayNumber : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Time Selection */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">🕐 Available Times</h3>
                          <div className="space-y-3">
                            {[
                              { time: '9:00 AM - 12:00 PM', label: 'Morning Slot' },
                              { time: '1:00 PM - 5:00 PM', label: 'Afternoon Slot' },
                              { time: '6:00 PM - 9:00 PM', label: 'Evening Slot' },
                            ].map((slot, index) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-red-50 transition-colors">
                                <input
                                  type="checkbox"
                                  className="form-checkbox text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{slot.time}</div>
                                  <div className="text-sm text-gray-600">{slot.label}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions</h4>
                            <ol className="text-sm text-blue-800 space-y-1">
                              <li>1. Select dates when you're available by clicking on them</li>
                              <li>2. Choose your preferred time slots</li>
                              <li>3. Click "Apply Calendar Settings" to update</li>
                            </ol>
                            {selectedDates.length > 0 && (
                              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg">
                                <p className="text-sm font-medium text-green-800">
                                  ✅ {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => setShowCalendarPicker(false)}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={applyCalendarSelection}
                          className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Apply Calendar Settings ({selectedDates.length} selected)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Saved Specific Dates */}
              {savedSpecificDates.length > 0 && (
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Your Extra Available Dates</h3>
                          <p className="text-sm text-gray-600">Specific dates you've added beyond your weekly schedule</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {savedSpecificDates.map((dateAvailability, index) => (
                        <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(dateAvailability.date + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {dateAvailability.startTime} - {dateAvailability.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-blue-800 bg-blue-100 rounded-lg p-3">
                      💡 <strong>Buyers can now book appointments on these specific dates</strong> in addition to your regular weekly availability below.
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">{availability.map((day) => (
                  <div key={day.dayOfWeek} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={() => toggleAvailability(day.dayOfWeek)}
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="font-medium text-gray-900 w-24">
                        {dayNames[day.dayOfWeek]}
                      </span>
                    </div>
                    
                    {day.enabled && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">From:</label>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => updateTimeSlot(day.dayOfWeek, 'startTime', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">To:</label>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => updateTimeSlot(day.dayOfWeek, 'endTime', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex-1">
                  {saveMessage && (
                    <p className={`text-sm ${saveMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : `Save ${selectedMonth === 'this' ? 'This' : 'Next'} Month`}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">All Appointments</h2>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                  <p className="text-gray-600">Once you set your availability, buyers will be able to book appointments with you.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-6 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={appointment.buyer.image || '/default-avatar.png'}
                            alt={appointment.buyer.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                            <p className="text-gray-600">with {appointment.buyer.name}</p>
                            <p className="text-sm text-gray-500">{appointment.buyer.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {new Date(appointment.start).toLocaleDateString(undefined, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-gray-600">
                            {new Date(appointment.start).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(appointment.end).toLocaleTimeString([], { 
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
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
              <p className="text-gray-600 mb-8">Update your profile information so buyers know what services you provide.</p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-6">
                  <img
                    src={profile.image || '/default-avatar.png'}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">Profile Photo</h3>
                    <p className="text-sm text-gray-600">This will be shown to buyers when they browse sellers</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({...profile, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                    placeholder="Describe what services you provide..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Consultation', 'Advisory', 'Professional Services', 'Coaching', 'Training', 'Support', 'Analysis', 'Strategy', 'Planning', 'Development'].map((specialty) => (
                      <label key={specialty} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.specialties.includes(specialty)}
                          onChange={(e) => {
                            const newSpecialties = e.target.checked
                              ? [...profile.specialties, specialty]
                              : profile.specialties.filter(s => s !== specialty)
                            setProfile({...profile, specialties: newSpecialties})
                          }}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{specialty}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Meeting Duration</label>
                    <select
                      value={profile.meetingDuration || 30}
                      onChange={(e) => setProfile({...profile, meetingDuration: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (Optional)</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <select
                          value={profile.currency}
                          onChange={(e) => setProfile({...profile, currency: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary text-sm"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">
                            {profile.currency === 'INR' ? '₹' : profile.currency === 'EUR' ? '€' : '$'}
                          </span>
                          <input
                            type="number"
                            value={profile.hourlyRate}
                            onChange={(e) => setProfile({...profile, hourlyRate: parseInt(e.target.value)})}
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                            placeholder={profile.currency === 'INR' ? '5000' : '100'}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select your preferred currency and set your hourly rate
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6">
                  <div className="flex-1">
                    {saveMessage && (
                      <p className={`text-sm ${saveMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
