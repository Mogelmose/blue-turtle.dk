/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    proxyClientMaxBodySize: '60mb',
  },
  images: {
    localPatterns: [
      { pathname: '/api/**' },
      { pathname: '/static/**' },
    ],
  },
};

export default nextConfig;
