const { format } = require('date-fns')

/**
 * Generate a confirmation email using template
 * @param {Object} appointmentData - The appointment details
 * @param {string} appointmentData.sellerName - Name of the seller
 * @param {string} appointmentData.buyerName - Name of the buyer  
 * @param {Date} appointmentData.startTime - Appointment start time
 * @param {string} appointmentData.timezone - Appointment timezone
 * @param {string} appointmentData.serviceType - Type of service (optional)
 * @param {string} appointmentData.meetLink - Google Meet link
 * @param {string} appointmentData.title - Appointment title
 * @returns {Promise<{subject: string, body: string}>} Generated email content
 */
async function generateConfirmationEmail(appointmentData) {
  console.log('📧 Generating confirmation email using Next Scheduler template...')
  
  const emailContent = generateTemplateEmail(appointmentData)
  
  console.log('✅ Template confirmation email generated successfully')
  console.log(`📧 Subject: ${emailContent.subject}`)
  
  return emailContent
}

/**
 * Generate template email content
 * @param {Object} appointmentData - The appointment details
 * @returns {{subject: string, body: string}} Template email content
 */
function generateTemplateEmail(appointmentData) {
  const {
    sellerName,
    buyerName,
    startTime,
    timezone,
    serviceType,
    meetLink,
    title
  } = appointmentData

  const formattedDateTime = format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
  const timezoneDisplay = timezone && timezone !== 'UTC' ? ` (${timezone})` : ''
  const service = serviceType || title || 'consultation'

  const subject = `Your Appointment Confirmation with ${sellerName}`
  
  const body = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: bold;">Next Scheduler</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          
          <!-- Confirmation Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: bold;">✅ Appointment Confirmed</h2>
          </div>
          
          <!-- Greeting -->
          <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${buyerName}</strong>,</p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">Thank you for booking a <strong>${service}</strong> with me. I'm looking forward to our meeting!</p>
          
          <!-- Appointment Details Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: bold;">📅 Appointment Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #4a5568; width: 120px;">📅 Date & Time:</td>
                <td style="padding: 8px 0; font-size: 16px; color: #2d3748;">${formattedDateTime}${timezoneDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #4a5568;">🔧 Service:</td>
                <td style="padding: 8px 0; font-size: 16px; color: #2d3748;">${service}</td>
              </tr>
              ${meetLink ? `
              <tr>
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #4a5568;">🔗 Meeting Link:</td>
                <td style="padding: 8px 0; font-size: 16px;">
                  <a href="${meetLink}" style="color: #2563eb; text-decoration: none; font-weight: bold; background-color: #eff6ff; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-top: 4px;">
                    Join Meeting
                  </a>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Instructions -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>💡 Reminder:</strong> Please join the meeting a few minutes early to ensure everything works smoothly.
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 25px;">If you have any questions before our appointment, please don't hesitate to reach out.</p>
          
          <!-- Signature -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 16px; margin-bottom: 8px;">Best regards,</p>
            <p style="font-size: 18px; font-weight: bold; color: #2563eb; margin: 0;">${sellerName}</p>
            <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">via Next Scheduler</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            This email was sent by Next Scheduler. Please do not reply to this email.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `

  console.log('📧 Next Scheduler confirmation email template generated')
  
  return { subject, body }
}

/**
 * Validate appointment data for email generation
 * @param {Object} appointmentData - The appointment data to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateAppointmentData(appointmentData) {
  const required = ['sellerName', 'buyerName', 'startTime']
  const missing = required.filter(field => !appointmentData[field])
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields for email generation: ${missing.join(', ')}`)
  }
  
  if (!(appointmentData.startTime instanceof Date)) {
    throw new Error('startTime must be a Date object')
  }
  
  return true
}

module.exports = {
  generateConfirmationEmail,
  validateAppointmentData
}