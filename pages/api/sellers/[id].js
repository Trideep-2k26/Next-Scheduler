import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ message: 'Seller ID is required' })
  }

  try {
    const seller = await prisma.user.findUnique({
      where: { 
        id: id,
        role: 'seller' // Ensure we only fetch sellers
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        description: true,
        specialties: true,
        hourlyRate: true,
        currency: true,
        meetingDuration: true,
        serviceType: true,
        sellerAvailability: true
      }
    })

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' })
    }

    // Parse specialties if they exist as JSON string
    if (seller.specialties) {
      try {
        // Try parsing as JSON first
        seller.specialties = JSON.parse(seller.specialties)
      } catch (e) {
        // If not JSON, treat as comma-separated string
        seller.specialties = seller.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0)
      }
    } else {
      seller.specialties = []
    }

    // Set defaults for optional fields
    const sellerData = {
      ...seller,
      description: seller.description || 'Professional service provider available for consultations and meetings.',
      hourlyRate: seller.hourlyRate || 100,
      meetingDuration: seller.meetingDuration || 30,
      timezone: 'UTC'
    }

    res.status(200).json(sellerData)
  } catch (error) {
    console.error('Error fetching seller:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
