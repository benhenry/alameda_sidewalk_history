/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'storage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  
  // Configure for Google Cloud Run
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}