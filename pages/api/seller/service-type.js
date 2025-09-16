import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // Only sellers can update their service type
  if (session.user.role !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can set service types' })
  }

  const { serviceType } = req.body

  if (!serviceType || typeof serviceType !== 'string') {
    return res.status(400).json({ message: 'Valid service type is required' })
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { serviceType },
      select: {
        id: true,
        name: true,
        serviceType: true
      }
    })

    res.status(200).json({
      message: 'Service type updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating service type:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}