// This service runs server-side only
let cron
let prisma

// Only import these modules server-side
if (typeof window === 'undefined') {
  try {
    cron = require('node-cron')
    prisma = require('../prisma').default
  } catch (error) {
    console.error('[SlotCleanup] Failed to load server dependencies:', error)
  }
}

class SlotLockCleanupService {
  constructor() {
    this.isRunning = false
    this.job = null
  }

  async cleanupExpiredLocks() {
    // Only run server-side
    if (typeof window !== 'undefined' || !prisma) {
      return 0
    }

    try {
      const result = await prisma.slotLock.updateMany({
        where: {
          status: 'LOCKED',
          expiresAt: { lt: new Date() }
        },
        data: {
          status: 'CANCELLED'
        }
      })

      if (result.count > 0) {
        console.log(`[SlotCleanup] Cleaned up ${result.count} expired slot locks`)
      }

      return result.count
    } catch (error) {
      console.error('[SlotCleanup] Error cleaning up expired locks:', error)
      throw error
    }
  }

  start() {
    // Only run server-side
    if (typeof window !== 'undefined' || !cron || !prisma) {
      console.log('[SlotCleanup] Skipping client-side initialization')
      return
    }

    if (this.isRunning) {
      console.log('[SlotCleanup] Service is already running')
      return
    }

    // Run cleanup every minute
    this.job = cron.schedule('* * * * *', async () => {
      try {
        await this.cleanupExpiredLocks()
      } catch (error) {
        console.error('[SlotCleanup] Cron job error:', error)
      }
    })

    this.isRunning = true
    console.log('[SlotCleanup] Background cleanup service started')
  }

  stop() {
    if (!this.isRunning || !this.job) {
      console.log('[SlotCleanup] Service is not running')
      return
    }

    this.job.stop()
    this.job = null
    this.isRunning = false
    console.log('[SlotCleanup] Background cleanup service stopped')
  }

  async manualCleanup() {
    // Only run server-side
    if (typeof window !== 'undefined' || !prisma) {
      console.log('[SlotCleanup] Manual cleanup skipped (client-side)')
      return 0
    }

    console.log('[SlotCleanup] Running manual cleanup...')
    const count = await this.cleanupExpiredLocks()
    console.log(`[SlotCleanup] Manual cleanup completed: ${count} locks cleaned`)
    return count
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasJob: !!this.job,
      isServerSide: typeof window === 'undefined'
    }
  }
}


const slotCleanupService = new SlotLockCleanupService()

export default slotCleanupService