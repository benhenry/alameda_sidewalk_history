import { NextResponse } from 'next/server'
import { getUserByEmail, createPasswordResetToken } from '@/lib/database'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

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
    const user = await getUserByEmail(email)
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    // Generate reset token (URL-safe)
    const resetToken = randomBytes(32).toString('base64url')
    
    // Token expires in 1 hour
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Save reset token to database
    await createPasswordResetToken(user.id, resetToken, expiresAt)

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    
    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetUrl)
      console.log(`✅ Password reset email sent to ${email}`)
    } catch (emailError) {
      console.error(`❌ Failed to send password reset email to ${email}:`, emailError)
      // Log the URL as fallback for development/debugging
      console.log(`Password reset URL for ${email}: ${resetUrl}`)
      
      // In production, you might want to return an error here
      // For now, we'll continue to prevent user enumeration
    }

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