import { useRouter } from 'next/router'
import { useState } from 'react'
import Layout from '../../components/Layout'

export default function ContactSupport() {
  const router = useRouter()
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <Layout title="Contact Support - Next Scheduler">
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="container-narrow">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Contact Support
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Need help? We're here to assist you with any questions or issues
            </p>
          </div>

          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="flex items-center text-red-600 hover:text-red-700 transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm sm:text-base">Back to Dashboard</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="grid-responsive-2col">
            {/* Contact Information */}
            <div className="card">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Our support team is ready to help you with any questions or concerns
                </p>
              </div>

              {/* Email Contact */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl space-y-3 sm:space-y-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Email Support</h3>
                      <p className="text-blue-600 font-medium text-sm sm:text-base break-anywhere">makaltrideep@gmail.com</p>
                      <p className="text-xs sm:text-sm text-gray-600">We respond within 24 hours</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard('makaltrideep@gmail.com', 'email')}
                    className="btn-primary w-full sm:w-auto sm:px-4 sm:py-2"
                  >
                    {copied === 'email' ? (
                      <span className="flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>

              {/* Phone Contact */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl space-y-3 sm:space-y-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Phone Support</h3>
                      <p className="text-green-600 font-medium text-sm sm:text-base">+91 9330661315</p>
                      <p className="text-xs sm:text-sm text-gray-600">Mon-Fri, 9 AM - 6 PM IST</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard('+91 9330661315', 'phone')}
                    className="btn-primary w-full sm:w-auto sm:px-4 sm:py-2"
                  >
                    {copied === 'phone' ? (
                      <span className="flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 sm:space-y-4">
                <a
                  href="mailto:makaltrideep@gmail.com?subject=Support Request - Next Scheduler"
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center touch-manipulation text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  Send Email
                </a>
                <a
                  href="tel:+919330661315"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center touch-manipulation text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Now
                </a>
              </div>
            </div>

            {/* Support Topics */}
            <div className="card">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Common Support Topics</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Account & Login Issues</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Problems with signing in, account verification, or profile updates</p>
                </div>
                <div className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Booking & Scheduling</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Help with making appointments, cancellations, or rescheduling</p>
                </div>
                <div className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Payment & Billing</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Questions about charges, refunds, or payment methods</p>
                </div>
                <div className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Technical Issues</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Website problems, calendar sync issues, or Google Meet troubles</p>
                </div>
                <div className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Seller Services</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Questions about seller profiles, reviews, or service quality</p>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-yellow-50 rounded-xl">
                <div className="flex items-start">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-yellow-800 mb-1 text-sm sm:text-base">Before contacting support</h3>
                    <p className="text-yellow-700 text-xs sm:text-sm">
                      Please check our FAQ page for quick answers to common questions. It might save you time!
                    </p>
                    <button
                      onClick={() => router.push('/help/faq')}
                      className="text-yellow-800 hover:text-yellow-900 font-medium text-xs sm:text-sm underline mt-1 sm:mt-2 touch-manipulation"
                    >
                      View FAQ →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 sm:mt-12 text-center">
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="btn-primary px-6 sm:px-8"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}