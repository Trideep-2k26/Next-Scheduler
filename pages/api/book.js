/**
 * Fast Booking API Controller - FIXED VERSION
 * 
 * PERFORMANCE OPTIMIZED for Vercel:
 * 1. Save appointment to DB immediately and return success (< 2s)
 * 2. Process background tasks asynchronously:
 *    - Google Calendar events (buyer & seller)  
 *    - AI email generation with Gemini
 *    - Email sending via Gmail SMTP
 * 3. Background tasks have comprehensive error logging but don't block booking
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { parseISO, format } from 'date-fns'
import { invalidateByPattern, slotCache } from '../../lib/cache'
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
    // Using setImmediate/setTimeout to ensure response is fully sent before background tasks start
    const scheduleBackgroundTasks = () => {
      const backgroundPromise = (async () => {
        try {
          console.log(`[BACKGROUND] 🚀 Starting background processing for appointment ${appointment.id}`)
          
          // Get full appointment data with all relationships for background processing
          const fullAppointment = await prisma.appointment.findUnique({
            where: { id: appointment.id },
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

          if (!fullAppointment) {
            console.error(`[BACKGROUND] ❌ Appointment ${appointment.id} not found for background processing`)
            return
          }

          console.log(`[BACKGROUND] 📄 Processing appointment: ${fullAppointment.title}`)
          console.log(`[BACKGROUND] 👤 Seller: ${fullAppointment.seller.name} (${fullAppointment.seller.email})`)
          console.log(`[BACKGROUND] 👤 Buyer: ${fullAppointment.buyer.name} (${fullAppointment.buyer.email})`)

          let sellerEventId = null
          let buyerEventId = null
          let meetLink = null
          let tasksCompleted = 0
          const totalTasks = 4

          // TASK 1: Create seller calendar event
          if (fullAppointment.seller.refreshTokenEncrypted) {
            try {
              console.log(`[BACKGROUND] 📅 Creating seller calendar event...`)
              
              const refreshToken = decryptToken(fullAppointment.seller.refreshTokenEncrypted)
              if (refreshToken) {
                const sellerClient = getClientWithRefresh(refreshToken)
                
                const sellerEventResource = {
                  summary: fullAppointment.title,
                  start: {
                    dateTime: fullAppointment.start.toISOString(),
                    timeZone: fullAppointment.timezone || 'UTC'
                  },
                  end: {
                    dateTime: fullAppointment.end.toISOString(),
                    timeZone: fullAppointment.timezone || 'UTC'
                  },
                  attendees: [
                    { email: fullAppointment.buyer.email }
                  ],
                  conferenceData: {
                    createRequest: {
                      requestId: `meet-seller-${fullAppointment.id}-${Date.now()}`,
                      conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                      }
                    }
                  },
                  description: `Meeting with ${fullAppointment.buyer.name}\n\nBooking ID: ${fullAppointment.id}`
                }
                
                console.log(`[BACKGROUND] 🔄 Calling Google Calendar API for seller...`)
                const sellerEvent = await createEventOnCalendar(sellerClient, 'primary', sellerEventResource)
                sellerEventId = sellerEvent.id
                meetLink = sellerEvent.hangoutLink || sellerEvent.conferenceData?.entryPoints?.[0]?.uri
                tasksCompleted++
                
                console.log(`[BACKGROUND] ✅ Seller calendar event created: ${sellerEventId}`)
                if (meetLink) console.log(`[BACKGROUND] ✅ Meet link generated: ${meetLink}`)
              } else {
                console.log(`[BACKGROUND] ⚠️  Could not decrypt seller refresh token`)
              }
            } catch (error) {
              console.error(`[BACKGROUND] ❌ Seller calendar failed:`, error.message)
              console.error(`[BACKGROUND] ❌ Seller error details:`, {
                message: error.message,
                code: error.code,
                status: error.status
              })
            }
          } else {
            console.log(`[BACKGROUND] ⚠️  No seller refresh token - skipping seller calendar`)
          }

          // TASK 2: Create buyer calendar event  
          const buyerAccount = fullAppointment.buyer.accounts?.find(acc => acc.provider === 'google')
          if (buyerAccount) {
            try {
              console.log(`[BACKGROUND] 📅 Creating buyer calendar event...`)
              console.log(`[BACKGROUND] 🔑 Buyer has Google account with access_token: ${!!buyerAccount.access_token}, refresh_token: ${!!buyerAccount.refresh_token}`)
              
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
              
              const buyerEventResource = {
                summary: fullAppointment.title,
                start: {
                  dateTime: fullAppointment.start.toISOString(),
                  timeZone: fullAppointment.timezone || 'UTC'
                },
                end: {
                  dateTime: fullAppointment.end.toISOString(),
                  timeZone: fullAppointment.timezone || 'UTC'
                },
                attendees: [
                  { email: fullAppointment.seller.email }
                ],
                description: `Meeting with ${fullAppointment.seller.name}${meetLink ? `\n\nJoin meeting: ${meetLink}` : ''}\n\nBooking ID: ${fullAppointment.id}`,
                // Only create meet link if seller didn't create one
                ...((!meetLink) && {
                  conferenceData: {
                    createRequest: {
                      requestId: `meet-buyer-${fullAppointment.id}-${Date.now()}`,
                      conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                      }
                    }
                  }
                })
              }
              
              console.log(`[BACKGROUND] 🔄 Calling Google Calendar API for buyer...`)
              const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', buyerEventResource)
              buyerEventId = buyerEvent.id
              tasksCompleted++
              
              // Use buyer's meet link if seller didn't create one
              if (!meetLink) {
                meetLink = buyerEvent.hangoutLink || buyerEvent.conferenceData?.entryPoints?.[0]?.uri
                if (meetLink) console.log(`[BACKGROUND] ✅ Meet link from buyer: ${meetLink}`)
              }
              
              console.log(`[BACKGROUND] ✅ Buyer calendar event created: ${buyerEventId}`)
              
            } catch (error) {
              console.error(`[BACKGROUND] ❌ Buyer calendar failed:`, error.message)
              console.error(`[BACKGROUND] ❌ Buyer error details:`, {
                message: error.message,
                code: error.code,
                status: error.status
              })
              
              // Try fallback with refresh token only if access token failed
              if (error.code === 401 && buyerAccount.refresh_token) {
                try {
                  console.log(`[BACKGROUND] 🔄 Retrying buyer calendar with refresh token...`)
                  
                  const buyerClient = getClientWithRefresh(buyerAccount.refresh_token)
                  
                  const buyerEventResource = {
                    summary: fullAppointment.title,
                    start: {
                      dateTime: fullAppointment.start.toISOString(),
                      timeZone: fullAppointment.timezone || 'UTC'
                    },
                    end: {
                      dateTime: fullAppointment.end.toISOString(),
                      timeZone: fullAppointment.timezone || 'UTC'
                    },
                    attendees: [
                      { email: fullAppointment.seller.email }
                    ],
                    description: `Meeting with ${fullAppointment.seller.name}${meetLink ? `\n\nJoin meeting: ${meetLink}` : ''}\n\nBooking ID: ${fullAppointment.id}`
                  }
                  
                  const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', buyerEventResource)
                  buyerEventId = buyerEvent.id
                  tasksCompleted++
                  
                  console.log(`[BACKGROUND] ✅ Buyer calendar event created with refresh token: ${buyerEventId}`)
                  
                } catch (retryError) {
                  console.error(`[BACKGROUND] ❌ Buyer calendar retry also failed:`, retryError.message)
                }
              }
            }
          } else {
            console.log(`[BACKGROUND] ⚠️  No buyer Google account found - skipping buyer calendar`)
          }

          // TASK 3: Update appointment with calendar data
          if (sellerEventId || buyerEventId || meetLink) {
            try {
              console.log(`[BACKGROUND] 💾 Updating appointment with calendar data...`)
              await prisma.appointment.update({
                where: { id: fullAppointment.id },
                data: {
                  ...(sellerEventId && { googleEventId: sellerEventId }),
                  ...(buyerEventId && { buyerGoogleEventId: buyerEventId }),
                  ...(meetLink && { meetLink })
                }
              })
              tasksCompleted++
              console.log(`[BACKGROUND] ✅ Appointment updated with calendar data`)
            } catch (error) {
              console.error(`[BACKGROUND] ❌ Failed to update appointment:`, error.message)
            }
          }

          // TASK 4: Generate and send confirmation email
          try {
            console.log(`[BACKGROUND] 📧 Generating and sending confirmation email...`)
            
            // Prepare appointment data for email generation
            const appointmentData = {
              sellerName: fullAppointment.seller.name,
              buyerName: fullAppointment.buyer.name,
              startTime: fullAppointment.start,
              timezone: fullAppointment.timezone,
              serviceType: fullAppointment.seller.serviceType,
              meetLink: meetLink,
              title: fullAppointment.title
            }
            
            console.log(`[BACKGROUND] 🤖 Calling AI email generation...`)
            validateAppointmentData(appointmentData)
            const emailContent = await generateConfirmationEmail(appointmentData)
            
            console.log(`[BACKGROUND] 📤 Sending email to ${fullAppointment.buyer.email}...`)
            const emailResult = await sendConfirmationEmail(
              fullAppointment.buyer.email,
              emailContent.subject,
              emailContent.body
            )
            
            if (emailResult.success) {
              console.log(`[BACKGROUND] ✅ Confirmation email sent successfully to ${fullAppointment.buyer.email}`)
              console.log(`[BACKGROUND] ✅ Email message ID: ${emailResult.messageId}`)
              tasksCompleted++
              
              // Save email content to database for audit trail
              await prisma.appointment.update({
                where: { id: fullAppointment.id },
                data: { confirmationEmail: JSON.stringify(emailContent) }
              })
              console.log(`[BACKGROUND] ✅ Email content saved to database`)
            } else {
              throw new Error(`Email sending failed: ${emailResult.error}`)
            }
            
          } catch (error) {
            console.error(`[BACKGROUND] ❌ Email processing failed:`, error.message)
            console.error(`[BACKGROUND] ❌ Email error details:`, {
              message: error.message,
              stack: error.stack
            })
          }

          // FINAL: Log completion status
          const successRate = (tasksCompleted / totalTasks * 100).toFixed(1)
          console.log(`[BACKGROUND] 📊 Background processing completed: ${tasksCompleted}/${totalTasks} tasks (${successRate}%)`)
          
          if (tasksCompleted === totalTasks) {
            console.log(`[BACKGROUND] 🎉 All background tasks completed successfully for appointment ${fullAppointment.id}`)
          } else if (tasksCompleted >= 2) {
            console.log(`[BACKGROUND] 😊 Most background tasks completed for appointment ${fullAppointment.id}`)
          } else {
            console.log(`[BACKGROUND] 😟 Background processing had issues for appointment ${fullAppointment.id}`)
          }
          
        } catch (error) {
          console.error(`[BACKGROUND] 💥 Critical error in background processing for appointment ${appointment.id}:`, error)
          console.error(`[BACKGROUND] 💥 Error stack:`, error.stack)
        }
      })()
      
      // Don't await - let it run in background
      backgroundPromise.catch(error => {
        console.error(`[BACKGROUND] � Unhandled error in background processing:`, error)
      })
    }
    
    // Try setImmediate first, fallback to setTimeout for Vercel compatibility  
    if (typeof setImmediate !== 'undefined') {
      setImmediate(scheduleBackgroundTasks)
    } else {
      setTimeout(scheduleBackgroundTasks, 0)
    }

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

