/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: process.platform === 'win32' && !process.env.VERCEL ? {
    workerThreads: true,
  } : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
