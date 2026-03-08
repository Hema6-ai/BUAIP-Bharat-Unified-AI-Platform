/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API routes require a server runtime; static export breaks route handlers.
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Keep pdf-parse and pdfjs-dist out of the webpack bundle — they crash the
  // RSC bundler due to ESM/CJS incompatibilities in pdfjs-dist.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
}

module.exports = nextConfig
