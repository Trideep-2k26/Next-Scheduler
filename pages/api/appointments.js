/**
 * Appointment Management API Controller
 * Handles appointment-related operations:
 * - Fetching user appointments (buyer/seller specific)
 * - Caching for performance optimization
 * - Role-based data filtering
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { getCached } from '../../lib/cache'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { from, to, page = 1, limit = 20 } = req.query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  try {
    const where = {
      OR: [
        { sellerId: session.user.id },
        { buyerId: session.user.id }
      ]
    }

    if (from) {
      where.start = { gte: new Date(from) }
    }
    
    if (to) {
      where.end = { lte: new Date(to) }
    }

    // Cache key based on user ID, role, and query parameters
    const cacheKey = `appointments:${session.user.id}:${page}:${limit}:${from || ''}:${to || ''}`
    
    const result = await getCached(
      cacheKey,
      async () => {
        const appointments = await prisma.appointment.findMany({
          where,
          include: {
            seller: {
              select: { id: true, name: true, email: true, image: true }
            },
            buyer: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: {
            start: 'asc'
          },
          skip,
          take: parseInt(limit)
        })

        const total = await prisma.appointment.count({ where })

        const appointmentsWithRole = appointments.map(appointment => ({
          ...appointment,
          userRole: appointment.sellerId === session.user.id ? 'seller' : 'buyer'
        }))

        return {
          appointments: appointmentsWithRole,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      },
      300 // 5 minutes cache TTL
    )

    res.status(200).json(result)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
