const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // No manual user seeding - users are created dynamically via OAuth
  console.log('✅ Database ready for dynamic user registration via OAuth')
  console.log('👤 Users will be created when they first sign in with Google')
  console.log('🎯 Role assignment happens through frontend selection')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })