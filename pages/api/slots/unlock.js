import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { slotCache } from '../../../lib/cache'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { sellerId, date, startTime } = req.body

    // Validate required fields
    if (!sellerId || !date || !startTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: sellerId, date, startTime' 
      })
    }

    // Create cache key for this slot
    const slotKey = `slot:${sellerId}:${date}:${startTime}`

    // Check if slot is locked and by this user
    const existingLock = slotCache.get(slotKey)
    if (!existingLock) {
      return res.status(404).json({ error: 'No lock found for this slot' })
    }

    if (existingLock.buyerId !== session.user.id) {
      return res.status(403).json({ error: 'You can only unlock your own slot locks' })
    }

    if (existingLock.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Cannot unlock a confirmed appointment' })
    }

    // Remove the lock from cache
    slotCache.del(slotKey)

    console.log(`Slot unlocked: ${slotKey} by buyer ${session.user.id}`)

    res.status(200).json({
      success: true,
      message: 'Slot unlocked successfully',
      unlockedSlot: {
        sellerId,
        date,
        startTime
      }
    })

  } catch (error) {
    console.error('Error unlocking slot:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}