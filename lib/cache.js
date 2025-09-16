import NodeCache from "node-cache"
import crypto from "crypto"

// Initialize NodeCache with default settings
export const cache = new NodeCache({
  stdTTL: 60, // Default TTL = 60 seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Don't clone objects for better performance
  deleteOnExpire: true, // Auto delete expired keys
  enableLegacyCallbacks: false // Use promise-based API
})

// Slot locking cache with shorter TTL
export const slotCache = new NodeCache({
  stdTTL: 300, // 5 minutes for slot locks
  checkperiod: 60, // Check every minute
  useClones: false,
  deleteOnExpire: true
})

// AI cache with shorter TTL
export const aiCache = new NodeCache({
  stdTTL: 30, // 30 seconds for AI responses
  checkperiod: 60,
  useClones: false,
  deleteOnExpire: true
})

/**
 * Generic cached fetch function
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch fresh data
 * @param {number} ttl - Time to live in seconds (optional)
 * @param {NodeCache} cacheInstance - Cache instance to use (optional)
 * @returns {Promise<any>} Cached or fresh data
 */
export async function getCached(key, fetchFn, ttl = 60, cacheInstance = cache) {
  try {
    // Try to get from cache first
    const cachedValue = cacheInstance.get(key)
    if (cachedValue !== undefined) {
      console.log(`Cache HIT for key: ${key}`)
      return cachedValue
    }

    console.log(`Cache MISS for key: ${key}`)
    // Fetch fresh data
    const freshData = await fetchFn()
    
    // Store in cache
    cacheInstance.set(key, freshData, ttl)
    console.log(`Cache SET for key: ${key} with TTL: ${ttl}s`)
    
    return freshData
  } catch (error) {
    console.error(`Error in getCached for key: ${key}`, error)
    // If caching fails, still return fresh data
    return await fetchFn()
  }
}

/**
 * Hash a string to create a consistent cache key
 * @param {string} input - Input string to hash
 * @returns {string} MD5 hash of the input
 */
export function hashKey(input) {
  return crypto.createHash('md5').update(input).digest('hex')
}

/**
 * Invalidate cache keys by pattern
 * @param {string} pattern - Pattern to match keys (e.g., 'availability:*')
 * @param {NodeCache} cacheInstance - Cache instance to use (optional)
 */
export function invalidateByPattern(pattern, cacheInstance = cache) {
  const keys = cacheInstance.keys()
  const regex = new RegExp(pattern.replace('*', '.*'))
  
  const keysToDelete = keys.filter(key => regex.test(key))
  
  if (keysToDelete.length > 0) {
    cacheInstance.del(keysToDelete)
    console.log(`Invalidated ${keysToDelete.length} cache keys matching pattern: ${pattern}`)
  }
}

/**
 * Cache statistics for monitoring
 * @param {NodeCache} cacheInstance - Cache instance to get stats for
 * @returns {object} Cache statistics
 */
export function getCacheStats(cacheInstance = cache) {
  const stats = cacheInstance.getStats()
  return {
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize
  }
}


export function clearAllCaches() {
  cache.flushAll()
  slotCache.flushAll()
  aiCache.flushAll()
  console.log('All caches cleared')
}


cache.on('set', (key, value) => {
  console.log(`Cache SET: ${key}`)
})

cache.on('expired', (key, value) => {
  console.log(`Cache EXPIRED: ${key}`)
})

slotCache.on('expired', (key, value) => {
  console.log(`Slot lock EXPIRED: ${key}`)
})