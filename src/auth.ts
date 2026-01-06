import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"

// Create PostgreSQL connection pool for Auth.js
// Support both DATABASE_URL (development) and individual PG* variables (production)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',  // Redirect to home page for sign-in (modal-based)
    error: '/',   // Redirect to home page on error
  },
  callbacks: {
    async session({ session, user }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = user.id
        session.user.role = (user as any).role || 'user'
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Auto-link accounts by email if user exists
      if (!user.email) return false

      try {
        // Check if user with this email already exists
        const existingUser = await pool.query(
          'SELECT id, role FROM users WHERE email = $1',
          [user.email]
        )

        if (existingUser.rows.length > 0) {
          // User exists - the adapter will link the account
          console.log(`Linking ${account?.provider} account to existing user:`, user.email)
        } else {
          // New user - will be created by adapter
          console.log(`Creating new user from ${account?.provider}:`, user.email)
        }

        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
})
