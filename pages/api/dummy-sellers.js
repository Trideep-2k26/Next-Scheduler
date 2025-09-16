import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { addDays, startOfWeek } from 'date-fns'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      console.log('🗑️  Cleaning up existing dummy data...')
      
      
      await prisma.sellerAvailability.deleteMany({
        where: {
          seller: {
            isDummy: true
          }
        }
      })
      
      await prisma.sellerDateAvailability.deleteMany({
        where: {
          seller: {
            isDummy: true
          }
        }
      })
      
      await prisma.user.deleteMany({
        where: {
          isDummy: true
        }
      })
      
      console.log('✅ Dummy data cleaned up')
      
      // Create dummy sellers
      console.log('👨‍💼 Creating dummy sellers...')
      
      const dummySellers = [
        {
          name: 'Demo Seller 1',
          email: 'dummyseller1@test.com',
          serviceType: 'Web Development',
          description: 'Full-stack web developer specializing in React and Node.js. Available for consultation and project development.',
          specialties: 'React, Node.js, TypeScript, Database Design',
          hourlyRate: 75,
          meetingDuration: 60,
          image: null
        },
        {
          name: 'Demo Seller 2', 
          email: 'dummyseller2@test.com',
          serviceType: 'UI/UX Design',
          description: 'Creative UI/UX designer with 5+ years experience. Specializing in modern web and mobile app designs.',
          specialties: 'Figma, Adobe XD, User Research, Prototyping',
          hourlyRate: 65,
          meetingDuration: 45,
          image: null
        },
        {
          name: 'Dummy Seller 3',
          email: 'dummyseller3@test.com', 
          serviceType: 'Digital Marketing',
          description: 'Digital marketing expert helping businesses grow online. Specializing in SEO, social media, and content strategy.',
          specialties: 'SEO, Google Ads, Social Media, Content Marketing',
          hourlyRate: 55,
          meetingDuration: 30,
          image: null
        },
        {
          name: 'Dummy Seller 4',
          email: 'dummyseller4@test.com',
          serviceType: 'Business Consulting', 
          description: 'Business strategy consultant helping startups and SMEs optimize operations and grow revenue.',
          specialties: 'Strategy, Operations, Financial Planning, Market Analysis',
          hourlyRate: 95,
          meetingDuration: 60,
          image: null
        }
      ]
      
      const createdSellers = []
      
      // Create sellers with availability
      for (const sellerData of dummySellers) {
        console.log(`Creating ${sellerData.name}...`)
        
        const seller = await prisma.user.create({
          data: {
            ...sellerData,
            role: 'seller',
            isDummy: true
          }
        })
        
        
        const weeklyAvailability = [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, 
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },  
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, 
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, 
        ]
        
        for (const availability of weeklyAvailability) {
          await prisma.sellerAvailability.create({
            data: {
              sellerId: seller.id,
              ...availability
            }
          })
        }
        
          
        const today = new Date()
        
        for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
          const date = addDays(today, dayOffset)
          const dayOfWeek = date.getDay()
          
          
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            
            const morningSlots = [
              { startTime: '09:00', endTime: '10:00' },
              { startTime: '10:30', endTime: '11:30' },
            ]
            
            const afternoonSlots = [
              { startTime: '14:00', endTime: '15:00' },
              { startTime: '15:30', endTime: '16:30' },
            ]
            
            const allSlots = [...morningSlots, ...afternoonSlots]
            
            for (const slot of allSlots) {
              await prisma.sellerDateAvailability.create({
                data: {
                  sellerId: seller.id,
                  date: date,
                  startTime: slot.startTime,
                  endTime: slot.endTime
                }
              })
            }
          }
        }
        
        createdSellers.push(seller)
        console.log(`✅ ${sellerData.name} created with availability`)
      }
      
      console.log('🎉 All dummy sellers created successfully!')
      
      res.status(200).json({ 
        message: 'Dummy sellers created successfully!',
        sellers: createdSellers.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          serviceType: s.serviceType
        }))
      })
    } catch (error) {
      console.error('❌ Error creating dummy sellers:', error)
      res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  } else if (req.method === 'DELETE') {
    // Delete all dummy data
    try {
      await prisma.sellerAvailability.deleteMany({
        where: {
          seller: {
            isDummy: true
          }
        }
      })
      
      await prisma.sellerDateAvailability.deleteMany({
        where: {
          seller: {
            isDummy: true
          }
        }
      })
      
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          isDummy: true
        }
      })
      
      res.status(200).json({ 
        message: 'All dummy sellers deleted successfully!',
        deletedCount: deletedUsers.count
      })
    } catch (error) {
      console.error('❌ Error deleting dummy sellers:', error)
      res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}