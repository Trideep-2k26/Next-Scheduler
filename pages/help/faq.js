import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function FAQ() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState(null)

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          id: 1,
          question: "How do I create an account?",
          answer: "Simply click on 'Sign In' and choose to sign in with your Google account. The system will automatically create your account and you can then select your role as either a buyer or seller."
        },
        {
          id: 2,
          question: "What's the difference between buyer and seller roles?",
          answer: "Buyers can browse and book appointments with sellers, while sellers can set their availability, manage their calendar, and offer services to buyers. You can only have one role per account."
        },
        {
          id: 3,
          question: "Can I change my role after creating an account?",
          answer: "Currently, roles cannot be changed after account creation. If you need to switch roles, please contact our support team for assistance."
        }
      ]
    },
    {
      category: "Booking Appointments",
      questions: [
        {
          id: 4,
          question: "How do I book an appointment?",
          answer: "Browse available sellers, select one that matches your needs, choose an available time slot from their calendar, fill in the meeting title, and confirm your booking. The appointment will be automatically added to both calendars."
        },
        {
          id: 5,
          question: "Can I cancel or reschedule an appointment?",
          answer: "Yes, you can cancel appointments from your dashboard. For rescheduling, you'll need to cancel the current appointment and book a new time slot. Please provide reasonable notice to sellers."
        },
        {
          id: 6,
          question: "What happens if a seller cancels my appointment?",
          answer: "If a seller cancels, you'll receive an immediate notification and the appointment will be removed from both calendars. You can then book with the same seller at a different time or choose another seller."
        },
        {
          id: 7,
          question: "How do I join my appointment meeting?",
          answer: "All appointments automatically generate Google Meet links. You can access the meeting link from your calendar invitation, the appointment details in your dashboard, or directly from Google Calendar."
        }
      ]
    },
    {
      category: "Payment & Pricing",
      questions: [
        {
          id: 8,
          question: "How much do appointments cost?",
          answer: "Each seller sets their own hourly rate, which is clearly displayed on their profile. You'll see the exact cost before confirming any booking. There are no hidden fees."
        },
        {
          id: 9,
          question: "When do I get charged for an appointment?",
          answer: "Currently, our platform is in beta and appointments are free to book. Payment processing will be implemented in a future update with advance notice to all users."
        },
        {
          id: 10,
          question: "What payment methods are accepted?",
          answer: "Payment functionality is coming soon. When implemented, we'll support major credit cards, PayPal, and other secure payment methods."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          id: 11,
          question: "Why won't the calendar sync with Google Calendar?",
          answer: "Ensure you're signed in with the same Google account and have granted calendar permissions. If issues persist, try signing out and back in, or check your Google account security settings."
        },
        {
          id: 12,
          question: "The Google Meet link isn't working. What should I do?",
          answer: "First, ensure you're signed into the same Google account used for booking. If the link still doesn't work, check the calendar invitation for an alternative link or contact the other party directly."
        },
        {
          id: 13,
          question: "I'm not receiving email notifications. How can I fix this?",
          answer: "Check your spam/junk folder and ensure notifications from our domain aren't blocked. Calendar invitations come directly from Google, so also check your Google account notification settings."
        },
        {
          id: 14,
          question: "The website is running slowly or not loading properly.",
          answer: "Try refreshing the page, clearing your browser cache, or trying a different browser. If problems persist, the issue might be on our end - please contact support."
        }
      ]
    },
    {
      category: "Account Management",
      questions: [
        {
          id: 15,
          question: "How do I update my profile information?",
          answer: "Navigate to your dashboard and look for profile or settings options. You can update your name, description, specialties, and other information. Changes are saved automatically."
        },
        {
          id: 16,
          question: "Can I delete my account?",
          answer: "Yes, account deletion is available. Please contact support as this action is permanent and will remove all your appointments, reviews, and data from our system."
        },
        {
          id: 17,
          question: "How do I change my password?",
          answer: "Since we use Google authentication, password changes are managed through your Google account settings. Update your Google account password to secure your Next Scheduler access."
        }
      ]
    },
    {
      category: "Reviews & Ratings",
      questions: [
        {
          id: 18,
          question: "How do I leave a review for a seller?",
          answer: "After completing an appointment, visit the seller's profile page and click 'Write Review'. You can rate from 1-5 stars and optionally leave a written comment about your experience."
        },
        {
          id: 19,
          question: "Can I edit or delete my review?",
          answer: "Currently, reviews cannot be edited or deleted once submitted. Please ensure your review is accurate before submitting. Contact support if there are exceptional circumstances."
        },
        {
          id: 20,
          question: "What if I receive an inappropriate review?",
          answer: "If you believe a review violates our community guidelines, please contact support immediately. We review all reports and take appropriate action against policy violations."
        }
      ]
    }
  ]

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  return (
    <Layout title="Frequently Asked Questions - Next Scheduler">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600">
              Find quick answers to common questions about Next Scheduler
            </p>
          </div>

          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>

          {/* Search Box */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search FAQs..."
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary-dark px-8 py-6">
                  <h2 className="text-2xl font-bold text-white">{category.category}</h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {category.questions.map((faq) => (
                      <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                            <svg
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                                openFaq === faq.id ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {openFaq === faq.id && (
                          <div className="px-6 py-4 bg-white border-t border-gray-200">
                            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Still need help section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Still Need Help?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Our support team is here to help you with any questions or issues you might have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/help/contact-support')}
                className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary-dark transition-colors"
              >
                Contact Support
              </button>
              <button
                onClick={() => router.push('/help/how-to-book')}
                className="bg-white text-primary border-2 border-primary px-8 py-3 rounded-full font-medium hover:bg-primary hover:text-white transition-colors"
              >
                Booking Guide
              </button>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-12 text-center">
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary-dark transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}