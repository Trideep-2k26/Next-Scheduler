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

    const enabledDays = availability.filter(day => day.enabled)
    const disabledDays = availability.filter(day => !day.enabled).map(day => day.dayOfWeek)

    const operations = []

    if (disabledDays.length > 0) {
      operations.push(
        prisma.sellerAvailability.deleteMany({
          where: { sellerId: session.user.id, dayOfWeek: { in: disabledDays } }
        })
      )
    }

    enabledDays.forEach(day => {
      const { dayOfWeek, startTime, endTime } = day
      const id = `${session.user.id}-${dayOfWeek}`
      operations.push(
        prisma.sellerAvailability.upsert({
          where: { id },
          update: { startTime, endTime },
          create: { id, sellerId: session.user.id, dayOfWeek, startTime, endTime }
        })
      )
    })

    const results = await Promise.all(operations)

    res.status(200).json({ message: 'Availability saved', results })
  } catch (error) {
    console.error('Error saving availability:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}
