/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

/**
 * Email service tests
 * Tests the email service functionality with mocked providers
 */

import { sendPasswordResetEmail, sendWelcomeEmail, sendTestEmail } from '@/lib/email'

// Mock email providers
jest.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{}])
  }
}))

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      }))
    },
    gmail: jest.fn().mockReturnValue({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({ data: {} })
        }
      }
    })
  }
}))

jest.mock('nodemailer', () => ({
  default: {
    createTransporter: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    })
  }
}))

describe('Email Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('SendGrid Provider', () => {
    beforeEach(() => {
      process.env.SENDGRID_API_KEY = 'test-sendgrid-key'
      process.env.SENDGRID_FROM_EMAIL = 'test@example.com'
    })

    it('should send password reset email via SendGrid', async () => {
      const sgMail = require('@sendgrid/mail')
      
      await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc123')

      expect(sgMail.default.setApiKey).toHaveBeenCalledWith('test-sendgrid-key')
      expect(sgMail.default.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'test@example.com',
          subject: 'Reset Your Alameda Sidewalk Map Password',
          html: expect.stringContaining('https://example.com/reset?token=abc123'),
          text: expect.stringContaining('https://example.com/reset?token=abc123')
        })
      )
    })

    it('should send welcome email via SendGrid', async () => {
      const sgMail = require('@sendgrid/mail')
      
      await sendWelcomeEmail('newuser@example.com', 'testuser')

      expect(sgMail.default.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: 'Welcome to Alameda Sidewalk Map!',
          html: expect.stringContaining('testuser')
        })
      )
    })

    it('should send test email via SendGrid', async () => {
      const sgMail = require('@sendgrid/mail')
      
      await sendTestEmail('admin@example.com')

      expect(sgMail.default.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: 'Alameda Sidewalk Map - Email Test',
          html: expect.stringContaining('Email Service Working!')
        })
      )
    })
  })

  describe('Gmail Provider', () => {
    beforeEach(() => {
      // Clear SendGrid env to force Gmail provider
      delete process.env.SENDGRID_API_KEY
      process.env.GMAIL_CLIENT_ID = 'test-client-id'
      process.env.GMAIL_CLIENT_SECRET = 'test-client-secret'
      process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token'
      process.env.GMAIL_FROM_EMAIL = 'test@gmail.com'
    })

    it('should send password reset email via Gmail', async () => {
      const { google } = require('googleapis')
      const mockGmail = {
        users: {
          messages: {
            send: jest.fn().mockResolvedValue({ data: {} })
          }
        }
      }
      google.gmail.mockReturnValue(mockGmail)

      await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc123')

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'https://developers.google.com/oauthplayground'
      )
      expect(mockGmail.users.messages.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          requestBody: {
            raw: expect.any(String)
          }
        })
      )
    })
  })

  describe('SMTP Provider', () => {
    beforeEach(() => {
      // Clear other providers to force SMTP
      delete process.env.SENDGRID_API_KEY
      delete process.env.GMAIL_CLIENT_ID
      process.env.SMTP_HOST = 'smtp.example.com'
      process.env.SMTP_USER = 'test@example.com'
      process.env.SMTP_PASS = 'test-password'
      process.env.SMTP_FROM_EMAIL = 'test@example.com'
    })

    it('should send password reset email via SMTP', async () => {
      const nodemailer = require('nodemailer')
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      }
      nodemailer.default.createTransporter.mockReturnValue(mockTransporter)

      await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc123')

      expect(nodemailer.default.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      })
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Reset Your Alameda Sidewalk Map Password'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw error when no email provider is configured', async () => {
      // Clear all email provider environment variables
      delete process.env.SENDGRID_API_KEY
      delete process.env.GMAIL_CLIENT_ID
      delete process.env.SMTP_HOST

      await expect(sendPasswordResetEmail('user@example.com', 'https://example.com/reset'))
        .rejects
        .toThrow('No email provider configured')
    })

    it('should handle SendGrid send failures gracefully', async () => {
      process.env.SENDGRID_API_KEY = 'test-key'
      const sgMail = require('@sendgrid/mail')
      sgMail.default.send.mockRejectedValue(new Error('SendGrid API error'))

      await expect(sendPasswordResetEmail('user@example.com', 'https://example.com/reset'))
        .rejects
        .toThrow('SendGrid API error')
    })
  })
})

describe('Email Templates', () => {
  beforeEach(() => {
    process.env.SENDGRID_API_KEY = 'test-key'
    process.env.SENDGRID_FROM_EMAIL = 'test@example.com'
  })

  it('should generate proper password reset email content', async () => {
    const sgMail = require('@sendgrid/mail')
    const resetUrl = 'https://example.com/reset?token=abc123'
    
    await sendPasswordResetEmail('user@example.com', resetUrl)

    const sentEmail = sgMail.default.send.mock.calls[0][0]
    
    expect(sentEmail.html).toContain('Password Reset Request')
    expect(sentEmail.html).toContain(resetUrl)
    expect(sentEmail.html).toContain('Reset My Password')
    expect(sentEmail.html).toContain('This link will expire in 1 hour')
    expect(sentEmail.text).toContain(resetUrl)
  })

  it('should generate proper welcome email content', async () => {
    const sgMail = require('@sendgrid/mail')
    
    await sendWelcomeEmail('newuser@example.com', 'johndoe')

    const sentEmail = sgMail.default.send.mock.calls[0][0]
    
    expect(sentEmail.html).toContain('Welcome, johndoe!')
    expect(sentEmail.html).toContain('Alameda Sidewalk Map')
    expect(sentEmail.html).toContain('Add new sidewalk segments')
    expect(sentEmail.html).toContain('Upload photos')
  })

  it('should generate proper test email content', async () => {
    const sgMail = require('@sendgrid/mail')
    
    await sendTestEmail('admin@example.com')

    const sentEmail = sgMail.default.send.mock.calls[0][0]
    
    expect(sentEmail.html).toContain('Email Service Working!')
    expect(sentEmail.html).toContain('test email')
    expect(sentEmail.subject).toBe('Alameda Sidewalk Map - Email Test')
  })
})