/**
 * Manual Booking Test Script
 * Run this after deploying to test the complete booking flow
 */

import { format, addHours } from 'date-fns'

// Replace these with actual values from your database
const TEST_CONFIG = {
  // Get seller ID from your database
  SELLER_ID: 'your-seller-id-here',
  
  // Test appointment details
  APPOINTMENT: {
    title: 'Test Fast Booking Flow',
    start: addHours(new Date(), 2).toISOString(), // 2 hours from now
    end: addHours(new Date(), 2.5).toISOString(),  // 2.5 hours from now
    timezone: 'America/New_York'
  }
}

/**
 * Test the complete booking flow
 */
async function testCompleteBookingFlow() {
  console.log('🧪 Testing Complete Booking Flow')
  console.log('=' .repeat(50))
  
  try {
    console.log('📅 Test booking details:')
    console.log(`   Seller ID: ${TEST_CONFIG.SELLER_ID}`)
    console.log(`   Title: ${TEST_CONFIG.APPOINTMENT.title}`)
    console.log(`   Start: ${format(new Date(TEST_CONFIG.APPOINTMENT.start), 'PPP p')}`)
    console.log(`   End: ${format(new Date(TEST_CONFIG.APPOINTMENT.end), 'PPP p')}`)
    console.log('')

    // Step 1: Test fast booking API
    console.log('⚡ Step 1: Testing fast booking API response...')
    const startTime = Date.now()
    
    const bookingResponse = await fetch('/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sellerId: TEST_CONFIG.SELLER_ID,
        ...TEST_CONFIG.APPOINTMENT
      })
    })
    
    const responseTime = Date.now() - startTime
    const bookingResult = await bookingResponse.json()
    
    if (bookingResponse.ok) {
      console.log(`✅ Booking confirmed in ${responseTime}ms`)
      console.log(`📋 Appointment ID: ${bookingResult.appointment.id}`)
      
      if (responseTime < 2000) {
        console.log('🎯 SUCCESS: Response time under 2 seconds!')
      } else {
        console.log('⚠️  WARNING: Response time exceeds 2 seconds')
      }
      
      // Step 2: Wait and test background processing
      console.log('\n⏳ Step 2: Testing background task processing...')
      console.log('Waiting 10 seconds for background tasks to complete...')
      
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      // Test background task completion
      const testResponse = await fetch('/api/test-background-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: bookingResult.appointment.id
        })
      })
      
      if (testResponse.ok) {
        const testResult = await testResponse.json()
        console.log('\n📊 Background Task Results:')
        console.log(`   Seller Calendar: ${testResult.results.tasks.sellerCalendar.status}`)
        console.log(`   Buyer Calendar: ${testResult.results.tasks.buyerCalendar.status}`)
        console.log(`   Meet Link: ${testResult.results.tasks.meetLink.status}`)
        console.log(`   Email: ${testResult.results.tasks.email.status}`)
        
        // Count successes
        const tasks = testResult.results.tasks
        const successCount = Object.values(tasks).filter(task => 
          task.status === 'success' || task.status === 'generated'
        ).length
        
        console.log(`\n🎯 Overall: ${successCount}/4 tasks successful`)
        
        if (successCount >= 3) {
          console.log('🎉 EXCELLENT: Most background tasks completed!')
        } else if (successCount >= 2) {
          console.log('😊 GOOD: Some background tasks completed')
        } else {
          console.log('😟 NEEDS ATTENTION: Most background tasks failed')
        }
        
      } else {
        console.log('❌ Could not test background tasks')
      }
      
    } else {
      console.log(`❌ Booking failed: ${bookingResult.message}`)
      console.log('Response time:', responseTime + 'ms')
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

/**
 * Instructions for manual testing
 */
function showTestingInstructions() {
  console.log('\n📝 Manual Testing Instructions')
  console.log('=' .repeat(50))
  console.log('1. Update TEST_CONFIG.SELLER_ID with a real seller ID from your database')
  console.log('2. Deploy your code to Vercel')
  console.log('3. Open Vercel logs in another tab')
  console.log('4. Make a booking through your frontend')
  console.log('5. Watch for these log patterns:')
  console.log('')
  console.log('   Fast Response Logs:')
  console.log('   ✅ [BOOKING] Appointment XXX saved successfully in XXXms')
  console.log('   ✅ Response time should be < 2000ms')
  console.log('')
  console.log('   Background Task Logs:')
  console.log('   ✅ [BACKGROUND] Starting background processing for appointment XXX')
  console.log('   ✅ [BACKGROUND] ✅ Seller calendar event created: XXX')
  console.log('   ✅ [BACKGROUND] ✅ Buyer calendar event created: XXX')
  console.log('   ✅ [BACKGROUND] ✅ Meet link generated: XXX')
  console.log('   ✅ [BACKGROUND] ✅ Confirmation email sent successfully')
  console.log('   ✅ [BACKGROUND] 🎉 All background tasks completed successfully')
  console.log('')
  console.log('6. Check buyer and seller Google Calendars for events')
  console.log('7. Check buyer email for confirmation message')
  console.log('8. Verify no "timeout" or "function timeout" errors in logs')
}

/**
 * Debugging checklist
 */
function showDebuggingChecklist() {
  console.log('\n🔧 Debugging Checklist')
  console.log('=' .repeat(50))
  console.log('If background tasks are failing, check:')
  console.log('')
  console.log('📋 Database Issues:')
  console.log('   □ Seller has refreshTokenEncrypted stored')
  console.log('   □ Buyer has Google account linked')
  console.log('   □ Database connection working in production')
  console.log('')
  console.log('📋 Google Calendar API:')
  console.log('   □ Google Calendar API enabled in project')
  console.log('   □ OAuth consent screen approved')
  console.log('   □ Seller refresh tokens valid')
  console.log('   □ Buyer access/refresh tokens valid')
  console.log('')
  console.log('📋 Email Service:')
  console.log('   □ Gmail SMTP credentials configured')
  console.log('   □ AI email generation working (check Gemini API)')
  console.log('   □ Email service environment variables set')
  console.log('')
  console.log('📋 Vercel Configuration:')
  console.log('   □ All environment variables deployed')
  console.log('   □ Function timeout not exceeded')
  console.log('   □ No missing dependencies')
}

// Run instructions if script is executed
if (typeof window === 'undefined') {
  showTestingInstructions()
  showDebuggingChecklist()
  console.log('\n💡 To run the actual test, call testCompleteBookingFlow() from your frontend')
}

export { testCompleteBookingFlow, showTestingInstructions, showDebuggingChecklist }