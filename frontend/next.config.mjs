/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://backend-env.eba-83mgr7vm.ap-southeast-2.elasticbeanstalk.com/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
