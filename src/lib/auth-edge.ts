import { AuthUser } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Edge Runtime compatible JWT verification
export async function verifyTokenEdge(token: string): Promise<AuthUser | null> {
  try {
    // Split the JWT into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerB64, payloadB64, signatureB64] = parts

    // Decode header and payload
    const header = JSON.parse(atob(headerB64))
    const payload = JSON.parse(atob(payloadB64))

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const secretKey = encoder.encode(JWT_SECRET)

    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode the signature
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      data
    )

    if (!isValid) {
      return null
    }

    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      role: payload.role
    }
  } catch (error) {
    return null
  }
}