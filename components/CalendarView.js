import { useState, useEffect } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns'
import clsx from 'clsx'

// Simple chevron components since heroicons isn't installed
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

export default function CalendarView({ events = [], onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = "d"
  const rows = []
  let days = []
  let day = startDate

  // Create calendar grid
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayEvents = events.filter(event => 
        isSameDay(new Date(event.start), day)
      )
      
      days.push(
        <div
          key={day.toString()}
          className={clsx(
            'min-h-[80px] sm:min-h-[100px] md:min-h-[120px] border p-1 sm:p-2 cursor-pointer transition-all duration-200 touch-manipulation',
            'border-gray-200 dark:border-gray-700',
            !isSameMonth(day, monthStart) 
              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600' 
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            isSameDay(day, new Date()) 
              ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          )}
          onClick={() => onDateClick && onDateClick(day)}
        >
          <div className={clsx(
            'font-medium mb-1 sm:mb-2 text-xs sm:text-sm',
            isSameDay(day, new Date()) && 'text-primary-700 dark:text-primary-400'
          )}>
            {format(day, dateFormat)}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event, index) => (
              <div
                key={index}
                className="text-xs p-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded truncate shadow-sm glow-sm"
                title={event.title}
              >
                <span className="hidden sm:inline">{event.title}</span>
                <span className="sm:hidden">•</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    )
    days = []
  }

  return (
    <div className="card">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md touch-manipulation transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary px-2 sm:px-3 py-1 text-xs sm:text-sm touch-manipulation"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md touch-manipulation transition-colors duration-200"
          >
            <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-auto max-h-[60vh] sm:max-h-none">{rows}</div>
    </div>
  )
}
