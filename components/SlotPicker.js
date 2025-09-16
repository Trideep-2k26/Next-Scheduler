import { useState, useEffect } from 'react'
import { format, parseISO, addDays, startOfDay, isWithinInterval } from 'date-fns'
import { getMonthRangeByType } from '../lib/dateUtils'
import clsx from 'clsx'

export default function SlotPicker({ sellerId, onSlotSelect, selectedSlot, duration = 30, monthType = 'this' }) {
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [groupedSlots, setGroupedSlots] = useState({})

  useEffect(() => {
    fetchAvailability()
  }, [sellerId, duration, monthType])

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/availability/${sellerId}?duration=${duration}&month=${monthType}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.availableSlots)
        
        
        const grouped = data.availableSlots.reduce((acc, slot) => {
          const date = format(parseISO(slot.start), 'yyyy-MM-dd')
          if (!acc[date]) acc[date] = []
          acc[date].push(slot)
          return acc
        }, {})
        
        setGroupedSlots(grouped)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  
  const monthRange = getMonthRangeByType(monthType)
  const startDate = monthRange.start
  const endDate = monthRange.end
  
  
  const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  const daysToShow = Math.min(diffInDays + 1, 31) 
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startOfDay(startDate), i))
    .filter(day => isWithinInterval(day, { start: startDate, end: endDate }))

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 glow"></div>
        <p className="text-sm text-gray-500 animate-pulse">Loading available time slots...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-2">Select a Time Slot</h3>
        <p className="text-sm sm:text-base text-gray-600">Choose from available 30-minute slots</p>
      </div>

      {/* Day Scroller */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-3 pb-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4 sm:space-x-0">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const daySlots = groupedSlots[dateKey] || []
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            
            return (
              <div
                key={dateKey}
                className={clsx(
                  'min-w-[140px] sm:min-w-0 flex-shrink-0 sm:flex-shrink w-36 sm:w-full',
                  'card hover:shadow-lg transform hover:scale-105 transition-all duration-300',
                  daySlots.length > 0 ? 'border-gray-200' : 'border-gray-100 opacity-60'
                )}
              >
                <div className="text-center mb-3">
                  <div className={clsx(
                    'text-xs sm:text-sm font-medium',
                    isToday ? 'text-primary-600' : 'text-gray-900'
                  )}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={clsx(
                    'text-lg sm:text-xl font-bold',
                    isToday ? 'text-primary-600' : 'text-gray-900'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(day, 'MMM')}
                  </div>
                </div>

                <div className="space-y-2">
                  {daySlots.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2">
                      No slots
                    </div>
                  ) : (
                    daySlots.slice(0, 6).map((slot, index) => (
                      <button
                        key={`${slot.start}-${index}`}
                        onClick={() => onSlotSelect(slot)}
                        className={clsx(
                          'w-full text-xs px-2 py-2 sm:py-1.5 rounded-md sm:rounded-lg font-medium transition-all duration-300 touch-manipulation transform hover:scale-105 active:scale-95',
                          selectedSlot?.start === slot.start
                            ? 'bg-primary-600 text-white shadow-md glow animate-pulse'
                            : 'bg-gray-50 text-gray-700 hover:bg-primary-500 hover:text-white hover:shadow-md hover:glow-sm active:bg-primary-600 active:text-white'
                        )}
                      >
                        {format(parseISO(slot.start), 'h:mm a')}
                      </button>
                    ))
                  )}
                  {daySlots.length > 6 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                      +{daySlots.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedSlot && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg sm:rounded-xl p-4 sm:p-6 animate-slideIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Selected Time</div>
              <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                {format(parseISO(selectedSlot.start), 'EEEE, MMMM d')} at{' '}
                {format(parseISO(selectedSlot.start), 'h:mm a')} - {format(parseISO(selectedSlot.end), 'h:mm a')}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Duration: {selectedSlot.duration} minutes
              </div>
            </div>
            <div className="text-primary-600 dark:text-primary-400 flex-shrink-0 self-center sm:self-auto animate-bounce">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
