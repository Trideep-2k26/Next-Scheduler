import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { slotCache } from '../../../lib/cache'
import { addMinutes } from 'date-fns'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { sellerId, date, startTime, endTime } = req.body

    // Validate required fields
    if (!sellerId || !date || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: sellerId, date, startTime, endTime' 
      })
    }

    // Check if seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId, role: 'SELLER' }
    })

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' })
    }

    // Create cache key for this slot
    const slotKey = `slot:${sellerId}:${date}:${startTime}`

    // Check if slot is already locked in cache
    const existingLock = slotCache.get(slotKey)
    if (existingLock) {
      return res.status(409).json({ 
        error: 'Slot is already locked or booked',
        status: existingLock.status,
        lockedBy: existingLock.buyerId,
        lockedUntil: new Date(Date.now() + slotCache.getTtl(slotKey) * 1000).toISOString()
      })
    }

    // Check if there's an existing appointment in database
    const slotDate = new Date(date)
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const slotStart = new Date(slotDate)
    slotStart.setHours(startHour, startMinute, 0, 0)
    
    const slotEnd = new Date(slotDate)
    slotEnd.setHours(endHour, endMinute, 0, 0)

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        sellerId,
        start: slotStart,
        end: slotEnd
      }
    })

    if (existingAppointment) {
      return res.status(409).json({ error: 'Slot is already booked' })
    }

    // Create the slot lock in cache
    const lockDurationMinutes = parseInt(process.env.SLOT_LOCK_DURATION_MINUTES || '5')
    const lockTTL = lockDurationMinutes * 60 // Convert to seconds for NodeCache
    
    const lockData = {
      status: 'LOCKED',
      buyerId: session.user.id,
      sellerId,
      date,
      startTime,
      endTime,
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString()
    }

    // Store the lock in cache with TTL auto-expiry
    slotCache.set(slotKey, lockData, lockTTL)

    console.log(`Slot locked: ${slotKey} for buyer ${session.user.id} for ${lockDurationMinutes} minutes`)

    res.status(201).json({
      success: true,
      lock: {
        id: slotKey,
        sellerId,
        buyerId: session.user.id,
        date,
        startTime,
        endTime,
        status: 'LOCKED',
        expiresAt: lockData.expiresAt,
        seller: {
          name: seller.name,
          email: seller.email
        }
      },
      expiresIn: lockDurationMinutes * 60 * 1000, // milliseconds
      message: `Slot locked until ${lockData.expiresAt}`
    })

  } catch (error) {
    console.error('Error locking slot:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}