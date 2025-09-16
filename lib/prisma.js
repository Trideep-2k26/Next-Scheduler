import { PrismaClient } from '@prisma/client'

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    errorFormat: 'pretty',
    log: ['error']
  })
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      errorFormat: 'pretty',
      log: ['query', 'error', 'warn']
    })
  }
  prisma = global.prisma
}

export default prisma
