/**
 * Booking API Controller
 * Handles appointment booking functionality including:
 * - Creating appointments in database
 * - Creating calendar events for both buyer and seller
 * - Sending confirmation emails
 * - Cache invalidation
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { getClientWithRefresh, createEventOnCalendar, createOAuth2Client } from '../../lib/google'
import { decryptToken } from '../../lib/encryption'
import { parseISO, format } from 'date-fns'
import { generateConfirmationEmail, validateAppointmentData } from '../../lib/emailAI'
import { sendConfirmationEmail } from '../../lib/emailService'
import { invalidateByPattern, slotCache } from '../../lib/cache'

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

  try {
    // Get seller info
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        refreshTokenEncrypted: true
      }
    })

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' })
    }

    // Get buyer info
    const buyer = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    })

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' })
    }

    const startTime = parseISO(start)
    const endTime = parseISO(end)

    // Check for existing appointment at this time (prevent double booking)
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        sellerId,
        start: startTime
      }
    })

    if (existingAppointment) {
      return res.status(409).json({ 
        message: 'Time slot no longer available',
        suggestions: [] // Could implement suggestion logic here
      })
    }

    let sellerEventId = null
    let buyerEventId = null
    let meetLink = null

    // Create event on seller's calendar
    if (seller.refreshTokenEncrypted) {
      try {
        console.log('Creating seller calendar event...')
        const refreshToken = decryptToken(seller.refreshTokenEncrypted)
        if (refreshToken) {
          const sellerClient = getClientWithRefresh(refreshToken)
          
          const eventResource = {
            summary: title,
            start: {
              dateTime: start,
              timeZone: timezone || 'UTC'
            },
            end: {
              dateTime: end,
              timeZone: timezone || 'UTC'
            },
            attendees: [
              { email: buyer.email }
            ],
            conferenceData: {
              createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: {
                  type: 'hangoutsMeet'
                }
              }
            },
            description: `Meeting with ${buyer.name}`
          }
          
          const sellerEvent = await createEventOnCalendar(
            sellerClient, 
            'primary', 
            eventResource
          )
          
          sellerEventId = sellerEvent.id
          meetLink = sellerEvent.hangoutLink || sellerEvent.conferenceData?.entryPoints?.[0]?.uri
          console.log(`Successfully created seller calendar event: ${sellerEventId}`)
          console.log(`Generated Meet link: ${meetLink}`)
        }
      } catch (error) {
        console.error('Error creating seller event:', error)
        console.warn('IMPORTANT: Seller calendar event could not be created. Appointment will still be saved.')
      }
    } else {
      console.warn('IMPORTANT: No refresh token found for seller. Seller calendar event cannot be created.')
    }

    // Create event on buyer's calendar
    const buyerAccount = buyer.accounts.find(acc => acc.provider === 'google')
    if (buyerAccount) {
      try {
        console.log('Creating buyer calendar event...')
        const buyerClient = createOAuth2Client()
        
        // Set credentials with both access_token and refresh_token if available
        const credentials = {}
        if (buyerAccount.access_token) {
          credentials.access_token = buyerAccount.access_token
        }
        if (buyerAccount.refresh_token) {
          credentials.refresh_token = buyerAccount.refresh_token
        }
        
        buyerClient.setCredentials(credentials)
        
        const eventResource = {
          summary: title,
          start: {
            dateTime: start,
            timeZone: timezone || 'UTC'
          },
          end: {
            dateTime: end,
            timeZone: timezone || 'UTC'
          },
          attendees: [
            { email: seller.email }
          ],
          description: `Meeting with ${seller.name}${meetLink ? `\n\nJoin meeting: ${meetLink}` : ''}`,
          conferenceData: meetLink ? undefined : {
            createRequest: {
              requestId: `meet-buyer-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        }
        
        // If seller created a meet link, use it; otherwise create one for buyer
        if (!meetLink) {
          eventResource.conferenceData = {
            createRequest: {
              requestId: `meet-buyer-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        }
        
        const buyerEvent = await createEventOnCalendar(
          buyerClient, 
          'primary', 
          eventResource
        )
        
        buyerEventId = buyerEvent.id
        console.log(`Successfully created buyer calendar event: ${buyerEventId}`)
        
        // If buyer's event generated a meet link and seller didn't have one, use buyer's
        if (!meetLink && (buyerEvent.hangoutLink || buyerEvent.conferenceData?.entryPoints?.[0]?.uri)) {
          meetLink = buyerEvent.hangoutLink || buyerEvent.conferenceData?.entryPoints?.[0]?.uri
        }
      } catch (error) {
        console.error('Error creating buyer event:', error)
        
        // If access token expired, try with refresh token only
        if (error.code === 401 && buyerAccount.refresh_token) {
          try {
            console.log('Access token expired, trying with refresh token for buyer calendar...')
            const buyerClient = getClientWithRefresh(buyerAccount.refresh_token)
            
            const eventResource = {
              summary: title,
              start: {
                dateTime: start,
                timeZone: timezone || 'UTC'
              },
              end: {
                dateTime: end,
                timeZone: timezone || 'UTC'
              },
              attendees: [
                { email: seller.email }
              ],
              description: `Meeting with ${seller.name}${meetLink ? `\n\nJoin meeting: ${meetLink}` : ''}`
            }
            
            const buyerEvent = await createEventOnCalendar(
              buyerClient, 
              'primary', 
              eventResource
            )
            
            buyerEventId = buyerEvent.id
            console.log(`Successfully created buyer calendar event with refresh token: ${buyerEventId}`)
          } catch (refreshError) {
            console.error('Error creating buyer event with refresh token:', refreshError)
            // Continue without buyer calendar event but log the issue
            console.warn('IMPORTANT: Buyer calendar event could not be created. Appointment will still be saved.')
          }
        } else {
          // Continue without buyer calendar event but log the issue
          console.warn('IMPORTANT: Buyer calendar event could not be created. Appointment will still be saved.')
        }
      }
    } else {
      console.warn('IMPORTANT: No Google account found for buyer. Buyer calendar event cannot be created.')
    }

    // Get seller's meeting duration
    const sellerDuration = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { meetingDuration: true }
    })

    // Save appointment to database
    const appointment = await prisma.appointment.create({
      data: {
        title,
        sellerId,
        buyerId: session.user.id,
        start: startTime,
        end: endTime,
        duration: sellerDuration?.meetingDuration || 30,
        timezone: timezone || 'UTC',
        googleEventId: sellerEventId,
        buyerGoogleEventId: buyerEventId,
        meetLink
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

    // Invalidate related caches after successful booking
    const dateStr = format(startTime, 'yyyy-MM-dd')
    const timeStr = format(startTime, 'HH:mm')
    
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

    console.log('Appointment created successfully:')
    console.log(`- Appointment ID: ${appointment.id}`)
    console.log(`- Seller Event ID: ${sellerEventId || 'NOT CREATED'}`)
    console.log(`- Buyer Event ID: ${buyerEventId || 'NOT CREATED'}`)
    console.log(`- Meet Link: ${meetLink || 'NOT GENERATED'}`)
    console.log(`- Caches invalidated for seller: ${sellerId}, buyer: ${session.user.id}`)

    // Generate and send confirmation email
    let emailResult = null
    let confirmationEmailContent = null
    
    try {
      console.log('Generating confirmation email...')
      
      // Prepare appointment data for email generation
      const appointmentData = {
        sellerName: appointment.seller.name,
        buyerName: appointment.buyer.name,
        startTime: appointment.start,
        timezone: appointment.timezone,
        serviceType: appointment.seller.serviceType,
        meetLink: appointment.meetLink,
        title: appointment.title
      }
      
      // Validate appointment data
      validateAppointmentData(appointmentData)
      
      // Generate template confirmation email
      const emailContent = await generateConfirmationEmail(appointmentData)
      confirmationEmailContent = JSON.stringify(emailContent)
      
      console.log('Confirmation email generated successfully')
      console.log(`- Subject: ${emailContent.subject}`)
      
      // Send the confirmation email
      emailResult = await sendConfirmationEmail(
        appointment.buyer.email,
        emailContent.subject,
        emailContent.body
      )
      
      if (emailResult.success) {
        console.log('Confirmation email sent successfully:', {
          messageId: emailResult.messageId,
          to: emailResult.to,
          subject: emailResult.subject
        })
      }
      
    } catch (emailError) {
      console.error('Error in email generation/sending process:', emailError)
      // Don't fail the booking if email fails - just log it
    }
    
    // Update appointment with confirmation email content for audit trail
    if (confirmationEmailContent) {
      try {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { confirmationEmail: confirmationEmailContent }
        })
        console.log('Confirmation email content saved to database')
      } catch (updateError) {
        console.error('Error saving confirmation email to database:', updateError)
      }
    }

    res.status(201).json({
      appointment,
      meetLink,
      calendarEvents: {
        seller: !!sellerEventId,
        buyer: !!buyerEventId
      },
      emailSent: emailResult?.success || false
    })
  } catch (error) {
    console.error('Error booking appointment:', error)
    
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(409).json({ 
        message: 'Time slot no longer available',
        suggestions: []
      })
    }
    
    res.status(500).json({ message: 'Internal server error' })
  }
}
