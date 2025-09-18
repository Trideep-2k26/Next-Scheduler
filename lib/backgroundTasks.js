/**
 * Background Task Processing System
 * 
 * Handles heavy operations that don't need to block API responses:
 * - Google Calendar event creation
 * - AI email generation
 * - Email sending via SendGrid/Gmail
 * 
 * Features:
 * - Comprehensive error logging
 * - Fallback mechanisms
 * - Database status tracking
 */

import prisma from './prisma'
import { getClientWithRefresh, createEventOnCalendar, createOAuth2Client } from './google'
import { decryptToken } from './encryption'
import { generateConfirmationEmail, validateAppointmentData } from './emailAI'
import { sendConfirmationEmail } from './emailService'

/**
 * Background task status tracking
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL_SUCCESS: 'partial_success'
}

/**
 * Log background task progress and errors
 */
function logTaskProgress(appointmentId, taskName, status, details = {}) {
  const timestamp = new Date().toISOString()
  const logLevel = status === TASK_STATUS.FAILED ? 'ERROR' : 'INFO'
  
  console.log(`[${logLevel}] [BACKGROUND-${appointmentId}] ${taskName}: ${status}`, details)
  
  // In production, you might want to save these logs to a database or external service
  // Example: await saveTaskLog({ appointmentId, taskName, status, details, timestamp })
}

/**
 * Main background task processor
 */
export async function processAppointmentBackgroundTasks(appointmentId) {
  let overallStatus = TASK_STATUS.IN_PROGRESS
  const taskResults = {
    calendarEvents: { status: TASK_STATUS.PENDING, sellerEventId: null, buyerEventId: null, meetLink: null },
    emailNotification: { status: TASK_STATUS.PENDING, emailSent: false, error: null }
  }

  try {
    logTaskProgress(appointmentId, 'BACKGROUND_PROCESSING', TASK_STATUS.IN_PROGRESS, { message: 'Starting all tasks' })

    // Get appointment with all needed data
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
      throw new Error(`Appointment ${appointmentId} not found`)
    }

    // Task 1: Process Google Calendar Events
    await processCalendarEvents(appointment, taskResults.calendarEvents)

    // Task 2: Update appointment with calendar data (if any was created)
    if (taskResults.calendarEvents.sellerEventId || taskResults.calendarEvents.buyerEventId || taskResults.calendarEvents.meetLink) {
      await updateAppointmentWithCalendarData(appointmentId, taskResults.calendarEvents)
    }

    // Task 3: Process Email Notification
    await processEmailNotification(appointment, taskResults.calendarEvents.meetLink, taskResults.emailNotification)

    // Determine overall status
    const calendarSuccess = taskResults.calendarEvents.status === TASK_STATUS.COMPLETED || taskResults.calendarEvents.status === TASK_STATUS.PARTIAL_SUCCESS
    const emailSuccess = taskResults.emailNotification.status === TASK_STATUS.COMPLETED

    if (calendarSuccess && emailSuccess) {
      overallStatus = TASK_STATUS.COMPLETED
    } else if (calendarSuccess || emailSuccess) {
      overallStatus = TASK_STATUS.PARTIAL_SUCCESS
    } else {
      overallStatus = TASK_STATUS.FAILED
    }

    logTaskProgress(appointmentId, 'BACKGROUND_PROCESSING', overallStatus, {
      calendarEvents: taskResults.calendarEvents,
      emailNotification: taskResults.emailNotification
    })

    return { status: overallStatus, results: taskResults }

  } catch (error) {
    logTaskProgress(appointmentId, 'BACKGROUND_PROCESSING', TASK_STATUS.FAILED, { error: error.message, stack: error.stack })
    return { status: TASK_STATUS.FAILED, error: error.message, results: taskResults }
  }
}

/**
 * Process calendar event creation for both seller and buyer
 */
