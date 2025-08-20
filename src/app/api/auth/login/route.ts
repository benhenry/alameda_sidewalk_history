import { NextRequest, NextResponse } from 'next/server'
import { userQueries } from '@/lib/database'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = userQueries.getByEmail.get(email.toLowerCase())
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    userQueries.updateLastLogin.run(user.id)

    // Generate token
    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as 'admin' | 'user'
    }

    const token = generateToken(authUser)

    return NextResponse.json({
      user: authUser,
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}