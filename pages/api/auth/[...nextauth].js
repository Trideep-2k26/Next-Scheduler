import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import prisma from '../../../lib/prisma'
import { encryptToken } from '../../../lib/encryption'

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent'
        }
      },
      httpOptions: {
        timeout: 10000, // 10 second timeout instead of default 3.5s
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            // Create new user with NULL role - role will be set after role selection
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                role: null, // No role assigned initially
                accounts: {
                  create: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    scope: account.scope,
                    expires_at: account.expires_at,
                    id_token: account.id_token
                  }
                }
              }
            })
            user.id = newUser.id
            user.role = newUser.role
          } else {
            user.id = existingUser.id
            user.role = existingUser.role
            
            // Update or create account for existing user
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              },
              update: {
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                scope: account.scope,
                expires_at: account.expires_at,
                id_token: account.id_token
              },
              create: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                scope: account.scope,
                expires_at: account.expires_at,
                id_token: account.id_token
              }
            })
          }

          // Store encrypted refresh token
          if (account?.refresh_token) {
            try {
              const encryptedToken = encryptToken(account.refresh_token)
              await prisma.user.update({
                where: { id: user.id },
                data: { refreshTokenEncrypted: encryptedToken }
              })
            } catch (error) {
              console.error('Error storing refresh token:', error)
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      
      // Always fetch the latest role from database to ensure session is up-to-date
      if (token.id) {
        try {
          const userFromDb = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true }
          })
          if (userFromDb) {
            token.role = userFromDb.role
          }
        } catch (error) {
          console.error('Error fetching user role for JWT:', error)
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    },
    
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called with:', { url, baseUrl })
      
      // Always redirect to home page after OAuth - role logic will be handled there
      if (url.startsWith(baseUrl)) {
        return baseUrl
      }
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata)
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

export default NextAuth(authOptions)
export { authOptions }
