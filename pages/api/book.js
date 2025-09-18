import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { parseISO, format } from 'date-fns'
import { invalidateByPattern, slotCache } from '../../lib/cache'
import { getClientWithRefresh, createEventOnCalendar } from '../../lib/google'
import { decryptToken } from '../../lib/encryption'
import { generateConfirmationEmail } from '../../lib/emailAI'
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

  const startTime = Date.now()
  
  try {
    console.log(`[BOOKING] Starting booking for seller ${sellerId}`)
    
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        meetingDuration: true,
        refreshTokenEncrypted: true,
        serviceType: true
      }
    })

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' })
    }

    const buyer = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        accounts: true 
      }
    })

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' })
    }

    const startDateTime = parseISO(start)
    const endDateTime = parseISO(end)

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

    const appointment = await prisma.appointment.create({
      data: {
        title,
        sellerId,
        buyerId: session.user.id,
        start: startDateTime,
        end: endDateTime,
        duration: seller.meetingDuration || 30,
        timezone: timezone || 'UTC',
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

    const dateStr = format(startDateTime, 'yyyy-MM-dd')
    const timeStr = format(startDateTime, 'HH:mm')
    
    invalidateByPattern(`availability:${sellerId}:${dateStr}`)
    invalidateByPattern(`appointments:${sellerId}:.*`)
    invalidateByPattern(`appointments:${session.user.id}:.*`)
    
    const slotKey = `slot:${sellerId}:${dateStr}:${timeStr}`
    slotCache.set(slotKey, {
      status: 'CONFIRMED',
      buyerId: session.user.id,
      appointmentId: appointment.id
    }, 86400)

    const responseTime = Date.now() - startTime
    console.log(`[BOOKING] Appointment ${appointment.id} saved in ${responseTime}ms`)

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
      processingTime: responseTime
    })

    setTimeout(async () => {
      try {
        console.log(`[BACKGROUND] Processing appointment ${appointment.id}`)
        
        let sellerEventId = null
        let buyerEventId = null
        let meetLink = null

        if (seller.refreshTokenEncrypted) {
          try {
            const refreshToken = decryptToken(seller.refreshTokenEncrypted)
            if (refreshToken) {
              const sellerClient = getClientWithRefresh(refreshToken)
              
              const sellerEvent = await createEventOnCalendar(sellerClient, 'primary', {
                summary: title,
                start: {
                  dateTime: startDateTime.toISOString(),
                  timeZone: timezone || 'UTC'
                },
                end: {
                  dateTime: endDateTime.toISOString(),
                  timeZone: timezone || 'UTC'
                },
                description: `Meeting with ${buyer.name} (${buyer.email})`,
                conferenceData: {
                  createRequest: {
                    requestId: `${appointment.id}-seller`,
                    conferenceSolutionKey: {
                      type: 'hangoutsMeet'
                    }
                  }
                },
                attendees: [
                  { email: seller.email, responseStatus: 'accepted' },
                  { email: buyer.email }
                ]
              })

              if (sellerEvent && sellerEvent.data) {
                sellerEventId = sellerEvent.data.id
                meetLink = sellerEvent.data.hangoutLink || sellerEvent.data.conferenceData?.entryPoints?.[0]?.uri
                console.log(`[BACKGROUND] Seller event created: ${sellerEventId}`)
              }
            }
          } catch (error) {
            console.error(`[BACKGROUND] Error creating seller calendar event:`, error)
          }
        }

        if (buyer.accounts && buyer.accounts.length > 0) {
          try {
            const googleAccount = buyer.accounts.find(acc => acc.provider === 'google')
            if (googleAccount && googleAccount.refresh_token) {
              const buyerClient = getClientWithRefresh(googleAccount.refresh_token)
              
              const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', {
                summary: title,
                start: {
                  dateTime: startDateTime.toISOString(),
                  timeZone: timezone || 'UTC'
                },
                end: {
                  dateTime: endDateTime.toISOString(),
                  timeZone: timezone || 'UTC'
                },
                description: `Meeting with ${seller.name}`,
                attendees: [
                  { email: buyer.email, responseStatus: 'accepted' },
                  { email: seller.email }
                ]
              })

              if (buyerEvent && buyerEvent.data) {
                buyerEventId = buyerEvent.data.id
                console.log(`[BACKGROUND] Buyer event created: ${buyerEventId}`)
              }
            }
          } catch (error) {
            console.error(`[BACKGROUND] Error creating buyer calendar event:`, error)
          }
        }

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            googleEventId: sellerEventId,
            buyerGoogleEventId: buyerEventId,
            meetLink: meetLink
          }
        })

        try {
          const emailData = {
            appointment: {
              id: appointment.id,
              title: title,
              start: startDateTime,
              end: endDateTime,
              timezone: timezone || 'UTC',
              meetLink: meetLink
            },
            seller: {
              name: seller.name,
              email: seller.email,
              serviceType: seller.serviceType
            },
            buyer: {
              name: buyer.name,
              email: buyer.email
            }
          }

          const buyerEmailContent = await generateConfirmationEmail(emailData, 'buyer')
          const sellerEmailContent = await generateConfirmationEmail(emailData, 'seller')

          await Promise.all([
            sendConfirmationEmail(
              buyer.email,
              buyerEmailContent.subject,
              buyerEmailContent.html
            ),
            sendConfirmationEmail(
              seller.email,
              sellerEmailContent.subject,
              sellerEmailContent.html
            )
          ])

          console.log(`[BACKGROUND] Confirmation emails sent for appointment ${appointment.id}`)
        } catch (error) {
          console.error(`[BACKGROUND] Error sending emails for appointment ${appointment.id}:`, error)
        }

        console.log(`[BACKGROUND] Processing complete for appointment ${appointment.id}`)
      } catch (error) {
        console.error(`[BACKGROUND] Error processing appointment ${appointment.id}:`, error)
      }
    }, 100)

  } catch (error) {
    console.error('Booking error:', error)
    
    const responseTime = Date.now() - startTime
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Time slot no longer available',
        processingTime: responseTime
      })
    }
    
    return res.status(500).json({
      message: 'Failed to create appointment',
      processingTime: responseTime
    })
  }
}