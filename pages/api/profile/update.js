import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (session.user.role !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can update profile' })
  }

  const { name, description, specialties, hourlyRate, currency, meetingDuration } = req.body

  try {
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || session.user.name,
        description: description,
        specialties: specialties ? JSON.stringify(specialties) : null,
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
        currency: currency || 'INR',
        meetingDuration: meetingDuration ? parseInt(meetingDuration) : 30 // default 30 minutes
      }
    })

    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        description: updatedUser.description,
        specialties: updatedUser.specialties ? JSON.parse(updatedUser.specialties) : [],
        hourlyRate: updatedUser.hourlyRate,
        currency: updatedUser.currency,
        meetingDuration: updatedUser.meetingDuration
      }
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    
    // If the error is due to missing fields, we need to add them to the schema
    if (error.code === 'P2002' || error.message.includes('Unknown arg')) {
      return res.status(400).json({ 
        message: 'Profile fields need to be added to database schema. Please contact admin.',
        error: error.message 
      })
    }
    
    res.status(500).json({ message: 'Internal server error' })
  }
}
