import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import SellerCard from '../../components/SellerCard'

// Simple search icon since heroicons isn't installed
const MagnifyingGlassIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

export default function Sellers() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sellers, setSellers] = useState([])
  const [filteredSellers, setFilteredSellers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    fetchSellers()
  }, [session, status, router])

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        const filtered = sellers.filter(seller =>
          seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredSellers(filtered)
      } else {
        setFilteredSellers(sellers)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, sellers])

  const fetchSellers = async () => {
    try {
      const response = await fetch('/api/sellers')
      if (response.ok) {
        const data = await response.json()
        setSellers(data)
        setFilteredSellers(data)
      }
    } catch (error) {
      console.error('Error fetching sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Find Sellers - Next Scheduler">
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Find the Perfect Professional
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse available sellers and book appointments that sync directly with both calendars.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Results */}
          {filteredSellers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No sellers found' : 'No sellers available'}
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search terms or browse all available sellers.'
                  : 'Check back later for new professionals joining the platform.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-primary hover:text-primary-dark font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  {filteredSellers.length} seller{filteredSellers.length !== 1 ? 's' : ''} found
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Clear search
                  </button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSellers.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
