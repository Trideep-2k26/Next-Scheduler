/**
 * Fast Booking API Controller
 * 
 * PERFORMANCE OPTIMIZED for Vercel:
 * 1. Save appointment to DB immediately and return success (< 2s)
 * 2. Process background tasks asynchronously:
 *    - Google Calendar events (buyer & seller)  
 *    - AI email generation with Gemini
 *    - Email sending via Gmail/SendGrid
 * 3. Background tasks have comprehensive error logging but don't block booking
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { parseISO, format } from 'date-fns'
import { invalidateByPattern, slotCache } from '../../lib/cache'
import { processAppointmentBackgroundTasks } from '../../lib/backgroundTasks'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { sellerId, start, end, timezone, title } = req.body

  if (!sellerId || !start || !end || !title) {
    return res.status(400).json({ message: 'Missing required fields' })
  }

  const startTime = Date.now() // Track response time
  
  try {
    console.log(`[BOOKING] Starting fast booking flow for seller ${sellerId}`)
    
    // Fast validation: Get seller info (minimal fields needed for booking)
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        meetingDuration: true
      }
    })

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' })
    }

    // Fast validation: Get buyer info (minimal fields needed for booking)
    const buyer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' })
    }

    const startDateTime = parseISO(start)
    const endDateTime = parseISO(end)

    // Fast check: Prevent double booking (critical for data integrity)
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        sellerId,
        start: startDateTime
      }
    })

    if (existingAppointment) {
      return res.status(409).json({ 
        message: 'Time slot no longer available',
        suggestions: []
      })
    }

    // CRITICAL: Save appointment to database IMMEDIATELY (fast operation < 500ms)
    const appointment = await prisma.appointment.create({
      data: {
        title,
        sellerId,
        buyerId: session.user.id,
        start: startDateTime,
        end: endDateTime,
        duration: seller.meetingDuration || 30,
        timezone: timezone || 'UTC',
        // Calendar events and meet link will be added by background tasks
        googleEventId: null,
        buyerGoogleEventId: null,
        meetLink: null
      },
      include: {
        seller: {
          select: { name: true, email: true, serviceType: true }
        },
        buyer: {
          select: { name: true, email: true }
        }
      }
    })

    // Fast cache operations (< 100ms total)
    const dateStr = format(startDateTime, 'yyyy-MM-dd')
    const timeStr = format(startDateTime, 'HH:mm')
    
    // Clear availability cache for this seller and date
    invalidateByPattern(`availability:${sellerId}:${dateStr}`)
    
    // Clear appointment cache for both seller and buyer
    invalidateByPattern(`appointments:${sellerId}:.*`)
    invalidateByPattern(`appointments:${session.user.id}:.*`)
    
    // Update slot lock to confirmed status
    const slotKey = `slot:${sellerId}:${dateStr}:${timeStr}`
    slotCache.set(slotKey, {
      status: 'CONFIRMED',
      buyerId: session.user.id,
      appointmentId: appointment.id
    }, 86400) // Keep confirmed status for 24 hours

    const responseTime = Date.now() - startTime
    console.log(`[BOOKING] Appointment ${appointment.id} saved successfully in ${responseTime}ms`)

    // CRITICAL: Return success response immediately (before background tasks)
    // This ensures users get confirmation in < 2 seconds
    res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        title: appointment.title,
        start: appointment.start,
        end: appointment.end,
        seller: appointment.seller,
        buyer: appointment.buyer
      },
      message: 'Booking confirmed! Calendar invites and confirmation email will be sent shortly.',
      processingTime: responseTime,
      backgroundTasks: {
        status: 'queued',
        tasks: ['calendar_events', 'email_notification']
      }
    })

    // BACKGROUND PROCESSING: Start slow tasks asynchronously after response is sent
    // Using setImmediate to ensure response is fully sent before background tasks start
    setImmediate(async () => {
      try {
        console.log(`[BOOKING] Starting background processing for appointment ${appointment.id}`)
        const result = await processAppointmentBackgroundTasks(appointment.id)
        console.log(`[BOOKING] Background processing completed for appointment ${appointment.id}:`, result.status)
      } catch (error) {
        // Log errors but don't affect the booking confirmation (already sent to user)
        console.error(`[BOOKING] Background processing failed for appointment ${appointment.id}:`, error)
        
        // In production, you might want to:
        // 1. Queue for retry with exponential backoff
        // 2. Send alert to operations team
        // 3. Create database record for manual follow-up
        
        // For now, we just log and continue - booking is still valid
      }
    })

  } catch (error) {
    console.error('[BOOKING] Error during fast booking:', error)
    
    if (error.code === 'P2002') {
      // Unique constraint violation (race condition in double booking check)
      return res.status(409).json({ 
        message: 'Time slot no longer available',
        suggestions: []
      })
    }
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

