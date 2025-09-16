import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import prisma from '../../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { sellerId } = req.query

  try {
    const session = await getServerSession(req, res, authOptions)
    
    // Only allow sellers to fetch their own specific dates, or let buyers fetch seller's dates
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // If user is a seller, they can only fetch their own dates
    if (session.user.role === 'seller' && session.user.id !== sellerId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const specificDates = await prisma.sellerDateAvailability.findMany({
      where: { sellerId: sellerId },
      orderBy: { date: 'asc' }
    })

    res.status(200).json({
      sellerId,
      specificDates: specificDates.map(date => ({
        date: date.date.toISOString().split('T')[0], // Return as YYYY-MM-DD format
        startTime: date.startTime,
        endTime: date.endTime
      }))
    })

  } catch (error) {
    console.error('Error fetching specific date availability:', error)
    res.status(500).json({ 
      message: 'Failed to fetch specific date availability',
      error: error.message 
    })
  }
}