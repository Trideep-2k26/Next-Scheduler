import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import AIChatAssistant, { AIFloatingButton } from './AIChatAssistant'
import ProfileImage from './ProfileImage'

export default function Layout({ children, title = 'Next Scheduler' }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActivePage = (href) => {
    if (href === '/' && router.pathname === '/') return true
    if (href !== '/' && router.pathname.startsWith(href)) return true
    return false
  }

  
  const getNavLinkClass = (href, isMobile = false) => {
    const baseClass = isMobile 
      ? "block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left" 
      : "px-3 py-2 rounded-md text-sm font-medium transition-colors"
    const isActive = isActivePage(href)
    
    if (isActive) {
      return `${baseClass} text-primary-600 font-semibold ${isMobile ? 'bg-primary-50' : ''}` 
    }
    return `${baseClass} text-gray-700 hover:text-primary-600 hover:bg-gray-100`
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Schedule meetings with Google Calendar integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 transition-colors duration-300">
        <nav className="bg-white shadow-sm border-b border-gray-200 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900 transition-colors duration-200">
                  <span className="hidden sm:inline">Next Scheduler</span>
                  <span className="sm:hidden">NS</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                {status === 'loading' ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                ) : session ? (
                  <>
                    {session.user.role === 'seller' ? (
                      
                      <Link
                        href="/dashboard/seller"
                        className={getNavLinkClass('/dashboard/seller')}
                      >
                        Dashboard
                      </Link>
                    ) : (
                      
                      <>
                        <Link
                          href="/buyer"
                          className={getNavLinkClass('/buyer')}
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/sellers"
                          className={getNavLinkClass('/sellers')}
                        >
                          Find Sellers
                        </Link>
                        <Link
                          href="/appointments"
                          className={getNavLinkClass('/appointments')}
                        >
                          My Appointments
                        </Link>
                        {/* AI Assistant Button in Navigation */}
                        <button
                          onClick={() => setIsAIAssistantOpen(true)}
                          className="flex items-center space-x-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-2 rounded-full text-sm font-medium hover:shadow-md hover:glow transition-all duration-200 transform hover:scale-105 group"
                          title="Ask AI Assistant"
                        >
                          <svg className="h-4 w-4 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Ask AI</span>
                        </button>
                      </>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <ProfileImage
                        src={session.user.image}
                        alt={session.user.name}
                        name={session.user.name}
                        size="w-8 h-8"
                      />
                      <span className="text-sm text-gray-700 hidden lg:inline">{session.user.name}</span>
                      <button
                        onClick={() => signOut()}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link
                      href="/login"
                      className="btn-primary"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center space-x-2">
                {session && (
                  <ProfileImage
                    src={session.user.image}
                    alt={session.user.name}
                    name={session.user.name}
                    size="w-8 h-8"
                  />
                )}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-200 transform hover:scale-110 group"
                  aria-expanded={isMobileMenuOpen}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-gray-200 bg-white transition-all duration-300 animate-slideDown">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {status === 'loading' ? (
                    <div className="flex justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                    </div>
                  ) : session ? (
                    <>
                      <div className="px-3 py-2 text-base font-medium text-gray-900 border-b border-gray-200 mb-2">
                        {session.user.name}
                      </div>
                      {session.user.role === 'seller' ? (
                        // Seller Mobile Navigation
                        <Link
                          href="/dashboard/seller"
                          className={getNavLinkClass('/dashboard/seller', true)}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                      ) : (
                        // Buyer Mobile Navigation
                        <>
                          <Link
                            href="/buyer"
                            className={getNavLinkClass('/buyer', true)}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <Link
                            href="/sellers"
                            className={getNavLinkClass('/sellers', true)}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Find Sellers
                          </Link>
                          <Link
                            href="/appointments"
                            className={getNavLinkClass('/appointments', true)}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            My Appointments
                          </Link>
                          <button
                            onClick={() => {
                              setIsAIAssistantOpen(true)
                              setIsMobileMenuOpen(false)
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-left text-base font-medium text-white bg-gradient-to-r from-primary to-primary-dark rounded-md hover:shadow-md transition-all duration-200"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Ask AI Assistant</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => signOut()}
                        className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md border-t border-gray-200 mt-2 transition-colors duration-200"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="btn-primary block w-full text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        <main className="content-container">
          {children}
        </main>

        {/* AI Chat Assistant */}
        <AIChatAssistant 
          isOpen={isAIAssistantOpen} 
          onClose={() => setIsAIAssistantOpen(false)} 
        />

        {/* Floating AI Button for Mobile */}
        <AIFloatingButton onClick={() => setIsAIAssistantOpen(true)} />
      </div>
    </>
  )
}
