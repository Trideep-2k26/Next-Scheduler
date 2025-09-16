import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) return res.status(401).json({ message: 'Unauthorized' })

  try {
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    })

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found in database. Please log out and log in again to refresh your session.',
        error: 'USER_NOT_FOUND'
      })
    }

    
    if (user.role !== 'seller') return res.status(403).json({ message: 'Forbidden' })

    const { availability } = req.body
    if (!Array.isArray(availability)) return res.status(400).json({ message: 'Invalid payload' })

    
    const results = []
    for (const day of availability) {
      const { dayOfWeek, startTime, endTime, enabled } = day
      if (enabled) {
        const id = `${session.user.id}-${dayOfWeek}`
        const upserted = await prisma.sellerAvailability.upsert({
          where: { id },
          update: { startTime, endTime, dayOfWeek, sellerId: session.user.id },
          create: { id, sellerId: session.user.id, dayOfWeek, startTime, endTime }
        })
        results.push(upserted)
      } else {
        
        await prisma.sellerAvailability.deleteMany({
          where: { sellerId: session.user.id, dayOfWeek }
        })
      }
    }

    res.status(200).json({ message: 'Availability saved', results })
  } catch (error) {
    console.error('Error saving availability:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}
