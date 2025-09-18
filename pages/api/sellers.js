import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const sellers = await prisma.user.findMany({
      where: { role: 'seller' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        description: true,
        specialties: true,
        hourlyRate: true,
        meetingDuration: true,
        serviceType: true
      }
    })

    const sellersData = sellers.map(seller => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      image: seller.image,
      description: seller.description || 'Professional service provider available for consultations.',
      specialties: seller.specialties ? (() => {
        try {
          return JSON.parse(seller.specialties)
        } catch(e) {
          return typeof seller.specialties === 'string' ? 
            seller.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0) : []
        }
      })() : [],
      hourlyRate: seller.hourlyRate || 100,
      meetingDuration: seller.meetingDuration || 30,
      serviceType: seller.serviceType || 'Consultation',
      nextAvailableSlot: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }))

    res.status(200).json(sellersData)
  } catch (error) {
    console.error('Error fetching sellers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
