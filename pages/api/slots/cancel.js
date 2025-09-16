import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { lockId } = req.body

    if (!lockId) {
      return res.status(400).json({ error: 'lockId is required' })
    }

    // Find the lock and verify ownership
    const slotLock = await prisma.slotLock.findUnique({
      where: { id: lockId }
    })

    if (!slotLock) {
      return res.status(404).json({ error: 'Slot lock not found' })
    }

    if (slotLock.buyerId !== session.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this lock' })
    }

    if (slotLock.status === 'CONFIRMED') {
      return res.status(400).json({ 
        error: 'Cannot cancel a confirmed booking. Please cancel the appointment instead.' 
      })
    }

    if (slotLock.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Lock is already cancelled' })
    }

    // Cancel the lock
    const cancelledLock = await prisma.slotLock.update({
      where: { id: lockId },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    res.status(200).json({
      success: true,
      lock: cancelledLock,
      message: 'Slot lock cancelled successfully. The slot is now available for booking.'
    })

  } catch (error) {
    console.error('Error cancelling slot:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}