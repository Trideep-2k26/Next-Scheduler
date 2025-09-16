import { useState } from 'react'
import Layout from '../components/Layout'

export default function CleanupPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCleanup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cleanup-sellers', {
        method: 'DELETE'
      })
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Database Cleanup - Next Scheduler">
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="container-narrow">
          <div className="card">
            <h1 className="text-responsive-2xl font-bold mb-4 sm:mb-6 text-center">Database Cleanup</h1>
            <div className="text-center mb-6">
              <button
                onClick={handleCleanup}
                disabled={loading}
                className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cleaning...' : 'Remove Dummy Sellers'}
              </button>
            </div>
            
            {result && (
              <div className="mt-6">
                <h3 className="text-responsive-base font-medium mb-3 text-gray-900">Result:</h3>
                <pre className="bg-gray-100 p-3 sm:p-4 rounded-xl overflow-auto text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-anywhere">
                  {result}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
