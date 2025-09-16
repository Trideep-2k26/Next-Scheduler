// Background cron jobs service for server-side operations
let cron
let prisma
let cache, getCacheStats

// Only import server-side dependencies
if (typeof window === 'undefined') {
  try {
    cron = require('node-cron')
    prisma = require('../prisma').default
    const cacheLib = require('../cache')
    cache = cacheLib.cache
    getCacheStats = cacheLib.getCacheStats
  } catch (error) {
    console.error('[CronJobs] Failed to load server dependencies:', error)
  }
}

class CronJobsService {
  constructor() {
    this.jobs = new Map()
    this.isRunning = false
  }

  async startAllJobs() {
    if (typeof window !== 'undefined' || !cron || !prisma) {
      console.log('[CronJobs] Skipping client-side or missing dependencies')
      return
    }

    if (this.isRunning) {
      console.log('[CronJobs] Service already running')
      return
    }

    try {
      // Job 1: Slot Expiry Cleanup (every 1 minute)
      this.jobs.set('slotCleanup', cron.schedule('* * * * *', async () => {
        await this.cleanupExpiredSlots()
      }, { scheduled: false }))

      // Job 2: Cache Warmup (every 5 minutes)
      this.jobs.set('cacheWarmup', cron.schedule('*/5 * * * *', async () => {
        await this.warmupSellerAvailabilityCache()
      }, { scheduled: false }))

      // Job 3: Email Retry Queue (every 2 minutes)
      this.jobs.set('emailMonitor', cron.schedule('*/2 * * * *', async () => {
        await this.monitorEmailNotifications()
      }, { scheduled: false }))

      // Job 4: Cache Statistics (every 30 minutes)
      this.jobs.set('cacheStats', cron.schedule('*/30 * * * *', async () => {
        await this.logCacheStatistics()
      }, { scheduled: false }))

      // Start all jobs
      for (const [name, job] of this.jobs) {
        job.start()
        console.log(`[CronJobs] Started ${name} job`)
      }

      this.isRunning = true
      console.log('[CronJobs] All background jobs started successfully')

      // Run initial cleanup
      await this.cleanupExpiredSlots()

    } catch (error) {
      console.error('[CronJobs] Failed to start jobs:', error)
    }
  }

  async stopAllJobs() {
    for (const [name, job] of this.jobs) {
      job.stop()
      console.log(`[CronJobs] Stopped ${name} job`)
    }
    
    this.jobs.clear()
    this.isRunning = false
    console.log('[CronJobs] All background jobs stopped')
  }

  // Job 1: Clean up expired slot locks
  async cleanupExpiredSlots() {
    try {
      const now = new Date()

      // Clean up database locks (still needed for persistence)
      const result = await prisma.slotLock.updateMany({
        where: {
          status: 'LOCKED',
          expiresAt: { lt: now }
        },
        data: {
          status: 'CANCELLED'
        }
      })

      // Log NodeCache stats (keys expire automatically)
      if (cache) {
        try {
          const stats = getCacheStats()
          console.log(`[CronJobs] Cache stats - Keys: ${stats.keys}, Hits: ${stats.hits}, Misses: ${stats.misses}`)
        } catch (cacheError) {
          console.warn('[CronJobs] Cache stats error:', cacheError.message)
        }
      }

      if (result.count > 0) {
        console.log(`[CronJobs] Cleaned up ${result.count} expired slot locks`)
      }

      return result.count
    } catch (error) {
      console.error('[CronJobs] Error in cleanupExpiredSlots:', error)
      return 0
    }
  }

  // Job 2: Pre-fetch popular seller availability into cache
  async warmupSellerAvailabilityCache() {
    try {
      if (!cache) return 0

      // Get active sellers from last 7 days
      const activeSellers = await prisma.user.findMany({
        where: {
          role: 'seller',
          appointments: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          }
        },
        select: { id: true },
        take: 20 // Limit to top 20 active sellers
      })

      // Warm up cache for next 3 days
      const today = new Date()
      const dates = [0, 1, 2].map(days => {
        const date = new Date(today)
        date.setDate(today.getDate() + days)
        return date.toISOString().split('T')[0]
      })

      let warmedUp = 0
      for (const seller of activeSellers) {
        for (const date of dates) {
          try {
            // Check if already cached
            const cacheKey = `availability:${seller.id}:${date}`
            const cached = cache.get(cacheKey)
            
            if (!cached) {
              // Pre-fetch from database and cache
              const availability = await this.fetchAvailabilityForWarmup(seller.id, date)
              cache.set(cacheKey, availability, 60) // 60 seconds TTL
              warmedUp++
            }
          } catch (error) {
            console.warn(`[CronJobs] Warmup failed for seller ${seller.id} date ${date}:`, error.message)
          }
        }
      }

      console.log(`[CronJobs] Cache warmup completed: ${warmedUp} entries warmed up`)
      return warmedUp
    } catch (error) {
      console.error('[CronJobs] Error in warmupSellerAvailabilityCache:', error)
      return 0
    }
  }

  // Job 3: Monitor failed email notifications  
  async monitorEmailNotifications() {
    try {
      // Check for recent failed appointment notifications in database
      const recentFailures = await prisma.appointment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
          },
          OR: [
            { buyerEmailSent: false },
            { sellerEmailSent: false }
          ]
        },
        select: { id: true, buyerEmailSent: true, sellerEmailSent: true },
        take: 10
      })

      if (recentFailures.length > 0) {
        console.warn(`[CronJobs] Found ${recentFailures.length} appointments with email delivery issues`)
        // Note: Email retry logic would be implemented here if needed
      }

      return recentFailures.length
    } catch (error) {
      console.error('[CronJobs] Error in monitorEmailNotifications:', error)
      return 0
    }
  }

  // Job 4: Log cache statistics for monitoring
  async logCacheStatistics() {
    try {
      if (!cache || !getCacheStats) return

      const stats = getCacheStats()
      }

      console.log('[CronJobs] Cache Statistics:', JSON.stringify(logData, null, 2))

      // Cache stats are now logged but not persisted (NodeCache is memory-only)
      
    } catch (error) {
      console.error('[CronJobs] Error in logCacheStatistics:', error)
    }
  }

  // Helper methods
  async fetchAvailabilityForWarmup(sellerId, date) {
    // Simplified availability fetch for cache warmup
    try {
      // Get seller's availability for the given date
      const availability = await prisma.availability.findMany({
        where: {
          sellerId,
          date: new Date(date)
        },
        include: {
          appointments: {
            where: { status: { not: 'CANCELLED' } }
          }
        }
      })

      // Transform to available slots format
      const availableSlots = availability.map(slot => ({
        id: slot.id,
        time: slot.time,
        duration: slot.duration,
        price: slot.price,
        isAvailable: slot.appointments.length === 0
      })).filter(slot => slot.isAvailable)

      return { availableSlots }
    } catch (error) {
      console.warn(`[CronJobs] Warmup fetch error for ${sellerId}:${date}:`, error.message)
      return { availableSlots: [] }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
      isServerSide: typeof window === 'undefined'
    }
  }
}

// Create singleton instance
const cronJobsService = new CronJobsService()

export default cronJobsService