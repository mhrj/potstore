import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

// Ensure .next/cache/images directory exists on startup/build to avoid ENOENT on containerized/PaaS deployments
try {
  const baseCache = path.join(process.cwd(), '.next', 'cache');
  if (fs.existsSync(baseCache)) {
    const stat = fs.lstatSync(baseCache);
    if (stat.isSymbolicLink()) {
      const target = path.resolve(path.dirname(baseCache), fs.readlinkSync(baseCache));
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
    }
  }
  const imagesDir = path.join(process.cwd(), '.next', 'cache', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
} catch {
  // If filesystem is read-only or restricted, continue gracefully
}

export function getCspHeader(isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://placehold.co https://res.cloudinary.com https://storage.iran.liara.ir https://*.storage.iran.liara.ir https://storage.iran.liara.site https://*.storage.iran.liara.site",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.zarinpal.com https://api.telegram.org https://eitaayar.ir",
    "frame-ancestors 'self'",
    "form-action 'self' https://*.zarinpal.com",
    "base-uri 'self'",
    "object-src 'none'",
  ];

  return directives
    .map((directive) => directive.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('; ');
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    localPatterns: [
      { pathname: '/**' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'storage.iran.liara.ir' },
      { protocol: 'https', hostname: '**.storage.iran.liara.ir' },
      { protocol: 'https', hostname: 'storage.iran.liara.site' },
      { protocol: 'https', hostname: '**.storage.iran.liara.site' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    optimizePackageImports: ['framer-motion'],
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const cspHeader = getCspHeader(isDev);

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/payment/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default config;
