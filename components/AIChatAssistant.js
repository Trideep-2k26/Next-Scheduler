import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function AIChatAssistant({ isOpen, onClose }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your AI scheduling assistant. Tell me when you're available and what type of service you need, and I'll find matching sellers for you.",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Build conversation history (last 6 messages for context)
      const conversationHistory = messages.slice(-6).map(msg => ({
        type: msg.type === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }))

      const response = await axios.post('/api/ai/query', {
        query: inputValue.trim(),
        conversationHistory
      })

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: generateAIResponseContent(response.data),
        timestamp: new Date(),
        data: response.data
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI Query Error:', error)
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: error.response?.data?.message || "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
        isError: true,
        suggestions: error.response?.data?.suggestions
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: "Hi! I'm your AI scheduling assistant. Tell me when you're available and what type of service you need, and I'll find matching sellers for you.",
        timestamp: new Date()
      }
    ])
  }

  const formatMessage = (content) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold** to <strong>
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic* to <em>
      .replace(/`(.*?)`/g, '<code>$1</code>') // `code` to <code>
      .replace(/\n/g, '<br>') // line breaks
  }

  const generateAIResponseContent = (data) => {
    // Handle different response types
    if (data.type === 'greeting') {
      return data.message
    }
    
    if (data.type === 'help') {
      return data.message
    }
    
    if (data.type === 'redirect') {
      return data.message
    }
    
    if (data.type === 'goodbye') {
      return data.message
    }
    
    
    if (data.type === 'no_availability') {
      return data.message
    }
    
    
    if (data.totalFound === 0) {
      return `I couldn't find any available sellers for ${data.searchParams?.serviceType || 'appointments'} on ${data.searchParams?.dayName} at ${data.searchParams?.timeRange}. Would you like to try a different time or day?`
    }

    let response = `Great! I found ${data.totalFound} available ${data.searchParams?.serviceType?.toLowerCase() || 'seller'}${data.totalFound > 1 ? 's' : ''} for ${data.searchParams?.dayName} at ${data.searchParams?.timeRange}.`
    
    if (data.filteredBy) {
      response += ` ${data.filteredBy}.`
    }
    
    response += ` Click on any seller below to book:`
    
    return response
  }

  const handleSellerClick = (sellerId) => {
    onClose()
    router.push(`/sellers/${sellerId}`)
  }

  const handleTryManualBooking = () => {
    onClose()
    router.push('/sellers')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Chat Panel - Mobile: Full screen, Desktop: Right sidebar */}
      <div className="absolute inset-0 md:right-0 md:top-0 md:h-full md:w-full md:max-w-md md:inset-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 text-white">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white bg-opacity-20">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">AI Assistant</h3>
              <p className="text-xs opacity-80">Find your perfect appointment</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-70 transition-colors touch-manipulation"
              title="Clear chat"
            >
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-70 transition-colors touch-manipulation"
              title="Close chat"
            >
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 ${
                    message.type === 'user' 
                      ? 'bg-primary text-white' 
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div 
                      className="text-sm whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Seller Cards */}
                {message.data?.sellers && message.data.sellers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.data.sellers.map((seller) => (
                      <div 
                        key={seller.id}
                        onClick={() => handleSellerClick(seller.id)}
                        className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 touch-manipulation"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={seller.image || '/default-avatar.png'}
                            alt={seller.name}
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{seller.name}</h4>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              {seller.serviceType || 'General Services'}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-primary font-medium">
                                {seller.nextAvailableSlot}
                              </span>
                              {seller.hourlyRate && (
                                <span className="text-xs text-gray-500">
                                  ${seller.hourlyRate}/hr
                                </span>
                              )}
                            </div>
                          </div>
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    
                    {/* Manual booking fallback */}
                    <button
                      onClick={handleTryManualBooking}
                      className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg sm:rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors touch-manipulation"
                    >
                      Browse all sellers manually
                    </button>
                  </div>
                )}

                {/* Suggestion buttons */}
                {(message.data?.suggestions || message.suggestions) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(message.data?.suggestions || message.suggestions).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputValue(suggestion)}
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors touch-manipulation"
                        disabled={isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 max-w-[85%] sm:max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input - Sticky at bottom */}
          <div className="border-t bg-white p-3 sm:p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., I need a consultation next Monday at 2 PM"
                className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 sm:py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="flex h-10 w-10 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>

            {/* Quick suggestions */}
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "How to book an appointment?",
                "Contact support info",
                "Tomorrow morning consultation",
                "What services are available?"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputValue(suggestion)}
                  className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors touch-manipulation"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mobile-friendly floating AI button component
export function AIFloatingButton({ onClick }) {
  const { data: session } = useSession()
  
  if (!session || session.user.role !== 'buyer') {
    return null
  }

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 touch-manipulation"
      aria-label="Open AI Assistant"
    >
      <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </button>
  )
}