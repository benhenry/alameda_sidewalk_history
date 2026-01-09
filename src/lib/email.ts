/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

/**
 * Email service for sending transactional emails
 * Supports multiple providers: SendGrid (recommended for GCP), Gmail API, and SMTP
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>
}

// SendGrid implementation (recommended for Google Cloud)
class SendGridProvider implements EmailProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    const sgMail = await import('@sendgrid/mail')
    sgMail.default.setApiKey(this.apiKey)

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@alameda-sidewalks.com',
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
    }

    await sgMail.default.send(msg)
  }
}

// Gmail API implementation (free but more complex setup)
class GmailProvider implements EmailProvider {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private fromEmail: string

  constructor(clientId: string, clientSecret: string, refreshToken: string, fromEmail: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.refreshToken = refreshToken
    this.fromEmail = fromEmail
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    const { google } = await import('googleapis')
    
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      'https://developers.google.com/oauthplayground'
    )

    oauth2Client.setCredentials({
      refresh_token: this.refreshToken
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const emailContent = [
      `To: ${to}`,
      `From: ${this.fromEmail}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      html
    ].join('\n')

    const base64Email = Buffer.from(emailContent).toString('base64url')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64Email
      }
    })
  }
}

// Generic SMTP implementation (fallback)
class SMTPProvider implements EmailProvider {
  private config: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  private fromEmail: string

  constructor(config: any, fromEmail: string) {
    this.config = config
    this.fromEmail = fromEmail
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.default.createTransport(this.config)

    await transporter.sendMail({
      from: this.fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    })
  }
}

// Email service factory
function createEmailProvider(): EmailProvider {
  // Try SendGrid first (recommended for GCP)
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Using SendGrid email provider')
    return new SendGridProvider(process.env.SENDGRID_API_KEY)
  }

  // Try Gmail API
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && 
      process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_FROM_EMAIL) {
    console.log('📧 Using Gmail API email provider')
    return new GmailProvider(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REFRESH_TOKEN,
      process.env.GMAIL_FROM_EMAIL
    )
  }

  // Try generic SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Using SMTP email provider')
    return new SMTPProvider({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }, process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER)
  }

  throw new Error('No email provider configured. Please set up SendGrid, Gmail API, or SMTP credentials.')
}

// Main email service
class EmailService {
  private provider: EmailProvider

  constructor() {
    this.provider = createEmailProvider()
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const subject = 'Reset Your Alameda Sidewalk Map Password'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563EB; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #2563EB; color: white; padding: 12px 24px; 
                     text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Alameda Sidewalk Map</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password for your Alameda Sidewalk Map account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
            </div>
            <div class="footer">
              <p>© 2025 Alameda Sidewalk Map</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Alameda Sidewalk Map - Password Reset Request

Hello,

We received a request to reset your password for your Alameda Sidewalk Map account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.

© 2025 Alameda Sidewalk Map
This is an automated message, please do not reply to this email.
    `

    await this.provider.sendEmail({
      to: email,
      subject,
      html,
      text
    })
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const subject = 'Welcome to Alameda Sidewalk Map!'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563EB; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Alameda Sidewalk Map!</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${username}!</h2>
              <p>Thank you for joining the Alameda Sidewalk Map community!</p>
              <p>You can now contribute to mapping historic sidewalk contractors and installation years throughout Alameda, CA.</p>
              <p>What you can do:</p>
              <ul>
                <li>Add new sidewalk segments with contractor and year information</li>
                <li>Upload photos of contractor markings</li>
                <li>Explore the interactive map to discover sidewalk history</li>
                <li>Help preserve Alameda's infrastructure heritage</li>
              </ul>
              <p>Happy mapping!</p>
            </div>
            <div class="footer">
              <p>© 2025 Alameda Sidewalk Map</p>
            </div>
          </div>
        </body>
      </html>
    `

    await this.provider.sendEmail({
      to: email,
      subject,
      html
    })
  }

  // Test email sending
  async sendTestEmail(email: string): Promise<void> {
    await this.provider.sendEmail({
      to: email,
      subject: 'Alameda Sidewalk Map - Email Test',
      html: '<h1>Email Service Working!</h1><p>This is a test email from your Alameda Sidewalk Map application.</p>'
    })
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export individual functions for convenience
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  return emailService.sendPasswordResetEmail(email, resetUrl)
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  return emailService.sendWelcomeEmail(email, username)
}

export async function sendTestEmail(email: string): Promise<void> {
  return emailService.sendTestEmail(email)
}