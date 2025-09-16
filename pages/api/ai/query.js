import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { format, addDays, startOfDay, parseISO, isValid } from 'date-fns'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCached, hashKey, aiCache } from '../../../lib/cache'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)


const createSystemPrompt = (userName) => `You are a professional AI assistant for Next Scheduler, a booking platform that connects buyers with professional sellers. You are knowledgeable about all aspects of the platform and can help users with booking, features, support, and general guidance.

USER CONTEXT:
- Current user: ${userName || 'User'}
- User role: Buyer
- Current date: ${format(new Date(), 'yyyy-MM-dd')} (${format(new Date(), 'EEEE')})
- Current time: ${format(new Date(), 'HH:mm')}

COMPREHENSIVE KNOWLEDGE BASE:

WEBSITE PURPOSE & FEATURES:
- Next Scheduler is a platform where buyers can book appointments with professional sellers
- Sellers offer various services like consultations, therapy, coaching, web development, mobile app development, etc.
- Automatic Google Calendar integration for both buyers and sellers
- Google Meet links generated automatically for virtual meetings
- Review and rating system for sellers
- Real-time availability checking and booking

HOW BOOKING WORKS:
1. Buyers browse available sellers or use AI assistance
2. Select a seller and view their profile with rates, specialties, and reviews  
3. Choose an available time slot from the seller's calendar
4. Fill in meeting title and confirm booking
5. Appointment automatically added to both Google Calendars with Meet link
6. Both parties receive calendar invitations

SUPPORT INFORMATION:
- Contact Email: makaltrideep@gmail.com
- Phone Support: +91 9330661315 (Mon-Fri, 9 AM - 6 PM IST)
- Help pages available for booking guide, FAQ, and contact details

SELLER FEATURES (for information only):
- Sellers can set their own rates and availability
- Manage calendar and appointments
- View earnings and appointment history
- Receive automatic calendar updates

RESPONSE GUIDELINES:
- Always greet users by name when they first interact: "Hi ${userName}! How can I help you today?"
- Be friendly, helpful, and knowledgeable about all platform features
- Provide step-by-step guidance for booking and using features
- Answer questions about pricing, support, functionality, reviews, etc.
- For technical questions (code, tech stack, development), politely decline: "I focus on helping you use the platform rather than technical details. Is there something specific about booking or using Next Scheduler I can help with?"

RESPONSE TYPES:

For GREETING (first interaction or hello), respond with JSON:
{
  "type": "greeting",
  "message": "Hi ${userName}! How can I help you today? I can assist with booking appointments, explain how the platform works, help you find sellers, or answer any questions about Next Scheduler.",
  "confidence": 1.0
}

For BOOKING/SCHEDULING queries, respond with JSON:
{
  "type": "booking",
  "day": "2025-09-16",
  "timeRange": "10:00-12:00", 
  "serviceType": "Therapy",
  "pricePreference": "cheapest",
  "confidence": 0.9,
  "interpretation": "User wants therapy appointment Monday 10-12 PM"
}

For HELP/INFO queries (how to book, contact info, features, etc.), respond with JSON:
{
  "type": "help",
  "message": "Detailed helpful response about the requested topic",
  "confidence": 1.0,
  "helpType": "booking_guide" // or "contact_info", "features", "reviews", etc.
}

For TECHNICAL queries, respond with JSON:
{
  "type": "redirect",
  "message": "I focus on helping you use the platform rather than technical details. Is there something specific about booking appointments or using Next Scheduler I can help with?",
  "confidence": 1.0
}

For GOODBYE, respond with JSON:
{
  "type": "goodbye", 
  "message": "Goodbye ${userName}! Feel free to ask me anytime you need help with booking appointments or have questions about Next Scheduler. Have a great day!",
  "confidence": 1.0
}

HELP TOPICS YOU CAN ASSIST WITH:
- How to book appointments (step-by-step process)
- Finding the right seller for your needs
- Understanding pricing and rates
- Contact support information
- How reviews and ratings work
- Calendar integration and Google Meet
- Managing appointments
- Platform features and benefits
- Account-related questions
- Troubleshooting booking issues

TIME PARSING RULES:
- "10 am to 12 pm" = "10:00-12:00"
- "morning" = 09:00-12:00
- "afternoon" = 13:00-17:00  
- "evening" = 18:00-20:00
- Always respect AM/PM indicators

Examples:
"Hi" → {"type":"greeting","message":"Hi ${userName}! How can I help you today?...",...}
"How do I book an appointment?" → {"type":"help","message":"I'd be happy to guide you through booking! Here's how it works step by step...",...}
"What's the contact number?" → {"type":"help","message":"You can reach our support team at +91 9330661315...",...}
`;


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }


  if (session.user.role !== 'buyer') {
    return res.status(403).json({ message: 'AI assistant is only available for buyers' })
  }

  const { query, conversationHistory = [] } = req.body

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Query is required' })
  }

  try {
    console.log(`AI Query from ${session.user.email}: "${query}"`)

    // Create cache key for AI query
    const cacheData = { query, conversationHistory, userName: session.user.name }
    const cacheKey = `ai_query:${hashKey(JSON.stringify(cacheData))}`

    // Try to get cached response first
    const cachedResponse = await getCached(
      cacheKey,
      async () => {
        console.log('Calling Gemini API (cache miss)')
        return await callLLM(query, conversationHistory, session.user.name)
      },
      30, // 30 second TTL for AI responses
      aiCache
    )

    const llmResponse = cachedResponse
    console.log('LLM Response:', llmResponse)

    // Handle different response types
    if (llmResponse.type === 'greeting') {
      return res.status(200).json({
        type: 'greeting',
        message: llmResponse.message,
        suggestions: [
          "I need a consultation next Monday morning",
          "How do I book an appointment?",
          "What is the contact number for support?",
          "What services are available on this platform?"
        ]
      })
    }

    if (llmResponse.type === 'help') {
      return res.status(200).json({
        type: 'help',
        message: llmResponse.message,
        helpType: llmResponse.helpType,
        suggestions: [
          "How do I book an appointment?",
          "What's the contact information?",
          "Tell me about the booking process",
          "How do reviews work?"
        ]
      })
    }

    if (llmResponse.type === 'redirect') {
      return res.status(200).json({
        type: 'redirect',
        message: llmResponse.message,
        suggestions: [
          "Book a consultation",
          "How to book appointments",
          "Contact support information",
          "Browse all services"
        ]
      })
    }

    if (llmResponse.type === 'goodbye') {
      return res.status(200).json({
        type: 'goodbye',
        message: llmResponse.message
      })
    }

    // Handle booking requests
    if (llmResponse.type !== 'booking') {
      // For non-booking queries, try to be helpful instead of restrictive
      if (llmResponse.type === 'unknown' || !llmResponse.type) {
        // If AI couldn't understand, provide helpful suggestions
        return res.status(200).json({ 
          type: 'help',
          message: `I understand you're looking for help with appointments. Let me assist you! I can help you find and book appointments with professional sellers on our platform. What type of service are you looking for and when would you like to schedule it?`,
          suggestions: [
            "I need a consultation tomorrow morning",
            "Find me therapy sessions next Monday",
            "Book a coaching session this week",
            "Show me available appointments"
          ]
        })
      }
      
      // Return the response as-is for other valid types
      return res.status(200).json(llmResponse)
    }

    // Validate booking request with smarter logic
    if (!llmResponse.day) {
      // Only ask for clarification if NO day is mentioned
      return res.status(200).json({ 
        type: 'help',
        message: `I'd be happy to help you find available sellers! Could you let me know what day you're looking for? For example, you could say "I'm free on Tuesday" or "any seller available next Monday?".`,
        suggestions: [
          "I'm free on Tuesday",
          "Any seller available next Monday?",
          "Show me sellers for this Friday", 
          "I need an appointment tomorrow"
        ]
      })
    }

    
    const targetDate = parseISO(llmResponse.day)
    if (!isValid(targetDate)) {
      return res.status(200).json({ 
        type: 'help',
        message: `I'm having trouble understanding the date you mentioned. Could you try specifying it differently? You can say things like "tomorrow", "next Monday", "this Friday", or a specific date like "December 15th".`,
        interpretation: llmResponse.interpretation,
        suggestions: [
          "Tomorrow morning at 10 AM",
          "Next Monday afternoon",
          "This Friday at 2 PM",
          "Show available times this week"
        ]
      })
    }

    
    let startTime, endTime, timeRangeParts
    let showAllTimesForDay = false
    
    if (!llmResponse.timeRange) {
      
      showAllTimesForDay = true
      startTime = null
      endTime = null
    } else {
      timeRangeParts = llmResponse.timeRange.split('-')
      if (timeRangeParts.length !== 2) {
        
        showAllTimesForDay = true
        startTime = null
        endTime = null
      } else {
        [startTime, endTime] = timeRangeParts
      }
    }

    
    const dayOfWeek = targetDate.getDay()

    
    const whereConditions = {
      role: 'seller',
      sellerAvailability: {
        some: {
          dayOfWeek: dayOfWeek
        }
      }
    }
    
    
    if (!showAllTimesForDay && startTime && endTime) {
      whereConditions.sellerAvailability.some.startTime = {
        lte: startTime 
      }
      whereConditions.sellerAvailability.some.endTime = {
        gte: endTime 
      }
    }

    
    if (llmResponse.serviceType) {
      whereConditions.serviceType = {
        contains: llmResponse.serviceType
      }
    }

    console.log('Database query conditions:', JSON.stringify(whereConditions, null, 2))

    
    let selectQuery = {
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        serviceType: true,
        description: true,
        hourlyRate: true,
        meetingDuration: true,
        sellerAvailability: {
          where: {
            dayOfWeek: dayOfWeek
          }
        }
      },
      take: 10 // Limit results
    }
    
    // Add time filtering to availability if specific time is requested
    if (!showAllTimesForDay && startTime && endTime) {
      selectQuery.select.sellerAvailability.where.startTime = { lte: startTime }
      selectQuery.select.sellerAvailability.where.endTime = { gte: endTime }
    }

    const matchingSellers = await prisma.user.findMany(selectQuery)

    console.log(`Found ${matchingSellers.length} matching sellers`)

    // Check if sellers have conflicting appointments for the specific date/time
    const availableSellers = []
    for (const seller of matchingSellers) {
      
      if (showAllTimesForDay) {
        // When showing all times for a day, include all sellers with their availability
        const dayAvailability = seller.sellerAvailability.map(avail => 
          `${avail.startTime}-${avail.endTime}`
        ).join(', ')
        
        availableSellers.push({
          ...seller,
          nextAvailableSlot: dayAvailability,
          availabilityDay: format(targetDate, 'EEEE, MMMM d'),
          showingAllTimes: true
        })
      } else {
        // Check for conflicts only when specific time is requested
        const hasConflict = await prisma.appointment.findFirst({
          where: {
            sellerId: seller.id,
            start: {
              gte: new Date(`${llmResponse.day}T${startTime}:00`),
              lt: new Date(`${llmResponse.day}T${endTime}:00`)
            }
          }
        })

        if (!hasConflict) {
          // Calculate next available slot time
          const nextSlot = `${startTime}-${endTime}`
          availableSellers.push({
            ...seller,
            nextAvailableSlot: nextSlot,
            availabilityDay: format(targetDate, 'EEEE, MMMM d')
          })
        }
      }
    }

    console.log(`${availableSellers.length} sellers available after conflict check`)

    // If no sellers found, provide smart alternative suggestions
    if (availableSellers.length === 0) {
      const dayName = format(targetDate, 'EEEE')
      
      // Check if there are any sellers available on other days
      const allSellersQuery = await prisma.user.findMany({
        where: {
          role: 'seller',
          sellerAvailability: {
            some: {}
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          serviceType: true,
          hourlyRate: true,
          sellerAvailability: true
        },
        take: 5
      })
      
      // Generate intelligent suggestions based on available sellers
      const alternativeSuggestions = []
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      // Find sellers with similar availability 
      const availabilityOptions = new Set()
      allSellersQuery.forEach(seller => {
        seller.sellerAvailability.forEach(avail => {
          const dayName = dayNames[avail.dayOfWeek]
          // Suggest similar time slots from available sellers
          availabilityOptions.add(`${dayName} from ${avail.startTime} to ${avail.endTime}`)
        })
      })
      
      // Convert set to array and take first 4 unique options
      const uniqueOptions = Array.from(availabilityOptions).slice(0, 4)
      alternativeSuggestions.push(...uniqueOptions)
      
      // If we have sellers in database, show encouraging message with suggestions
      if (allSellersQuery.length > 0) {
        let noAvailabilityMessage
        
        if (showAllTimesForDay) {
          // User asked for any seller on a specific day, but none are available
          noAvailabilityMessage = `Sorry, there are no sellers available on ${dayName}${llmResponse.serviceType ? ` for ${llmResponse.serviceType.toLowerCase()}` : ''}. However, we have ${allSellersQuery.length} sellers available on other days. Here are some alternatives:`
        } else {
          // User asked for a specific time, but none are available  
          noAvailabilityMessage = `I couldn't find any available sellers for ${llmResponse.serviceType || 'appointments'} on ${dayName} from ${startTime} to ${endTime}. However, we have ${allSellersQuery.length} sellers available at other times. Here are some alternative options:`
        }
        
        return res.status(200).json({
          query: query,
          interpretation: llmResponse.interpretation,
          type: "no_availability", 
          message: noAvailabilityMessage,
          searchParams: {
            day: llmResponse.day,
            dayName: format(targetDate, 'EEEE, MMMM d'),
            timeRange: llmResponse.timeRange,
            serviceType: llmResponse.serviceType
          },
          suggestions: alternativeSuggestions,
          totalFound: 0,
          availableSellers: allSellersQuery.map(seller => ({
            id: seller.id,
            name: seller.name,
            serviceType: seller.serviceType,
            hourlyRate: seller.hourlyRate,
            availableDays: seller.sellerAvailability.map(avail => 
              `${dayNames[avail.dayOfWeek]} ${avail.startTime}-${avail.endTime}`
            ).join(', ')
          })),
          helpMessage: "Try asking for a different day or time, like 'Find me a consultation next Monday morning' or 'What sellers are available this week?'"
        })
      }
      
      // Original fallback logic for completely empty database
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin) // duration in minutes
      
      // Suggest 1 hour later
      if (startHour < 16) { // Before 4 PM
        const newStartHour = startHour + 1
        const newEndHour = newStartHour + Math.floor(duration / 60)
        if (newEndHour <= 18) { // Don't go beyond 6 PM
          alternativeSuggestions.push(`${dayName} from ${newStartHour}:${startMin.toString().padStart(2, '0')} to ${newEndHour}:${endMin.toString().padStart(2, '0')}`)
        }
      }
      
      // Suggest next day same time
      const nextDay = addDays(targetDate, 1)
      alternativeSuggestions.push(`${format(nextDay, 'EEEE')} from ${startTime} to ${endTime}`)
      
      // Suggest earlier time same day
      if (startHour > 9) { // After 9 AM
        const newStartHour = startHour - 1
        const newEndHour = newStartHour + Math.floor(duration / 60)
        alternativeSuggestions.push(`${dayName} from ${newStartHour}:${startMin.toString().padStart(2, '0')} to ${newEndHour}:${endMin.toString().padStart(2, '0')}`)
      }
      
      // Suggest same time next week
      const nextWeekDate = addDays(targetDate, 7)
      alternativeSuggestions.push(`${format(nextWeekDate, 'EEEE, MMMM do')} from ${startTime} to ${endTime}`)
      
      return res.status(200).json({
        query: query,
        interpretation: llmResponse.interpretation,
        type: 'no_availability',
        message: `I couldn't find any available sellers for ${llmResponse.serviceType || 'appointments'} on ${dayName} from ${startTime} to ${endTime}. Here are some alternative times that might work:`,
        searchParams: {
          day: llmResponse.day,
          dayName: format(targetDate, 'EEEE, MMMM d'),
          timeRange: llmResponse.timeRange,
          serviceType: llmResponse.serviceType
        },
        suggestions: alternativeSuggestions.slice(0, 4), // Show top 4 alternatives
        totalFound: 0,
        sellers: []
      })
    }

    // Apply price filtering and sorting
    let finalSellers = availableSellers
    
    if (llmResponse.pricePreference) {
      switch (llmResponse.pricePreference) {
        case 'cheapest':
        case 'budget':
          finalSellers = finalSellers.sort((a, b) => (a.hourlyRate || 999) - (b.hourlyRate || 999))
          break
        case 'expensive':
        case 'premium':
          finalSellers = finalSellers.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0))
          break
      }
      
      // Limit results based on price preference
      if (llmResponse.pricePreference === 'cheapest' || llmResponse.pricePreference === 'budget') {
        finalSellers = finalSellers.slice(0, 3) // Show top 3 cheapest
      }
    }

    // Prepare AI response
    const aiResponse = {
      query: query,
      interpretation: llmResponse.interpretation,
      confidence: llmResponse.confidence,
      searchParams: {
        day: llmResponse.day,
        dayName: format(targetDate, 'EEEE, MMMM d'),
        timeRange: llmResponse.timeRange,
        serviceType: llmResponse.serviceType,
        pricePreference: llmResponse.pricePreference
      },
      sellers: finalSellers,
      totalFound: availableSellers.length,
      filteredBy: llmResponse.pricePreference ? `Sorted by ${llmResponse.pricePreference} price` : null
    }

    res.status(200).json(aiResponse)

  } catch (error) {
    console.error('AI Query Error:', error)
    res.status(500).json({ 
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Function to call Gemini AI
async function callLLM(userQuery, conversationHistory = [], userName = 'User') {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      console.warn('Gemini API key not configured, using mock response')
      return generateMockLLMResponse(userQuery, conversationHistory, userName)
    }

    console.log('Attempting to call Gemini API...')

    // Use Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create system prompt with user name
    const systemPrompt = createSystemPrompt(userName)

    // Build conversation context
    const contextMessages = conversationHistory.slice(-6).map(msg => 
      `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n')

    const fullPrompt = contextMessages ? 
      `Conversation History:\n${contextMessages}\n\nCurrent User Query: ${userQuery}` : 
      `User Query: ${userQuery}`

    console.log('Sending request to Gemini with prompt length:', fullPrompt.length)

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: fullPrompt }
    ])

    const response = await result.response
    const text = response.text()
    
    console.log('Gemini Raw Response:', text)

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response')
    }

    const llmResponse = JSON.parse(jsonMatch[0])
    
    console.log('Gemini API call successful')
    return llmResponse
  } catch (error) {
    console.error('Gemini API Error:', error)
    console.error('Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack?.substring(0, 500)
    })
    console.warn('Falling back to mock LLM response')
    
    // Fallback to mock response if Gemini fails
    return generateMockLLMResponse(userQuery, conversationHistory, userName)
  }
}

// Mock LLM response generator for testing
function generateMockLLMResponse(query, conversationHistory = [], userName = 'User') {
  const now = new Date()
  const queryLower = query.toLowerCase().trim()
  
  console.log('Mock LLM processing query:', query)
  console.log('Conversation history length:', conversationHistory.length)
  
  // Check conversation context for previous day mentions and booking context
  let contextualDay = null
  let isFollowUpBookingQuery = false
  
  if (conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-6)
    
    console.log('Recent messages:', recentMessages.map(msg => `${msg.type}: ${msg.content.substring(0, 50)}...`))
    
    // Check if previous conversation was about booking/scheduling
    const recentBookingContext = recentMessages.some(msg => 
      msg.content.toLowerCase().includes('seller') ||
      msg.content.toLowerCase().includes('appointment') ||
      msg.content.toLowerCase().includes('booking') ||
      msg.content.toLowerCase().includes('available') ||
      msg.content.toLowerCase().includes('find') ||
      msg.content.toLowerCase().includes('free')
    )
    
    console.log('Recent booking context found:', recentBookingContext)
    
    // If recent context is about booking, treat date queries as booking requests
    if (recentBookingContext) {
      isFollowUpBookingQuery = true
    }
    
    // Look for day corrections in recent messages
    const dayCorrections = recentMessages.filter(msg => 
      msg.type === 'user' && 
      (msg.content.includes('not') || msg.content.includes('mistake')) &&
      (msg.content.includes('thursday') || msg.content.includes('friday'))
    )
    
    if (dayCorrections.length > 0) {
      const lastCorrection = dayCorrections[dayCorrections.length - 1]
      if (lastCorrection.content.includes('thursday')) {
        contextualDay = 'thursday'
      } else if (lastCorrection.content.includes('friday')) {
        contextualDay = 'friday'  
      }
    }
  }
  
  // Handle greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
  if (greetings.some(greeting => queryLower.startsWith(greeting))) {
    return {
      type: 'greeting',
      message: `Hi ${userName}! How can I help you today? I can assist with booking appointments, explain how the platform works, help you find sellers, or answer any questions about Next Scheduler.`,
      confidence: 1.0
    }
  }
  
  // Handle goodbyes
  const goodbyes = ['bye', 'goodbye', 'see you', 'thanks', 'thank you']
  if (goodbyes.some(goodbye => queryLower.includes(goodbye)) && !queryLower.includes('appointment') && !queryLower.includes('booking')) {
    return {
      type: 'goodbye',
      message: `Goodbye ${userName}! Feel free to return anytime you need help with booking appointments or have questions about Next Scheduler. Have a great day!`,
      confidence: 1.0
    }
  }

  // Handle help queries about website functionality
  const helpQueries = ['how to book', 'how do i book', 'booking process', 'contact', 'support', 'phone', 'email', 'what is this', 'what does this', 'purpose of this', 'features', 'how it works', 'reviews', 'ratings']
  if (helpQueries.some(help => queryLower.includes(help))) {
    
    if (queryLower.includes('contact') || queryLower.includes('support') || queryLower.includes('phone') || queryLower.includes('email')) {
      return {
        type: 'help',
        message: 'You can reach our support team at:\n\n📧 Email: makaltrideep@gmail.com\n📞 Phone: +91 9330661315 (Mon-Fri, 9 AM - 6 PM IST)\n\nFor additional help, check out our FAQ page or booking guide.',
        helpType: 'contact_info',
        confidence: 1.0
      }
    }
    
    if (queryLower.includes('how to book') || queryLower.includes('how do i book') || queryLower.includes('booking process')) {
      return {
        type: 'help',
        message: 'Here\'s how to book an appointment on Next Scheduler:\n\n1. Browse available sellers or let me help you find one\n2. Select a seller to view their profile, rates, and reviews\n3. Choose an available time slot from their calendar\n4. Fill in your meeting title and confirm the booking\n5. The appointment is automatically added to both Google Calendars with a Meet link\n\nWould you like me to help you find a seller for a specific service?',
        helpType: 'booking_guide',
        confidence: 1.0
      }
    }
    
    if (queryLower.includes('what is this') || queryLower.includes('what does this') || queryLower.includes('purpose')) {
      return {
        type: 'help',
        message: 'Next Scheduler is a professional booking platform that connects you with expert sellers offering various services like:\n\n• Consultations & Advisory\n• Therapy & Counseling\n• Coaching & Mentoring\n• Web Development\n• Mobile App Development\n• Training & Workshops\n\nKey features:\n✅ Automatic Google Calendar integration\n✅ Google Meet links for virtual meetings\n✅ Review and rating system\n✅ Real-time availability checking\n✅ Secure booking process\n\nWould you like to book an appointment or learn more about any specific service?',
        helpType: 'features',
        confidence: 1.0
      }
    }

    if (queryLower.includes('reviews') || queryLower.includes('ratings')) {
      return {
        type: 'help',
        message: 'Our review system helps you make informed decisions:\n\n⭐ View ratings and detailed reviews from other buyers\n⭐ Each seller has a profile showing their expertise and past client feedback\n⭐ After your appointment, you can leave a review to help other users\n⭐ Ratings are based on communication, expertise, and overall satisfaction\n\nYou can see seller ratings when browsing or searching for appointments. Would you like me to help you find a highly-rated seller?',
        helpType: 'reviews',
        confidence: 1.0
      }
    }

    // General help response
    return {
      type: 'help',
      message: 'I can help you with various aspects of Next Scheduler:\n\n• How to book appointments step-by-step\n• Contact support information\n• Understanding platform features\n• Finding the right seller for your needs\n• How reviews and ratings work\n• Calendar integration details\n\nWhat specific information would you like to know more about?',
      helpType: 'general',
      confidence: 0.9
    }
  }

  // Handle technical queries - politely decline
  const techQueries = ['tech stack', 'technology', 'code', 'programming', 'database', 'api', 'development', 'technical', 'how is this built', 'what framework']
  if (techQueries.some(tech => queryLower.includes(tech))) {
    return {
      type: 'redirect',
      message: 'I focus on helping you use the platform rather than technical details. Is there something specific about booking appointments or using Next Scheduler I can help with?',
      confidence: 1.0
    }
  }
  
  // Handle irrelevant queries with context awareness
  const bookingKeywords = ['appointment', 'booking', 'schedule', 'free', 'available', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'morning', 'afternoon', 'evening', 'am', 'pm', 'consultation', 'therapy', 'coaching', 'advisory', 'training', 'mentoring', 'workshop', 'strategy']
  
  // Add date patterns to booking detection
  const datePatterns = [
    /\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /\d{1,2}\/\d{1,2}/,
    /\d{1,2}-\d{1,2}/,
    /check.*for/i,
    /what.*about/i,
    /how.*about/i
  ]
  
  const hasBookingKeywords = bookingKeywords.some(keyword => queryLower.includes(keyword))
  const hasDatePattern = datePatterns.some(pattern => pattern.test(query))
  
  console.log('Booking detection:', {
    hasBookingKeywords,
    hasDatePattern, 
    isFollowUpBookingQuery,
    query: queryLower
  })
  
  // If this seems like a booking query (has keywords, date patterns, or is a follow-up), proceed to booking logic
  if (!hasBookingKeywords && !hasDatePattern && !isFollowUpBookingQuery) {
    console.log('Redirecting - no booking indicators found')
    return {
      type: 'redirect',
      message: 'I\'m a scheduling assistant focused on helping you book appointments. I can help you find sellers for consultations, therapy, coaching, and more. What type of appointment would you like to schedule?',
      confidence: 1.0
    }
  }
  
  console.log('Proceeding with booking logic...')
  
  // Handle booking requests
  const tomorrow = addDays(now, 1)
  const nextSunday = addDays(startOfDay(now), (7 - now.getDay()) % 7 || 7)
  const nextMonday = addDays(startOfDay(now), (8 - now.getDay()) % 7 || 7)
  const nextTuesday = addDays(startOfDay(now), (9 - now.getDay()) % 7 || 7)
  const nextWednesday = addDays(startOfDay(now), (10 - now.getDay()) % 7 || 7)
  const nextThursday = addDays(startOfDay(now), (11 - now.getDay()) % 7 || 7)
  const nextFriday = addDays(startOfDay(now), (12 - now.getDay()) % 7 || 7)
  const nextSaturday = addDays(startOfDay(now), (13 - now.getDay()) % 7 || 7)
  
  let day, timeRange, serviceType = null, pricePreference = null, confidence = 0.8
  
  // Extract day (improved with context awareness and specific date parsing)
  
  // First, try to parse specific dates like "25 september", "26th september", etc.
  const specificDateMatch = queryLower.match(/(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i)
  if (specificDateMatch) {
    const dayNum = parseInt(specificDateMatch[1])
    const monthName = specificDateMatch[3].toLowerCase()
    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    }
    
    const currentYear = now.getFullYear()
    const targetMonth = monthMap[monthName]
    const targetDate = new Date(currentYear, targetMonth, dayNum)
    
    // If the date is in the past this year, assume next year
    if (targetDate < now) {
      targetDate.setFullYear(currentYear + 1)
    }
    
    day = format(targetDate, 'yyyy-MM-dd')
    confidence = 0.9
  }
  // Then try day-of-week parsing
  else if (contextualDay === 'thursday' || queryLower.includes('next thursday') || (queryLower.includes('thursday') && !queryLower.includes('this thursday'))) {
    day = format(nextThursday, 'yyyy-MM-dd')
  } else if (contextualDay === 'friday' || queryLower.includes('next friday') || (queryLower.includes('friday') && !queryLower.includes('this friday'))) {
    day = format(nextFriday, 'yyyy-MM-dd')  
  } else if (queryLower.includes('tomorrow')) {
    day = format(tomorrow, 'yyyy-MM-dd')
  } else if (queryLower.includes('next sunday') || (queryLower.includes('sunday') && !queryLower.includes('this sunday'))) {
    day = format(nextSunday, 'yyyy-MM-dd')
  } else if (queryLower.includes('next monday') || (queryLower.includes('monday') && !queryLower.includes('this monday'))) {
    day = format(nextMonday, 'yyyy-MM-dd')
  } else if (queryLower.includes('next tuesday') || (queryLower.includes('tuesday') && !queryLower.includes('this tuesday'))) {
    day = format(nextTuesday, 'yyyy-MM-dd')
  } else if (queryLower.includes('next wednesday') || (queryLower.includes('wednesday') && !queryLower.includes('this wednesday'))) {
    day = format(nextWednesday, 'yyyy-MM-dd')
  } else if (queryLower.includes('today')) {
    day = format(now, 'yyyy-MM-dd')
  } else if (queryLower.includes('weekend') || queryLower.includes('saturday')) {
    day = format(nextSaturday, 'yyyy-MM-dd')
  } else {
    // Default to tomorrow
    day = format(tomorrow, 'yyyy-MM-dd')
    confidence = 0.7
  }

  // Extract time range with improved morning/afternoon/evening parsing
  if (queryLower.includes('10 am to 12 pm') || queryLower.includes('10am to 12pm') || queryLower.includes('10-12') && queryLower.includes('am')) {
    timeRange = '10:00-12:00'
  } else if (queryLower.includes('2-3') && (queryLower.includes('pm') || queryLower.includes('afternoon'))) {
    timeRange = '14:00-15:00'
  } else if (queryLower.includes('9 am to 10 am') || queryLower.includes('9-10') && queryLower.includes('am')) {
    timeRange = '09:00-10:00'
  } else if (queryLower.includes('morning')) {
    timeRange = '10:00-11:00' // Default morning slot
  } else if (queryLower.includes('afternoon')) {
    timeRange = '14:00-15:00' // Default afternoon slot
  } else if (queryLower.includes('evening')) {
    timeRange = '18:00-19:00' // Default evening slot
  } else if (queryLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/)) {
    // Extract specific time like "2 PM", "10:30 AM"
    const timeMatch = queryLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/)
    if (timeMatch) {
      let hour = parseInt(timeMatch[1])
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const ampm = timeMatch[3]
      
      if (ampm === 'pm' && hour !== 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const endHour = hour + 1 // Default 1-hour duration
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeRange = `${startTime}-${endTime}`
    }
  } else {
    // If no time specified, leave timeRange as null - we'll show all available times for the day
    timeRange = null
    confidence = Math.max(0.7, confidence - 0.1) // Slightly lower confidence but still valid
  }

  // Extract service type
  if (queryLower.includes('consultation')) {
    serviceType = 'Consultation'
  } else if (queryLower.includes('advisory')) {
    serviceType = 'Advisory'  
  } else if (queryLower.includes('coaching')) {
    serviceType = 'Coaching'
  } else if (queryLower.includes('therapy')) {
    serviceType = 'Therapy'
  } else if (queryLower.includes('strategy')) {
    serviceType = 'Strategy Session'
  } else if (queryLower.includes('training')) {
    serviceType = 'Training'
  } else if (queryLower.includes('mentoring')) {
    serviceType = 'Mentoring'
  } else if (queryLower.includes('workshop')) {
    serviceType = 'Workshop'
  }
  
  // Extract price preference
  if (queryLower.includes('cheapest') || queryLower.includes('cheap') || queryLower.includes('budget') || queryLower.includes('affordable')) {
    pricePreference = 'cheapest'
  } else if (queryLower.includes('expensive') || queryLower.includes('premium') || queryLower.includes('best') || queryLower.includes('top')) {
    pricePreference = 'expensive'
  }

  // Create interpretation message
  let interpretation
  if (timeRange) {
    interpretation = `Looking for ${pricePreference ? pricePreference + ' ' : ''}${serviceType ? serviceType.toLowerCase() : 'appointment'} on ${format(parseISO(day), 'EEEE, MMMM d')} from ${timeRange.replace('-', ' to ')}`
  } else {
    interpretation = `Looking for ${pricePreference ? pricePreference + ' ' : ''}${serviceType ? serviceType.toLowerCase() + ' ' : ''}sellers available on ${format(parseISO(day), 'EEEE, MMMM d')}`
  }

  return {
    type: 'booking',
    day,
    timeRange,
    serviceType,
    pricePreference,
    confidence,
    interpretation
  }
}