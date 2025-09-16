import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'
import { sendReviewNotificationEmail } from '../../lib/emailService'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'POST') {
    // Create a new review
    const { sellerId, rating, comment } = req.body

    if (!sellerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid review data' })
    }

    try {
      // Check if the reviewer has already reviewed this seller
      const existingReview = await prisma.review.findUnique({
        where: {
          sellerId_reviewerId: {
            sellerId: sellerId,
            reviewerId: session.user.id
          }
        }
      })

      if (existingReview) {
        // Update existing review
        const updatedReview = await prisma.review.update({
          where: {
            sellerId_reviewerId: {
              sellerId: sellerId,
              reviewerId: session.user.id
            }
          },
          data: {
            rating: rating,
            comment: comment || null
          },
          include: {
            reviewer: {
              select: {
                name: true,
                image: true
              }
            },
            seller: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })

        // Send email notification for updated review
        try {
          await sendReviewNotificationEmail(
            updatedReview.seller.email,
            updatedReview.seller.name || 'Seller',
            updatedReview.reviewer.name || 'Anonymous',
            rating,
            comment,
            true // isUpdate flag
          )
          console.log('✅ Review update notification email sent to seller')
        } catch (emailError) {
          console.error('❌ Failed to send review update notification email:', emailError)
          // Don't fail the review update if email fails
        }

        return res.status(200).json({
          message: 'Review updated successfully',
          review: updatedReview
        })
      } else {
        // Create new review
        const newReview = await prisma.review.create({
          data: {
            sellerId: sellerId,
            reviewerId: session.user.id,
            rating: rating,
            comment: comment || null
          },
          include: {
            reviewer: {
              select: {
                name: true,
                image: true
              }
            },
            seller: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })

        // Send email notification to seller
        try {
          await sendReviewNotificationEmail(
            newReview.seller.email,
            newReview.seller.name || 'Seller',
            newReview.reviewer.name || 'Anonymous',
            rating,
            comment
          )
          console.log('✅ Review notification email sent to seller')
        } catch (emailError) {
          console.error('❌ Failed to send review notification email:', emailError)
          // Don't fail the review creation if email fails
        }

        return res.status(201).json({
          message: 'Review created successfully',
          review: newReview
        })
      }
    } catch (error) {
      console.error('Error creating/updating review:', error)
      return res.status(500).json({ message: 'Failed to submit review' })
    }
  }

  if (req.method === 'GET') {
    // Get reviews for a seller
    const { sellerId } = req.query

    if (!sellerId) {
      return res.status(400).json({ message: 'Seller ID is required' })
    }

    try {
      // Get all reviews for the seller
      const reviews = await prisma.review.findMany({
        where: {
          sellerId: sellerId
        },
        include: {
          reviewer: {
            select: {
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Calculate average rating
      const totalRatings = reviews.length
      const averageRating = totalRatings > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings 
        : 0

      // Get rating distribution
      const ratingDistribution = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      }

      return res.status(200).json({
        reviews: reviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: totalRatings,
        ratingDistribution: ratingDistribution
      })
    } catch (error) {
      console.error('Error fetching reviews:', error)
      return res.status(500).json({ message: 'Failed to fetch reviews' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}