async function processCalendarEvents(appointment, results) {
  results.status = TASK_STATUS.IN_PROGRESS
  let sellerSuccess = false
  let buyerSuccess = false

  // Create seller calendar event
  try {
    logTaskProgress(appointment.id, 'SELLER_CALENDAR', TASK_STATUS.IN_PROGRESS)
    
    if (!appointment.seller.refreshTokenEncrypted) {
      throw new Error('No refresh token available for seller')
    }

    const refreshToken = decryptToken(appointment.seller.refreshTokenEncrypted)
    if (!refreshToken) {
      throw new Error('Unable to decrypt seller refresh token')
    }

    const sellerClient = getClientWithRefresh(refreshToken)
    
    const eventResource = {
      summary: appointment.title,
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
          requestId: `meet-seller-${appointment.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      description: `Meeting with ${appointment.buyer.name}\n\nBooking ID: ${appointment.id}`
    }
    
    const sellerEvent = await createEventOnCalendar(sellerClient, 'primary', eventResource)
    
    results.sellerEventId = sellerEvent.id
    results.meetLink = sellerEvent.hangoutLink || sellerEvent.conferenceData?.entryPoints?.[0]?.uri
    sellerSuccess = true
    
    logTaskProgress(appointment.id, 'SELLER_CALENDAR', TASK_STATUS.COMPLETED, { 
      eventId: sellerEvent.id, 
      meetLink: results.meetLink 
    })

  } catch (error) {
    logTaskProgress(appointment.id, 'SELLER_CALENDAR', TASK_STATUS.FAILED, { error: error.message })
  }

  // Create buyer calendar event
  try {
    logTaskProgress(appointment.id, 'BUYER_CALENDAR', TASK_STATUS.IN_PROGRESS)

    const buyerAccount = appointment.buyer.accounts.find(acc => acc.provider === 'google')
    if (!buyerAccount) {
      throw new Error('No Google account found for buyer')
    }

    const buyerClient = createOAuth2Client()
    
    // Set credentials
    const credentials = {}
    if (buyerAccount.access_token) {
      credentials.access_token = buyerAccount.access_token
    }
    if (buyerAccount.refresh_token) {
      credentials.refresh_token = buyerAccount.refresh_token
    }
    
    if (!credentials.access_token && !credentials.refresh_token) {
      throw new Error('No valid credentials available for buyer')
    }
    
    buyerClient.setCredentials(credentials)
    
    const eventResource = {
      summary: appointment.title,
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
      description: `Meeting with ${appointment.seller.name}${results.meetLink ? `\n\nJoin meeting: ${results.meetLink}` : ''}\n\nBooking ID: ${appointment.id}`,
      // Only create meet link if seller didn't create one
      ...((!results.meetLink) && {
        conferenceData: {
          createRequest: {
            requestId: `meet-buyer-${appointment.id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      })
    }
    
    const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', eventResource)
    
    results.buyerEventId = buyerEvent.id
    
    // Use buyer's meet link if seller didn't create one
    if (!results.meetLink) {
      results.meetLink = buyerEvent.hangoutLink || buyerEvent.conferenceData?.entryPoints?.[0]?.uri
    }
    
    buyerSuccess = true
    
    logTaskProgress(appointment.id, 'BUYER_CALENDAR', TASK_STATUS.COMPLETED, { 
      eventId: buyerEvent.id, 
      meetLink: results.meetLink 
    })

  } catch (error) {
    logTaskProgress(appointment.id, 'BUYER_CALENDAR', TASK_STATUS.FAILED, { error: error.message })
    
    // Try fallback with refresh token only if access token failed
    if (error.code === 401) {
      try {
        logTaskProgress(appointment.id, 'BUYER_CALENDAR_RETRY', TASK_STATUS.IN_PROGRESS)
        
        const buyerAccount = appointment.buyer.accounts.find(acc => acc.provider === 'google')
        if (buyerAccount?.refresh_token) {
          const buyerClient = getClientWithRefresh(buyerAccount.refresh_token)
          
          const eventResource = {
            summary: appointment.title,
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
            description: `Meeting with ${appointment.seller.name}${results.meetLink ? `\n\nJoin meeting: ${results.meetLink}` : ''}\n\nBooking ID: ${appointment.id}`
          }
          
          const buyerEvent = await createEventOnCalendar(buyerClient, 'primary', eventResource)
          results.buyerEventId = buyerEvent.id
          buyerSuccess = true
          
          logTaskProgress(appointment.id, 'BUYER_CALENDAR_RETRY', TASK_STATUS.COMPLETED, { eventId: buyerEvent.id })
        }
      } catch (retryError) {
        logTaskProgress(appointment.id, 'BUYER_CALENDAR_RETRY', TASK_STATUS.FAILED, { error: retryError.message })
      }
    }
  }

  // Set overall calendar task status
  if (sellerSuccess && buyerSuccess) {
    results.status = TASK_STATUS.COMPLETED
  } else if (sellerSuccess || buyerSuccess) {
    results.status = TASK_STATUS.PARTIAL_SUCCESS
  } else {
    results.status = TASK_STATUS.FAILED
  }
}

