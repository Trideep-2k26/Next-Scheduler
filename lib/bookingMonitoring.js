/**
 * Background Task Monitoring Utility
 * 
 * This utility helps track and monitor the success rate of background tasks
 * for the refactored booking system. It can be used to:
 * 
 * 1. Monitor background task completion rates
 * 2. Identify which tasks fail most often
 * 3. Provide retry mechanisms for failed tasks
 * 4. Generate reports on booking system health
 */

import prisma from './prisma'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

/**
 * Task monitoring data structure
 */
export const MONITORING_METRICS = {
  TOTAL_BOOKINGS: 'total_bookings',
  CALENDAR_SUCCESS_RATE: 'calendar_success_rate',
  EMAIL_SUCCESS_RATE: 'email_success_rate',
  OVERALL_SUCCESS_RATE: 'overall_success_rate',
  AVERAGE_RESPONSE_TIME: 'average_response_time'
}

/**
 * Get booking system health metrics for the last N days
 */
export async function getBookingHealthMetrics(days = 7) {
  const startDate = startOfDay(subDays(new Date(), days))
  const endDate = endOfDay(new Date())

  try {
    // Get all appointments created in the time period
    const appointments = await prisma.appointment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        createdAt: true,
        googleEventId: true,
        buyerGoogleEventId: true,
        meetLink: true,
        confirmationEmail: true
      }
    })

    const totalBookings = appointments.length
    
    if (totalBookings === 0) {
      return {
        period: { start: startDate, end: endDate, days },
        totalBookings: 0,
        metrics: {}
      }
    }

    // Calculate success rates
    const withSellerCalendar = appointments.filter(apt => apt.googleEventId).length
    const withBuyerCalendar = appointments.filter(apt => apt.buyerGoogleEventId).length
    const withMeetLink = appointments.filter(apt => apt.meetLink).length
    const withConfirmationEmail = appointments.filter(apt => apt.confirmationEmail).length

    // Calculate rates
    const sellerCalendarRate = (withSellerCalendar / totalBookings) * 100
    const buyerCalendarRate = (withBuyerCalendar / totalBookings) * 100
    const meetLinkRate = (withMeetLink / totalBookings) * 100
    const emailRate = (withConfirmationEmail / totalBookings) * 100

    // Overall success rate (appointment has at least calendar events AND email)
    const fullyProcessed = appointments.filter(apt => 
      (apt.googleEventId || apt.buyerGoogleEventId) && apt.confirmationEmail
    ).length
    const overallSuccessRate = (fullyProcessed / totalBookings) * 100

    return {
      period: { start: startDate, end: endDate, days },
      totalBookings,
      metrics: {
        sellerCalendarSuccess: {
          count: withSellerCalendar,
          rate: sellerCalendarRate.toFixed(1)
        },
        buyerCalendarSuccess: {
          count: withBuyerCalendar,
          rate: buyerCalendarRate.toFixed(1)
        },
        meetLinkGeneration: {
          count: withMeetLink,
          rate: meetLinkRate.toFixed(1)
        },
        emailNotifications: {
          count: withConfirmationEmail,
          rate: emailRate.toFixed(1)
        },
        overallSuccess: {
          count: fullyProcessed,
          rate: overallSuccessRate.toFixed(1)
        }
      }
    }

  } catch (error) {
    console.error('Error getting booking health metrics:', error)
    throw error
  }
}

/**
 * Find appointments with failed background tasks that need retry
 */
