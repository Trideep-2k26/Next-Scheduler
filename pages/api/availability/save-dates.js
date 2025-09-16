import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { parseISO, startOfDay } from 'date-fns'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'seller') {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { selectedDates, startTime = '09:00', endTime = '17:00' } = req.body

  if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
    return res.status(400).json({ message: 'No dates provided' })
  }

  try {
    const sellerId = session.user.id

    // Process each selected date
    const dateAvailabilityPromises = selectedDates.map(async (dateStr) => {
      try {
        // Parse the date string and ensure it's start of day
        const date = startOfDay(parseISO(dateStr))
        
        // Upsert (create or update) the date availability
        return await prisma.sellerDateAvailability.upsert({
          where: {
            sellerId_date: {
              sellerId: sellerId,
              date: date
            }
          },
          update: {
            startTime: startTime,
            endTime: endTime
          },
          create: {
            sellerId: sellerId,
            date: date,
            startTime: startTime,
            endTime: endTime
          }
        })
      } catch (error) {
        console.error(`Error processing date ${dateStr}:`, error)
        return null
      }
    })

    const results = await Promise.all(dateAvailabilityPromises)
    const successfulSaves = results.filter(result => result !== null)

    console.log(`Successfully saved ${successfulSaves.length} date availability records for seller ${sellerId}`)

    res.status(200).json({ 
      message: `Successfully saved ${successfulSaves.length} specific date${successfulSaves.length > 1 ? 's' : ''} to your availability`,
      savedDates: successfulSaves.length,
      totalRequested: selectedDates.length
    })

  } catch (error) {
    console.error('Error saving date availability:', error)
    res.status(500).json({ 
      message: 'Failed to save date availability',
      error: error.message 
    })
  }
}