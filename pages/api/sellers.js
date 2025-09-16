import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { addDays, format, parseISO } from 'date-fns'
import { fetchFreeBusy } from '../../lib/google'
import { decryptToken } from '../../lib/encryption'

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
        serviceType: true,
        sellerAvailability: true,
        refreshTokenEncrypted: true
      }
    })

    // Calculate next available slot for each seller
    const sellersWithSlots = await Promise.all(
      sellers.map(async (seller) => {
        let nextAvailableSlot = null
        
        try {
          // Find next available slot based on seller's availability
          if (seller.sellerAvailability && seller.sellerAvailability.length > 0) {
            const now = new Date()
            const currentDay = now.getDay()
            const currentTime = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0')
            
            // Look for next available slot in the next 7 days
            for (let i = 0; i < 7; i++) {
              const checkDay = (currentDay + i) % 7
              const checkDate = new Date(now)
              checkDate.setDate(checkDate.getDate() + i)
              
              const dayAvailability = seller.sellerAvailability.find(av => av.dayOfWeek === checkDay)
              
              if (dayAvailability) {
                // If it's today, check if there's still time available
                if (i === 0) {
                  if (currentTime < dayAvailability.endTime) {
                    const nextSlotTime = currentTime < dayAvailability.startTime 
                      ? dayAvailability.startTime 
                      : currentTime
                    checkDate.setHours(parseInt(nextSlotTime.split(':')[0]), parseInt(nextSlotTime.split(':')[1]))
                    nextAvailableSlot = checkDate.toISOString()
                    break
                  }
                } else {
                  // For future days, use the start time
                  checkDate.setHours(parseInt(dayAvailability.startTime.split(':')[0]), parseInt(dayAvailability.startTime.split(':')[1]))
                  nextAvailableSlot = checkDate.toISOString()
                  break
                }
              }
            }
          }
          
          // Fallback if no availability is set
          if (!nextAvailableSlot) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(9, 0, 0, 0)
            nextAvailableSlot = tomorrow.toISOString()
          }
        } catch (error) {
          console.error(`Error getting availability for seller ${seller.id}:`, error)
          // Fallback
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(9, 0, 0, 0)
          nextAvailableSlot = tomorrow.toISOString()
        }

        return {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          image: seller.image,
          description: seller.description || 'Professional service provider available for consultations and meetings.',
          specialties: seller.specialties ? (function() {
            try {
              // Try to parse as JSON first
              return JSON.parse(seller.specialties);
            } catch(e) {
              // If JSON parsing fails, try to split as comma-separated string
              if (typeof seller.specialties === 'string') {
                return seller.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0);
              }
              return [];
            }
          })() : [],
          hourlyRate: seller.hourlyRate || 100,
          meetingDuration: seller.meetingDuration || 30,
          serviceType: seller.serviceType || 'Consultation',
          nextAvailableSlot: nextAvailableSlot || addDays(new Date(), 1).toISOString()
        }
      })
    )

    res.status(200).json(sellersWithSlots)
  } catch (error) {
    console.error('Error fetching sellers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
