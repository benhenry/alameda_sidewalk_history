import { NextResponse } from 'next/server'
import { userQueries, passwordResetQueries } from '@/lib/database'
import { randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = userQueries.getByEmail.get(email)
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    // Clean up any existing reset tokens for this user
    passwordResetQueries.deleteByUserId.run(user.id)

    // Generate reset token (URL-safe)
    const resetToken = randomBytes(32).toString('base64url')
    const tokenId = uuidv4()
    
    // Token expires in 1 hour
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Save reset token to database
    passwordResetQueries.create.run(
      tokenId,
      user.id,
      resetToken,
      expiresAt.toISOString()
    )

    // In a production app, you would send an email here
    // For this demo, we'll log the reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    console.log(`Password reset URL for ${email}: ${resetUrl}`)

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(email, resetUrl)

    return NextResponse.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}