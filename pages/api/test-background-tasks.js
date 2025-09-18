/**
 * Background Task Test API
 * Use this to manually test background processing for existing appointments
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { getClientWithRefresh, createEventOnCalendar, createOAuth2Client } from '../../lib/google'
import { decryptToken } from '../../lib/encryption'
import { generateConfirmationEmail, validateAppointmentData } from '../../lib/emailAI'
import { sendConfirmationEmail } from '../../lib/emailService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { appointmentId } = req.body

  if (!appointmentId) {
    return res.status(400).json({ message: 'appointmentId is required' })
  }

  try {
    console.log(`[TEST] Testing background processing for appointment ${appointmentId}`)

    // Get appointment with all relationships
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        seller: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            refreshTokenEncrypted: true,
            serviceType: true
          }
        },
        buyer: {
          select: { 
            id: true, 
            name: true, 
            email: true 
          },
          include: { accounts: true }
        }
      }
    })

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    // Check if user is authorized to test this appointment
    if (appointment.buyerId !== session.user.id && appointment.sellerId !== session.user.id) {
      return res.status(403).json({ message: 'Not authorized to test this appointment' })
    }

    const results = {
      appointmentId,
      tasks: {
        sellerCalendar: { status: 'skipped', reason: null, eventId: null },
        buyerCalendar: { status: 'skipped', reason: null, eventId: null },
        meetLink: { status: 'none', value: null },
        email: { status: 'skipped', reason: null, sent: false }
      }
    }

    let meetLink = null

    // Test seller calendar creation
    if (appointment.seller.refreshTokenEncrypted) {
      try {
        console.log(`[TEST] Testing seller calendar creation...`)
        
        const refreshToken = decryptToken(appointment.seller.refreshTokenEncrypted)
        if (refreshToken) {
          const sellerClient = getClientWithRefresh(refreshToken)
          
          const eventResource = {
            summary: `[TEST] ${appointment.title}`,
            start: {
              dateTime: appointment.start.toISOString(),
              timeZone: appointment.timezone
            },
            end: {
              dateTime: appointment.end.toISOString(),
              timeZone: appointment.timezone
            },
            attendees: [
              { email: appointment.buyer.email }
            ],
            conferenceData: {
              createRequest: {
                requestId: `test-seller-${appointmentId}-${Date.now()}`,
                conferenceSolutionKey: {
                  type: 'hangoutsMeet'
                }
              }
            },
            description: `TEST: Meeting with ${appointment.buyer.name}\n\nBooking ID: ${appointmentId}`
          }
          
          const sellerEvent = await createEventOnCalendar(sellerClient, 'primary', eventResource)
          meetLink = sellerEvent.hangoutLink || sellerEvent.conferenceData?.entryPoints?.[0]?.uri
          
          results.tasks.sellerCalendar = {
            status: 'success',
            eventId: sellerEvent.id,
            reason: null
          }
          
          if (meetLink) {
            results.tasks.meetLink = {
              status: 'generated',
              value: meetLink
            }
          }
          
          console.log(`[TEST] ✅ Seller calendar test successful: ${sellerEvent.id}`)
        }
      } catch (error) {
        console.error(`[TEST] ❌ Seller calendar test failed:`, error.message)
        results.tasks.sellerCalendar = {
          status: 'failed',
          reason: error.message,
          eventId: null
        }
      }
    } else {
      results.tasks.sellerCalendar.reason = 'No refresh token available'
    }

    // Test buyer calendar creation
    const buyerAccount = appointment.buyer.accounts?.find(acc => acc.provider === 'google')
    if (buyerAccount) {
      try {
        console.log(`[TEST] Testing buyer calendar creation...`)
        
        const buyerClient = createOAuth2Client()
        
        const credentials = {}
        if (buyerAccount.access_token) {
          credentials.access_token = buyerAccount.access_token
        }
        if (buyerAccount.refresh_token) {
          credentials.refresh_token = buyerAccount.refresh_token
        }
        
        buyerClient.setCredentials(credentials)
        
        const eventResource = {
          summary: `[TEST] ${appointment.title}`,
          start: {
            dateTime: appointment.start.toISOString(),
            timeZone: appointment.timezone
          },
          end: {
            dateTime: appointment.end.toISOString(),
            timeZone: appointment.timezone
          },
          attendees: [
            { email: appointment.seller.email }
          ],
          description: `TEST: Meeting with ${appointment.seller.name}${meetLink ? `\n\nJoin meeting: ${meetLink}` : ''}\n\nBooking ID: ${appointmentId}`
        }
        
        const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', eventResource)
        
        results.tasks.buyerCalendar = {
          status: 'success',
          eventId: buyerEvent.id,
          reason: null
        }
        
        console.log(`[TEST] ✅ Buyer calendar test successful: ${buyerEvent.id}`)
        
      } catch (error) {
        console.error(`[TEST] ❌ Buyer calendar test failed:`, error.message)
        results.tasks.buyerCalendar = {
          status: 'failed',
          reason: error.message,
          eventId: null
        }
      }
    } else {
      results.tasks.buyerCalendar.reason = 'No Google account found'
    }

    // Test email generation and sending
    try {
      console.log(`[TEST] Testing email generation and sending...`)
      
      const appointmentData = {
        sellerName: appointment.seller.name,
        buyerName: appointment.buyer.name,
        startTime: appointment.start,
        timezone: appointment.timezone,
        serviceType: appointment.seller.serviceType,
        meetLink: meetLink,
        title: appointment.title
      }
      
      validateAppointmentData(appointmentData)
      
      const emailContent = await generateConfirmationEmail(appointmentData)
      
      // Add [TEST] prefix to subject
      const testEmailContent = {
        ...emailContent,
        subject: `[TEST] ${emailContent.subject}`
      }
      
      const emailResult = await sendConfirmationEmail(
        appointment.buyer.email,
        testEmailContent.subject,
        testEmailContent.body
      )
      
      if (emailResult.success) {
        results.tasks.email = {
          status: 'success',
          sent: true,
          reason: null,
          messageId: emailResult.messageId
        }
        console.log(`[TEST] ✅ Email test successful: ${emailResult.messageId}`)
      } else {
        throw new Error(emailResult.error)
      }
      
    } catch (error) {
      console.error(`[TEST] ❌ Email test failed:`, error.message)
      results.tasks.email = {
        status: 'failed',
        sent: false,
        reason: error.message
      }
    }

    console.log(`[TEST] Background processing test completed for appointment ${appointmentId}`)

    res.status(200).json({
      success: true,
      message: 'Background processing test completed',
      results
    })

  } catch (error) {
    console.error(`[TEST] Error testing background processing:`, error)
    
    res.status(500).json({ 
      message: 'Test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}