export async function findFailedBackgroundTasks(days = 1) {
  const cutoffDate = subDays(new Date(), days)

  try {
    const failedTasks = await prisma.appointment.findMany({
      where: {
        createdAt: {
          gte: cutoffDate
        },
        OR: [
          // Missing calendar events (at least one should exist)
          {
            AND: [
              { googleEventId: null },
              { buyerGoogleEventId: null }
            ]
          },
          // Missing confirmation email
          { confirmationEmail: null }
        ]
      },
      include: {
        seller: {
          select: { name: true, email: true }
        },
        buyer: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return failedTasks.map(apt => ({
      appointmentId: apt.id,
      createdAt: apt.createdAt,
      seller: apt.seller.name,
      buyer: apt.buyer.name,
      missingTasks: {
        sellerCalendar: !apt.googleEventId,
        buyerCalendar: !apt.buyerGoogleEventId,
        meetLink: !apt.meetLink,
        confirmationEmail: !apt.confirmationEmail
      }
    }))

  } catch (error) {
    console.error('Error finding failed background tasks:', error)
    throw error
  }
}

/**
 * Retry background tasks for failed appointments
 */
export async function retryFailedBackgroundTasks(appointmentIds) {
  const results = []

  for (const appointmentId of appointmentIds) {
    try {
      console.log(`[RETRY] Starting retry for appointment ${appointmentId}`)
      
      // Import the background task processor
      const { processAppointmentBackgroundTasks } = await import('./backgroundTasks')
      
      const result = await processAppointmentBackgroundTasks(appointmentId)
      
      results.push({
        appointmentId,
        success: result.status === 'completed' || result.status === 'partial_success',
        status: result.status,
        details: result.results
      })
      
      console.log(`[RETRY] Completed retry for appointment ${appointmentId}: ${result.status}`)
      
    } catch (error) {
      console.error(`[RETRY] Failed retry for appointment ${appointmentId}:`, error)
      results.push({
        appointmentId,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

/**
 * Generate a health report for the booking system
 */
export async function generateHealthReport(days = 7) {
  try {
    console.log(`📊 Generating booking system health report (last ${days} days)...`)
    
    const metrics = await getBookingHealthMetrics(days)
    const failedTasks = await findFailedBackgroundTasks(days)

    const report = {
      generatedAt: new Date().toISOString(),
      period: metrics.period,
      summary: {
        totalBookings: metrics.totalBookings,
        overallSuccessRate: metrics.metrics.overallSuccess?.rate || '0.0',
        failedTaskCount: failedTasks.length
      },
      metrics: metrics.metrics,
      failedTasks: failedTasks.slice(0, 10), // Show first 10 failed tasks
      recommendations: generateRecommendations(metrics, failedTasks)
    }

    return report

  } catch (error) {
    console.error('Error generating health report:', error)
    throw error
  }
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics, failedTasks) {
  const recommendations = []

  if (metrics.totalBookings === 0) {
    return ['No bookings in the specified period']
  }

  const overallRate = parseFloat(metrics.metrics.overallSuccess?.rate || '0')
  const emailRate = parseFloat(metrics.metrics.emailNotifications?.rate || '0')
  const sellerCalendarRate = parseFloat(metrics.metrics.sellerCalendarSuccess?.rate || '0')
  const buyerCalendarRate = parseFloat(metrics.metrics.buyerCalendarSuccess?.rate || '0')

  if (overallRate < 80) {
    recommendations.push('⚠️  Overall success rate is below 80%. Consider investigating system issues.')
  }

  if (emailRate < 90) {
    recommendations.push('📧 Email delivery rate is low. Check email service configuration.')
  }

  if (sellerCalendarRate < 70) {
    recommendations.push('📅 Seller calendar creation is failing frequently. Check Google Calendar API permissions.')
  }

  if (buyerCalendarRate < 70) {
    recommendations.push('📅 Buyer calendar creation is failing frequently. Check OAuth token refresh logic.')
  }

  if (failedTasks.length > 5) {
    recommendations.push(`🔄 ${failedTasks.length} appointments need retry. Consider running background task retry.`)
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System is running well! All metrics are within acceptable ranges.')
  }

  return recommendations
}

/**
 * CLI helper for monitoring
 */
export async function runMonitoringCLI() {
  try {
    const report = await generateHealthReport(7)
    
    console.log('\n📊 Next-Scheduler Background Task Health Report')
    console.log('=' .repeat(60))
    console.log(`📅 Period: ${format(new Date(report.period.start), 'MMM dd')} - ${format(new Date(report.period.end), 'MMM dd, yyyy')}`)
    console.log(`📈 Total Bookings: ${report.summary.totalBookings}`)
    console.log(`✅ Overall Success Rate: ${report.summary.overallSuccessRate}%`)
    console.log(`❌ Failed Tasks: ${report.summary.failedTaskCount}`)
    
    if (report.metrics.overallSuccess) {
      console.log('\n📊 Detailed Metrics:')
      console.log(`  Seller Calendar: ${report.metrics.sellerCalendarSuccess.rate}%`)
      console.log(`  Buyer Calendar: ${report.metrics.buyerCalendarSuccess.rate}%`)
      console.log(`  Meet Links: ${report.metrics.meetLinkGeneration.rate}%`)
      console.log(`  Email Notifications: ${report.metrics.emailNotifications.rate}%`)
    }
    
    if (report.failedTasks.length > 0) {
      console.log('\n❌ Recent Failed Tasks:')
      report.failedTasks.forEach(task => {
        console.log(`  ${task.appointmentId}: ${Object.entries(task.missingTasks).filter(([k,v]) => v).map(([k]) => k).join(', ')}`)
      })
    }
    
    console.log('\n💡 Recommendations:')
    report.recommendations.forEach(rec => console.log(`  ${rec}`))
    
  } catch (error) {
    console.error('❌ Failed to generate health report:', error)
  }
}