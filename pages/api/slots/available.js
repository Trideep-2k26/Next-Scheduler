import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { getCached, slotCache } from '../../../lib/cache'
import { format, startOfDay, endOfDay, addMinutes, parseISO } from 'date-fns'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sellerId, date } = req.query

    if (!sellerId || !date) {
      return res.status(400).json({ 
        error: 'sellerId and date are required query parameters' 
      })
    }

        // Use NodeCache caching for availability with 60-second TTL
    const cacheKey = `availability:${sellerId}:${date}`
    const availableSlots = await getCached(
      cacheKey, 
      () => fetchAvailableSlotsFromDB(sellerId, date),
      60 // 60 seconds TTL
    )

        // Enhance slots with real-time lock status from NodeCache
    const enhancedSlots = enhanceSlotsWithLockStatus(availableSlots, sellerId, date)

    return res.status(200).json({
      availableSlots: enhancedSlots,
      sellerId,
      date,
      cached: true
    })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

async function fetchAvailableSlotsFromDB(sellerId, date) {
  // Validate seller exists
  const seller = await prisma.user.findUnique({
    where: { id: sellerId, role: 'SELLER' },
    select: {
      id: true,
      name: true,
      meetingDuration: true
    }
  })

  if (!seller) {
    throw new Error('Seller not found')
  }

  const targetDate = parseISO(date)
  const dayOfWeek = targetDate.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Get seller's availability for this day
  const [generalAvailability, specificAvailability] = await Promise.all([
    // General weekly availability
    prisma.sellerAvailability.findMany({
      where: {
        sellerId,
        dayOfWeek
      }
    }),
    // Specific date availability
    prisma.sellerDateAvailability.findMany({
      where: {
        sellerId,
        date: startOfDay(targetDate)
      }
    })
  ])

  // Use specific availability if available, otherwise fall back to general
  const availability = specificAvailability.length > 0 ? specificAvailability : generalAvailability

  if (availability.length === 0) {
    return []
  }

  // Get existing appointments for this seller on this date
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      sellerId,
      start: {
        gte: startOfDay(targetDate),
        lt: endOfDay(targetDate)
      }
    },
    select: {
      start: true,
      end: true
    }
  })

  // Generate all possible time slots
  const meetingDuration = seller.meetingDuration || 30
  const allSlots = []

  availability.forEach(({ startTime, endTime }) => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    let slotStart = new Date(targetDate)
    slotStart.setHours(startHour, startMinute, 0, 0)

    const availabilityEnd = new Date(targetDate)
    availabilityEnd.setHours(endHour, endMinute, 0, 0)

    while (slotStart < availabilityEnd) {
      const slotEnd = addMinutes(slotStart, meetingDuration)
      
      if (slotEnd <= availabilityEnd) {
        allSlots.push({
          start: new Date(slotStart),
          end: new Date(slotEnd),
          startTime: format(slotStart, 'HH:mm'),
          endTime: format(slotEnd, 'HH:mm')
        })
      }
      
      slotStart = addMinutes(slotStart, meetingDuration)
    }
  })

  // Filter out booked slots and slots in the past
  const availableSlots = allSlots.filter(slot => {
    // Check against existing appointments
    const isBooked = existingAppointments.some(apt => 
      apt.start.getTime() === slot.start.getTime()
    )

    if (isBooked) return false

    // Don't show slots in the past
    if (slot.start < new Date()) return false

    return true
  })

  return availableSlots.map(slot => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    start: slot.start.toISOString(),
    end: slot.end.toISOString()
  }))
}

function enhanceSlotsWithLockStatus(slots, sellerId, date) {
  return slots.map(slot => {
    // Check if this slot is locked in the slot cache
    const lockKey = `slot:${sellerId}:${date}:${slot.startTime}`
    const lockData = slotCache.get(lockKey)
    
    return {
      ...slot,
      isLocked: !!lockData,
      lockStatus: lockData?.status || null,
      lockedBy: lockData?.buyerId || null
    }
  })
}