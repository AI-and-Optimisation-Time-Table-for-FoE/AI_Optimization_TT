/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://timetable-java-backend-env.eba-hvkktump.eu-north-1.elasticbeanstalk.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
