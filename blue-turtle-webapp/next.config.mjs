/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    proxyClientMaxBodySize: '60mb',
  },
};

export default nextConfig;
