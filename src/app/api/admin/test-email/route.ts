/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendTestEmail } from '@/lib/email'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate using Auth.js session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Send test email
    await sendTestEmail(email)

    return NextResponse.json({
      message: `Test email sent to ${email}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test email error:', error)
    
    // Provide more detailed error info for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      error: 'Failed to send test email',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}