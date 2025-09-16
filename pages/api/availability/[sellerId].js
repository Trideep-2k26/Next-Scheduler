import prisma from '../../../lib/prisma'
import { fetchFreeBusy } from '../../../lib/google'
import { decryptToken } from '../../../lib/encryption'
import { getThisMonthRange, getNextMonthRange } from '../../../lib/dateUtils'
import { 
  addDays, 
  addMinutes, 
  format, 
  isAfter, 
  isBefore, 
  parseISO,
  startOfDay,
  getDay,
  isWithinInterval
} from 'date-fns'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { sellerId } = req.query
  const { duration = '30', month = 'this' } = req.query // duration in minutes, month = 'this' or 'next'
  const durationMinutes = parseInt(duration)

  try {
    // Get date range based on month parameter FIRST
    const monthRange = month === 'next' ? getNextMonthRange() : getThisMonthRange()
    const timeMin = monthRange.start.toISOString()
    const timeMax = monthRange.end.toISOString()

    // Get seller info
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      include: { 
        sellerAvailability: true,
        sellerDateAvailability: {
          where: {
            date: {
              gte: new Date(timeMin),
              lte: new Date(timeMax)
            }
          }
        }
      }
    })

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' })
    }

    let busySlots = []
    
    // Fetch existing appointments from database
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        sellerId: sellerId,
        start: {
          gte: new Date(timeMin),
          lte: new Date(timeMax)
        }
      },
      select: {
        start: true,
        end: true
      }
    })

    // Add database appointments to busy slots
    busySlots = existingAppointments.map(apt => ({
      start: apt.start.toISOString(),
      end: apt.end.toISOString()
    }))
    
    // Fetch Google Calendar busy slots if refresh token exists
    if (seller.refreshTokenEncrypted) {
      try {
        const refreshToken = decryptToken(seller.refreshTokenEncrypted)
        if (refreshToken) {
          const googleBusySlots = await fetchFreeBusy(refreshToken, timeMin, timeMax)
          busySlots = [...busySlots, ...googleBusySlots]
        }
      } catch (error) {
        console.error('Error fetching busy slots:', error)
      }
    }

    // Generate available slots based on seller availability and busy slots
    const availableSlots = []
    const now = new Date()

    // Calculate days to iterate over within the month range
    const startDate = month === 'this' ? now : monthRange.start
    const daysDiff = Math.ceil((monthRange.end - startDate) / (1000 * 60 * 60 * 24))

    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = addDays(startOfDay(startDate), i)
      
      // Skip if date is not within the month range
      if (!isWithinInterval(currentDate, { start: monthRange.start, end: monthRange.end })) {
        continue
      }
      
      const dayOfWeek = getDay(currentDate)
      
      // Check if there's a specific date availability for this date
      const specificDateAvailability = seller.sellerDateAvailability.find(
        dateAv => format(dateAv.date, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
      )
      
      // Use specific date availability if it exists, otherwise use weekly recurring availability
      const dayAvailability = specificDateAvailability || 
        seller.sellerAvailability.find(av => av.dayOfWeek === dayOfWeek)

      if (dayAvailability) {
        const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number)
        const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number)
        
        let slotTime = new Date(currentDate)
        slotTime.setHours(startHour, startMinute, 0, 0)
        
        const endTime = new Date(currentDate)
        endTime.setHours(endHour, endMinute, 0, 0)

        // Generate slots for this day
        while (isBefore(addMinutes(slotTime, durationMinutes), endTime)) {
          // Skip past slots (only for 'this' month)
          if (month === 'next' || isAfter(slotTime, now)) {
            const slotStart = slotTime.toISOString()
            const slotEnd = addMinutes(slotTime, durationMinutes).toISOString()
            
            // Check if slot conflicts with busy periods
            const isConflict = busySlots.some(busy => {
              const busyStart = parseISO(busy.start)
              const busyEnd = parseISO(busy.end)
              const slotStartTime = parseISO(slotStart)
              const slotEndTime = parseISO(slotEnd)
              
              return (
                (slotStartTime >= busyStart && slotStartTime < busyEnd) ||
                (slotEndTime > busyStart && slotEndTime <= busyEnd) ||
                (slotStartTime <= busyStart && slotEndTime >= busyEnd)
              )
            })

            if (!isConflict) {
              availableSlots.push({
                start: slotStart,
                end: slotEnd,
                duration: durationMinutes
              })
            }
          }
          
          slotTime = addMinutes(slotTime, durationMinutes)
        }
      }
    }

    res.status(200).json({
      sellerId,
      availableSlots: availableSlots.slice(0, 200) // Increased limit to show full month
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
