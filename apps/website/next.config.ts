import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: '/api/images/**',
      },
      {
        pathname: '/api/team-images/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cms.tc-waiblingen.de',
        port: '',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.appack.de',
        port: '',
        pathname: '/tc-waiblingen/images/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/assets/favicons/favicon.ico',
      },
      {
        source: '/apple-touch-icon.png',
        destination: '/assets/favicons/apple-touch-icon.png',
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/assets/favicons/apple-touch-icon.png',
      },
      {
        source: '/feed',
        destination: '/api/rss/news',
      },
      {
        source: '/feed/',
        destination: '/api/rss/news',
      },
    ]
  },
  async headers() {
    return [
      {
        // HTML pages - 15 minute browser cache, 30 minute proxy cache
        source: '/((?!api|_next|favicon.ico|.*\\..*).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' https://cdn.appack.de data:; connect-src 'self' https://cms.tc-waiblingen.de; frame-ancestors 'self' https://cms.tc-waiblingen.de; frame-src https://shorturl.appack.de https://application.appack.de https://ebusy.tc-waiblingen.de; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
