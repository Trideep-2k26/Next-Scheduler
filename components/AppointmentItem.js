import { format, parseISO, isAfter } from 'date-fns'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, Button } from './ui'
import ProfileImage from './ProfileImage'

export default function AppointmentItem({ appointment, onCancel }) {
  const { data: session } = useSession()
  const [cancelling, setCancelling] = useState(false)
  const isUpcoming = isAfter(parseISO(appointment.start), new Date())
  const otherUser = appointment.userRole === 'seller' ? appointment.buyer : appointment.seller

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch('/api/appointments/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appointmentId: appointment.id })
      })

      if (response.ok) {
        alert('Appointment cancelled successfully!')
        if (onCancel) {
          onCancel(appointment.id)
        }
      } else {
        const error = await response.json()
        alert('Failed to cancel appointment: ' + error.message)
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Failed to cancel appointment. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const downloadICS = () => {
    const start = parseISO(appointment.start)
    const end = parseISO(appointment.end)
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Next Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@nextscheduler.com`,
      `DTSTART:${format(start, "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTEND:${format(end, "yyyyMMdd'T'HHmmss'Z'")}`,
      `SUMMARY:${appointment.title}`,
      `DESCRIPTION:Meeting with ${otherUser.name}${appointment.meetLink ? `\\n\\nJoin meeting: ${appointment.meetLink}` : ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n')

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${appointment.title}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="animate-fade-in">
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          appointment.status === 'confirmed' 
            ? 'status-success' 
            : appointment.status === 'cancelled' 
            ? 'status-error' 
            : 'status-warning'
        }`}>
          {appointment.status === 'confirmed' ? '✓ Confirmed' : appointment.status === 'cancelled' ? '✗ Cancelled' : '⏳ Pending'}
        </span>
        {!isUpcoming && (
          <span className="text-xs text-gray-500">Past</span>
        )}
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <ProfileImage
          src={otherUser.image}
          alt={otherUser.name}
          name={otherUser.name}
          size="w-10 h-10"
          className="flex-shrink-0 ring-2 ring-gray-200"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{appointment.title}</h3>
          <p className="text-sm text-gray-600 truncate">
            with {otherUser.name} ({appointment.userRole === 'seller' ? 'Client' : 'Provider'})
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{format(parseISO(appointment.start), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="truncate">
            {format(parseISO(appointment.start), 'h:mm a')} - {format(parseISO(appointment.end), 'h:mm a')}
          </span>
        </div>
        {appointment.meetLink && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span className="truncate text-primary-600 dark:text-primary-400">Video call included</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {appointment.meetLink && isUpcoming && (
          <Button
            as="a"
            href={appointment.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            Join Meet
          </Button>
        )}
        
        <Button variant="secondary" onClick={downloadICS} className="flex-1">
          Add to Calendar (.ics)
        </Button>
        
        {/* Only show cancel button for buyers and upcoming appointments */}
        {isUpcoming && session?.user?.role === 'buyer' && (
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1"
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}
      </div>
    </Card>
  )
}