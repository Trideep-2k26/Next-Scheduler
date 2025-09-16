import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendConfirmationEmail(to, subject, html) {
  const mailOptions = {
    from: `"Next Scheduler" <${process.env.EMAIL_USER}>`, // sender
    to,                                                    // buyer email
    subject,
    html,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("✅ Confirmation email sent:", info.messageId)
    return {
      success: true,
      messageId: info.messageId,
      to: to,
      subject: subject
    }
  } catch (err) {
    console.error("❌ Error sending email:", err)
    throw err
  }
}


export async function sendReviewNotificationEmail(sellerEmail, sellerName, reviewerName, rating, comment, isUpdate = false) {
  const starsDisplay = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  const actionText = isUpdate ? 'updated their review' : 'left you a new review';
  const titleText = isUpdate ? 'Review Updated' : 'New Review Received';
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        ${isUpdate ? '📝' : '🎉'} ${titleText}!
      </h2>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Hello ${sellerName}!</h3>
        <p style="color: #666; font-size: 16px;">
          <strong>${reviewerName}</strong> has ${actionText}
        </p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <div style="font-size: 24px; margin-bottom: 10px;">
            ${starsDisplay}
          </div>
          <p style="color: #333; font-size: 18px; margin: 0;">
            <strong>${rating} out of 5 stars</strong>
          </p>
        </div>
        
        ${comment ? `
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
            <h4 style="color: #333; margin-top: 0;">Review Comment:</h4>
            <p style="color: #666; font-style: italic; margin: 0;">
              "${comment}"
            </p>
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666;">
          Keep up the great work! Reviews help build trust with potential clients.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        This is an automated notification from your Next Scheduler App
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"Next Scheduler" <${process.env.EMAIL_USER}>`,
    to: sellerEmail,
    subject: `${titleText} - ${rating} Star${rating !== 1 ? 's' : ''}!`,
    html,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ Review ${isUpdate ? 'update' : ''} notification email sent:`, info.messageId)
    return {
      success: true,
      messageId: info.messageId,
      to: sellerEmail,
      subject: mailOptions.subject
    }
  } catch (err) {
    console.error("❌ Error sending review notification email:", err)
    throw err
  }
}