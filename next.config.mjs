/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // This line tells Next.js to ignore the 'canvas' package during the server-side build,
    // which is a required step for `react-pdf` to work correctly in a Next.js environment.
    config.externals.push('canvas');
    return config;
  },
};

export default nextConfig;
