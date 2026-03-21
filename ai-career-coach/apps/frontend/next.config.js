/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // 3. General Settings
  reactStrictMode: true,
  // output: 'standalone',

  // 4. Optimize heavy package imports for faster dev compilation
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },

  async redirects() {
    return [
      {
        source: '/register',
        destination: '/auth/register',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/verify-email',
        destination: '/auth/verify-email',
        permanent: false,
      },
      {
        source: '/reset-password',
        destination: '/auth/reset-password',
        permanent: false,
      },
      {
        source: '/forgot-password',
        destination: '/auth/forgot-password',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;