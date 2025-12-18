#!/usr/bin/env node

/**
 * Create a local admin user for development
 * Usage: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs')
const { Pool } = require('pg')
const { randomUUID } = require('crypto')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/sidewalks_dev'
})

async function createAdminUser() {
  const email = 'admin@localhost.dev'
  const username = 'admin'
  const password = 'admin123' // Change this to something more secure if needed

  console.log('🔧 Creating local admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Username: ${username}`)
  console.log(`   Password: ${password}`)
  console.log('')

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, username, role FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists:')
      console.log(`   ID: ${existingUser.rows[0].id}`)
      console.log(`   Email: ${existingUser.rows[0].email}`)
      console.log(`   Username: ${existingUser.rows[0].username}`)
      console.log(`   Role: ${existingUser.rows[0].role}`)
      console.log('')

      // Update to admin if not already
      if (existingUser.rows[0].role !== 'admin') {
        console.log('📝 Updating user to admin role...')
        await pool.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['admin', existingUser.rows[0].id]
        )
        console.log('✅ User updated to admin!')
      } else {
        console.log('✅ User is already an admin!')
      }

      await pool.end()
      return
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10)

    // Create the admin user
    const result = await pool.query(
      `INSERT INTO users (id, email, username, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, email, username, role, created_at`,
      [randomUUID(), email, username, password_hash, 'admin']
    )

    console.log('✅ Admin user created successfully!')
    console.log('')
    console.log('📋 User Details:')
    console.log(`   ID: ${result.rows[0].id}`)
    console.log(`   Email: ${result.rows[0].email}`)
    console.log(`   Username: ${result.rows[0].username}`)
    console.log(`   Role: ${result.rows[0].role}`)
    console.log(`   Created: ${result.rows[0].created_at}`)
    console.log('')
    console.log('🔐 Login Credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('')
    console.log('🌐 You can now log in at: http://localhost:3000')

    await pool.end()
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    console.error(error)
    process.exit(1)
  }
}

createAdminUser()
