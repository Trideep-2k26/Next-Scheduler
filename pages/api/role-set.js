import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { role } = req.body

  if (!role || !['seller', 'buyer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' })
  }

  try {
    console.log(`Setting role '${role}' for user ${session.user.email} (ID: ${session.user.id})`)
    
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role }
    })

    console.log(`Role updated successfully:`, updatedUser)

    // Return success with user data
    res.status(200).json({ 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      },
      message: `Role updated to '${role}' successfully` 
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}