/**
 * Update appointment with calendar event data
 */
async function updateAppointmentWithCalendarData(appointmentId, calendarResults) {
  try {
    logTaskProgress(appointmentId, 'DATABASE_UPDATE', TASK_STATUS.IN_PROGRESS)
    
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(calendarResults.sellerEventId && { googleEventId: calendarResults.sellerEventId }),
        ...(calendarResults.buyerEventId && { buyerGoogleEventId: calendarResults.buyerEventId }),
        ...(calendarResults.meetLink && { meetLink: calendarResults.meetLink })
      }
    })
    
    logTaskProgress(appointmentId, 'DATABASE_UPDATE', TASK_STATUS.COMPLETED, {
      sellerEventId: calendarResults.sellerEventId,
      buyerEventId: calendarResults.buyerEventId,
      meetLink: !!calendarResults.meetLink
    })

  } catch (error) {
    logTaskProgress(appointmentId, 'DATABASE_UPDATE', TASK_STATUS.FAILED, { error: error.message })
    throw error
  }
}

/**
 * Process email notification generation and sending
 */
async function processEmailNotification(appointment, meetLink, results) {
  results.status = TASK_STATUS.IN_PROGRESS
  
  try {
    logTaskProgress(appointment.id, 'EMAIL_GENERATION', TASK_STATUS.IN_PROGRESS)
    
    // Prepare appointment data for email generation
    const appointmentData = {
      sellerName: appointment.seller.name,
      buyerName: appointment.buyer.name,
      startTime: appointment.start,
      timezone: appointment.timezone,
      serviceType: appointment.seller.serviceType,
      meetLink: meetLink,
      title: appointment.title
    }
    
    // Validate appointment data
    validateAppointmentData(appointmentData)
    
    // Generate AI confirmation email
    const emailContent = await generateConfirmationEmail(appointmentData)
    
    logTaskProgress(appointment.id, 'EMAIL_GENERATION', TASK_STATUS.COMPLETED, { 
      subject: emailContent.subject,
      bodyLength: emailContent.body.length 
    })
    
    // Send the confirmation email
    logTaskProgress(appointment.id, 'EMAIL_SENDING', TASK_STATUS.IN_PROGRESS)
    
    const emailResult = await sendConfirmationEmail(
      appointment.buyer.email,
      emailContent.subject,
      emailContent.body
    )
    
    if (!emailResult.success) {
      throw new Error(`Email sending failed: ${emailResult.error}`)
    }
    
    logTaskProgress(appointment.id, 'EMAIL_SENDING', TASK_STATUS.COMPLETED, {
      messageId: emailResult.messageId,
      to: emailResult.to
    })
    
    // Save email content to database for audit trail
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { confirmationEmail: JSON.stringify(emailContent) }
    })
    
    results.status = TASK_STATUS.COMPLETED
    results.emailSent = true
    
  } catch (error) {
    logTaskProgress(appointment.id, 'EMAIL_NOTIFICATION', TASK_STATUS.FAILED, { error: error.message })
    results.status = TASK_STATUS.FAILED
    results.error = error.message
  }
}