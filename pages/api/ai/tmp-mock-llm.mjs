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
export { generateMockLLMResponse }