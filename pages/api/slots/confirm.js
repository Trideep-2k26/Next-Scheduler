import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { lockId, title } = req.body

    if (!lockId) {
      return res.status(400).json({ error: 'lockId is required' })
    }

    // Find the lock and verify ownership
    const slotLock = await prisma.slotLock.findUnique({
      where: { id: lockId },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
            meetingDuration: true
          }
        }
      }
    })

    if (!slotLock) {
      return res.status(404).json({ error: 'Slot lock not found' })
    }

    if (slotLock.buyerId !== session.user.id) {
      return res.status(403).json({ error: 'Not authorized to confirm this lock' })
    }

    if (slotLock.status !== 'LOCKED') {
      return res.status(400).json({ 
        error: `Cannot confirm slot with status: ${slotLock.status}` 
      })
    }

    if (slotLock.expiresAt < new Date()) {
      // Auto-expire the lock
      await prisma.slotLock.update({
        where: { id: lockId },
        data: { status: 'CANCELLED' }
      })
      return res.status(410).json({ error: 'Slot lock has expired' })
    }

    // Create the appointment and confirm the lock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update slot lock status
      const confirmedLock = await tx.slotLock.update({
        where: { id: lockId },
        data: { status: 'CONFIRMED' }
      })

      // Create appointment
      const slotDate = new Date(slotLock.date)
      const [startHour, startMinute] = slotLock.startTime.split(':').map(Number)
      const [endHour, endMinute] = slotLock.endTime.split(':').map(Number)
      
      const appointmentStart = new Date(slotDate)
      appointmentStart.setHours(startHour, startMinute, 0, 0)
      
      const appointmentEnd = new Date(slotDate)
      appointmentEnd.setHours(endHour, endMinute, 0, 0)

      // Calculate duration
      const duration = slotLock.seller.meetingDuration || 30

      const appointment = await tx.appointment.create({
        data: {
          title: title || `Meeting with ${slotLock.seller.name}`,
          sellerId: slotLock.sellerId,
          buyerId: session.user.id,
          start: appointmentStart,
          end: appointmentEnd,
          duration,
          timezone: 'UTC' // TODO: Handle timezone properly
        },
        include: {
          seller: {
            select: {
              name: true,
              email: true
            }
          },
          buyer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return { confirmedLock, appointment }
    })

    res.status(200).json({
      success: true,
      appointment: result.appointment,
      lock: result.confirmedLock,
      message: 'Booking confirmed successfully'
    })

  } catch (error) {
    console.error('Error confirming slot:', error)
    
    // Handle unique constraint violation (appointment already exists)
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Slot is already booked by another appointment' 
      })
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}