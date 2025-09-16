const { PrismaClient } = require('@prisma/client')
const { addDays, format, startOfWeek, addHours } = require('date-fns')

const prisma = new PrismaClient()

async function createDummySellers() {
  console.log('🗑️  Cleaning up existing dummy data...')
  
  // Delete existing dummy users and their related data
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
      image: null // Will show default avatar
    },
    {
      name: 'Demo Seller 2', 
      email: 'dummyseller2@test.com',
      serviceType: 'UI/UX Design',
      description: 'Creative UI/UX designer with 5+ years experience. Specializing in modern web and mobile app designs.',
      specialties: 'Figma, Adobe XD, User Research, Prototyping',
      hourlyRate: 65,
      meetingDuration: 45,
      image: null // Will show default avatar
    },
    {
      name: 'Dummy Seller 3',
      email: 'dummyseller3@test.com', 
      serviceType: 'Digital Marketing',
      description: 'Digital marketing expert helping businesses grow online. Specializing in SEO, social media, and content strategy.',
      specialties: 'SEO, Google Ads, Social Media, Content Marketing',
      hourlyRate: 55,
      meetingDuration: 30,
      image: null // Will show default avatar
    },
    {
      name: 'Dummy Seller 4',
      email: 'dummyseller4@test.com',
      serviceType: 'Business Consulting', 
      description: 'Business strategy consultant helping startups and SMEs optimize operations and grow revenue.',
      specialties: 'Strategy, Operations, Financial Planning, Market Analysis',
      hourlyRate: 95,
      meetingDuration: 60,
      image: null // Will show default avatar
    }
  ]
  
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
    
    // Create weekly availability (Monday to Friday, 9 AM to 5 PM)
    const weeklyAvailability = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday  
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
    ]
    
    for (const availability of weeklyAvailability) {
      await prisma.sellerAvailability.create({
        data: {
          sellerId: seller.id,
          ...availability
        }
      })
    }
    
    // Create specific date availability for next 14 days  
    const today = new Date()
    const startOfCurrentWeek = startOfWeek(today)
    
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = addDays(today, dayOffset)
      const dayOfWeek = date.getDay()
      
      // Only create availability for weekdays
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Create morning and afternoon slots for weekdays
        const morningSlots = [
          { startTime: '09:00', endTime: '12:00' }, // Single morning block
        ]
        
        const afternoonSlots = [
          { startTime: '14:00', endTime: '17:00' }, // Single afternoon block
        ]
        
        // For specific date availability, create just one block per day
        await prisma.sellerDateAvailability.create({
          data: {
            sellerId: seller.id,
            date: date,
            startTime: '09:00', // Full day start
            endTime: '17:00' // Full day end
          }
        })
      }
    }
    
    console.log(`✅ ${sellerData.name} created with availability`)
  }
  
  console.log('🎉 All dummy sellers created successfully!')
  console.log('📅 Availability created for next 14 days (weekdays only)')
  console.log('🧪 Test data is flagged with isDummy: true for easy cleanup')
}

async function main() {
  try {
    await createDummySellers()
  } catch (error) {
    console.error('❌ Error creating dummy sellers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()