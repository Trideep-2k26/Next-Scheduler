/**
 * Background Task Monitoring Page
 * Shows recent bookings and background task completion status
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '../components/Layout'

export default function BackgroundTaskMonitor() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (session?.user) {
      fetchRecentAppointments()
    }
  }, [session])

  const fetchRecentAppointments = async () => {
    try {
      setLoading(true)
      // This would need to be implemented as an API endpoint
      // For now, showing the UI structure
      setAppointments([
        {
          id: '1',
          title: 'Sample Appointment',
          createdAt: new Date(),
          buyer: { name: 'John Doe', email: 'john@example.com' },
          seller: { name: 'Jane Smith', email: 'jane@example.com' },
          googleEventId: 'seller-event-123',
          buyerGoogleEventId: 'buyer-event-456', 
          meetLink: 'https://meet.google.com/abc-def-ghi',
          confirmationEmail: JSON.stringify({ subject: 'Test Subject' })
        }
      ])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTaskStatus = (appointment) => {
    const tasks = {
      sellerCalendar: !!appointment.googleEventId,
      buyerCalendar: !!appointment.buyerGoogleEventId,
      meetLink: !!appointment.meetLink,
      email: !!appointment.confirmationEmail
    }
    
    const completed = Object.values(tasks).filter(Boolean).length
    const total = Object.keys(tasks).length
    
    return { tasks, completed, total, percentage: (completed / total * 100) }
  }

  const testBackgroundTasks = async (appointmentId) => {
    try {
      const response = await fetch('/api/test-background-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Background task test completed!\n\nResults:\n- Seller Calendar: ${result.results.tasks.sellerCalendar.status}\n- Buyer Calendar: ${result.results.tasks.buyerCalendar.status}\n- Meet Link: ${result.results.tasks.meetLink.status}\n- Email: ${result.results.tasks.email.status}`)
        fetchRecentAppointments() // Refresh data
      } else {
        throw new Error('Test failed')
      }
    } catch (error) {
      alert(`Test failed: ${error.message}`)
    }
  }

  if (!session) {
    return <Layout><div className="p-4">Please log in to view background task monitoring.</div></Layout>
  }

  if (loading) {
    return <Layout><div className="p-4">Loading appointments...</div></Layout>
  }

  if (error) {
    return <Layout><div className="p-4 text-red-600">Error: {error}</div></Layout>
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Background Task Monitor</h1>
          <p className="text-gray-600">Monitor calendar events and email delivery for recent bookings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Background tasks: Calendar events + Meet links + Confirmation emails
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller Calendar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer Calendar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meet Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => {
                  const status = getTaskStatus(appointment)
                  
                  return (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{appointment.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(appointment.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.tasks.sellerCalendar 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.tasks.sellerCalendar ? '✅ Created' : '❌ Missing'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.tasks.buyerCalendar 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.tasks.buyerCalendar ? '✅ Created' : '❌ Missing'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.tasks.meetLink 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.tasks.meetLink ? '✅ Generated' : '❌ Missing'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.tasks.email 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.tasks.email ? '✅ Sent' : '❌ Missing'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                status.percentage === 100 ? 'bg-green-500' : 
                                status.percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${status.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {status.completed}/{status.total}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => testBackgroundTasks(appointment.id)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                        >
                          Test Tasks
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {appointments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No recent appointments found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Make a booking to see background task monitoring here.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Monitor Background Tasks</h3>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <div>
                <strong>Make a booking</strong> - The booking should complete in under 2 seconds
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <div>
                <strong>Check Vercel logs</strong> - Look for [BACKGROUND] messages showing task progress
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <div>
                <strong>Verify results</strong> - Check Google Calendars and email inbox within 15 seconds
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="font-semibold mr-2">4.</span>
              <div>
                <strong>Use "Test Tasks" button</strong> - Manually test background processing for any appointment
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <p className="text-xs text-blue-600 font-mono">
              Expected Vercel logs: [BACKGROUND] 🚀 Starting → ✅ Seller calendar → ✅ Buyer calendar → ✅ Email sent → 🎉 All completed
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}