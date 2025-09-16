import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const secretKey = process.env.TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production!'


function getKey() {
  return crypto.createHash('sha256').update(secretKey).digest()
}

export function encryptToken(token) {
  if (!token) return null
  
  try {
    const iv = crypto.randomBytes(16)
    const key = getKey()
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Error encrypting token:', error)
    return null
  }
}

export function decryptToken(encryptedToken) {
  if (!encryptedToken) return null
  
  try {
    const parts = encryptedToken.split(':')
    
    
    if (parts.length === 2) {
      console.warn('Using deprecated encryption format, please re-authenticate')
      return null 
    }
    
    if (parts.length !== 3) {
      console.error('Invalid encrypted token format')
      return null
    }
    
    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = getKey()
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Error decrypting token:', error)
    return null
  }
}
