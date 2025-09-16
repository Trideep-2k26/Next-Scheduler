import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ message: 'Appointment ID is required' })
  }

  if (req.method === 'DELETE') {
    try {
      
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          seller: { select: { id: true, name: true, email: true } },
          buyer: { select: { id: true, name: true, email: true } }
        }
      })

      if (!existingAppointment) {
        return res.status(404).json({ message: 'Appointment not found' })
      }

      
      const isOwner = existingAppointment.buyerId === session.user.id || existingAppointment.sellerId === session.user.id
      if (!isOwner) {
        return res.status(403).json({ message: 'You are not authorized to delete this appointment' })
      }

      
      const now = new Date()
      const appointmentStart = new Date(existingAppointment.start)
      
      if (appointmentStart > now) {
        return res.status(400).json({ 
          message: 'Cannot delete upcoming appointments. Please cancel instead.' 
        })
      }

      
      await prisma.appointment.delete({
        where: { id }
      })

      res.status(200).json({ 
        message: 'Appointment deleted successfully',
        deletedAppointment: {
          id: existingAppointment.id,
          title: existingAppointment.title,
          start: existingAppointment.start
        }
      })

    } catch (error) {
      console.error('Error deleting appointment:', error)
      res.status(500).json({ message: 'Failed to delete appointment' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}