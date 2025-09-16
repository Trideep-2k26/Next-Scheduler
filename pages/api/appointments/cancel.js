import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { getClientWithRefresh, deleteEventFromCalendar, createOAuth2Client } from '../../../lib/google'
import { decryptToken } from '../../../lib/encryption'
import { invalidateByPattern, slotCache } from '../../../lib/cache'
import { format } from 'date-fns'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { appointmentId } = req.body

  if (!appointmentId) {
    return res.status(400).json({ message: 'Appointment ID is required' })
  }

  try {
    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        seller: true,
        buyer: true
      }
    })

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    console.log(`Cancelling appointment: ${appointmentId}`)
    console.log(`Seller Event ID: ${appointment.googleEventId}`)
    console.log(`Buyer Event ID: ${appointment.buyerGoogleEventId}`)
    console.log(`Buyer ID: ${appointment.buyerId}, Session User ID: ${session.user.id}`)

    // Only buyers can cancel appointments
    if (session.user.role !== 'buyer' || appointment.buyerId !== session.user.id) {
      return res.status(403).json({ message: 'Only buyers can cancel their appointments' })
    }

    // Check if appointment is in the future
    if (new Date(appointment.start) <= new Date()) {
      return res.status(400).json({ message: 'Cannot cancel past appointments' })
    }

    let sellerEventDeleted = false
    let buyerEventDeleted = false

    console.log('Starting calendar event deletion process...')
    console.log(`- Seller calendar event to delete: ${appointment.googleEventId || 'NONE'}`)
    console.log(`- Buyer calendar event to delete: ${appointment.buyerGoogleEventId || 'NONE'}`)

    // Delete event from seller's calendar
    if (appointment.seller.refreshTokenEncrypted && appointment.googleEventId) {
      try {
        console.log('Deleting seller calendar event...')
        const refreshToken = decryptToken(appointment.seller.refreshTokenEncrypted)
        if (refreshToken) {
          const sellerClient = getClientWithRefresh(refreshToken)
          await deleteEventFromCalendar(sellerClient, 'primary', appointment.googleEventId)
          sellerEventDeleted = true
          console.log(`✅ Successfully deleted seller calendar event: ${appointment.googleEventId}`)
        }
      } catch (error) {
        console.error('❌ Error deleting seller calendar event:', error)
      }
    } else {
      console.log('⚠️  Skipping seller calendar deletion (no refresh token or event ID)')
    }

    // Delete event from buyer's calendar
    if (appointment.buyerGoogleEventId) {
      console.log('Deleting buyer calendar event...')
      const buyerAccount = await prisma.account.findFirst({
        where: {
          userId: appointment.buyerId,
          provider: 'google'
        }
      })

      if (buyerAccount) {
        try {
          const buyerClient = createOAuth2Client()
          
          // Set credentials with both access_token and refresh_token
          const credentials = {
            access_token: buyerAccount.access_token
          }
          
          if (buyerAccount.refresh_token) {
            credentials.refresh_token = buyerAccount.refresh_token
          }
          
          buyerClient.setCredentials(credentials)
          
          await deleteEventFromCalendar(buyerClient, 'primary', appointment.buyerGoogleEventId)
          buyerEventDeleted = true
          console.log(`✅ Successfully deleted buyer calendar event: ${appointment.buyerGoogleEventId}`)
        } catch (error) {
          console.error('❌ Error deleting buyer calendar event:', error)
          
          // If access token expired, try with refresh token only
          if (error.code === 401 && buyerAccount.refresh_token) {
            try {
              console.log('🔄 Access token expired, trying with refresh token...')
              const buyerClient = getClientWithRefresh(buyerAccount.refresh_token)
              await deleteEventFromCalendar(buyerClient, 'primary', appointment.buyerGoogleEventId)
              buyerEventDeleted = true
              console.log(`✅ Successfully deleted buyer calendar event with refresh token: ${appointment.buyerGoogleEventId}`)
            } catch (refreshError) {
              console.error('❌ Error deleting buyer calendar event with refresh token:', refreshError)
            }
          }
        }
      } else {
        console.log('⚠️  No Google account found for buyer - cannot delete calendar event')
      }
    } else {
      console.log('⚠️  Skipping buyer calendar deletion (no event ID)')
    }

    // Delete appointment from database
    await prisma.appointment.delete({
      where: { id: appointmentId }
    })

    // Invalidate related caches after successful cancellation
    const dateStr = format(appointment.start, 'yyyy-MM-dd')
    const timeStr = format(appointment.start, 'HH:mm')
    
    // Clear availability cache for this seller and date
    invalidateByPattern(`availability:${appointment.sellerId}:${dateStr}`)
    
    // Clear appointment cache for both seller and buyer
    invalidateByPattern(`appointments:${appointment.sellerId}:.*`)
    invalidateByPattern(`appointments:${appointment.buyerId}:.*`)
    
    // Remove slot lock if it exists
    const slotKey = `slot:${appointment.sellerId}:${dateStr}:${timeStr}`
    slotCache.del(slotKey)

    console.log('📋 Summary:')
    console.log(`- Seller calendar event deleted: ${sellerEventDeleted ? '✅ YES' : '❌ NO'}`)
    console.log(`- Buyer calendar event deleted: ${buyerEventDeleted ? '✅ YES' : '❌ NO'}`)
    console.log(`- Database appointment deleted: ✅ YES`)
    console.log(`- Caches invalidated for seller: ${appointment.sellerId}, buyer: ${appointment.buyerId}`)

    res.status(200).json({ 
      message: 'Appointment cancelled successfully',
      calendarEventsDeleted: {
        seller: sellerEventDeleted,
        buyer: buyerEventDeleted
      }
    })

  } catch (error) {
    console.error('Error cancelling appointment:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
