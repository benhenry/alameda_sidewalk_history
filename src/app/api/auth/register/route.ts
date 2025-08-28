import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, getUserByUsername, createUser } from '@/lib/database'
import { hashPassword, isValidEmail, isValidPassword, isValidUsername, generateToken } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, confirmPassword } = body

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const usernameValidation = isValidUsername(username)
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.message },
        { status: 400 }
      )
    }

    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(email.toLowerCase())
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const existingUserByUsername = await getUserByUsername(username.toLowerCase())
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Create user
    const hashedPassword = await hashPassword(password)

    const newUser = await createUser({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'user'
    })

    // Generate token
    const user = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role as 'user'
    }

    const token = generateToken(user)

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(email, username)
      console.log(`✅ Welcome email sent to ${email}`)
    } catch (emailError) {
      console.error(`❌ Failed to send welcome email to ${email}:`, emailError)
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      user,
      token
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}